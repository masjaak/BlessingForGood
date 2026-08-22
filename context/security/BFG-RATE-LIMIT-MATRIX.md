# BFG RATE-LIMIT MATRIX

Status: `REMEDIATED_GREEN` for covered abuse-sensitive mutations; reviewed
2026-08-22. Values marked `PHASE_09_1_SECURITY_DEFAULT` are operational
defaults introduced by this assurance phase because the functional PRD did not
specify a number. Rate limiting is defense in depth and never replaces
authorization.

## Policy Semantics

| Operation                                   | Classification               | Key                               | Burst / window                   | Reason / failure UX                                                                |
| ------------------------------------------- | ---------------------------- | --------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `catalogAccess.unlock` anonymous            | GLOBAL LIMIT                 | operation/global component bucket | 300 / 15 minutes fixed window    | Brute-force and public abuse; `RATE_LIMITED`, safe retry-after                     |
| `catalogAccess.unlock` active member        | PER USER LIMIT plus global   | server-derived `appUser._id`      | 20 burst, 30 tokens / 15 minutes | Protect code guessing without blocking a normal retry; safe retry-after            |
| `joinRequests.submit` anonymous             | GLOBAL LIMIT                 | operation/global component bucket | 20 / 15 minutes fixed window     | Spam control for public pre-account boundary                                       |
| `joinRequests.submit` known active identity | PER USER LIMIT plus global   | server-derived `appUser._id`      | 2 burst, 3 tokens / hour         | Join is intentionally low frequency; duplicate/limiter errors are safe             |
| `orders.submit`                             | PER USER LIMIT               | server-derived active user ID     | 3 burst, 10 tokens / 15 minutes  | Prevent duplicate/order spam; business duplicate/state checks remain               |
| `orders.createReadyStock`                   | PER USER LIMIT               | server-derived active user ID     | 3 burst, 10 tokens / 15 minutes  | Stock reservation and notification cost; reservation transaction remains authority |
| `paymentConfirmations.submit`               | PER USER LIMIT               | server-derived active user ID     | 2 burst, 5 tokens / 15 minutes   | Proof/review queue and duplicate financial consequence                             |
| Payment proof upload URL                    | PER USER LIMIT               | server-derived active user ID     | 3 burst, 10 tokens / 15 minutes  | Storage abuse; file validator remains required                                     |
| Deposit proof upload URL                    | PER USER LIMIT               | server-derived active user ID     | 3 burst, 10 tokens / 15 minutes  | Storage abuse; file validator remains required                                     |
| `depositTopUps.submit`                      | PER USER LIMIT               | server-derived active user ID     | 2 burst, 5 tokens / 15 minutes   | Proof/review queue and financial impact                                            |
| Book cover/gallery upload URL               | OWNER/ADMIN LOW-VOLUME LIMIT | server-derived staff user ID      | 8 burst, 40 tokens / hour        | Storage abuse; role, type, size, gallery count remain required                     |
| `bulkImport.confirm`                        | OWNER/ADMIN LOW-VOLUME LIMIT | server-derived staff user ID      | 2 burst, 10 tokens / hour        | High-cost atomic mutation; parser/row/cell caps remain required                    |
| `users.inviteStaff`                         | OWNER/ADMIN LOW-VOLUME LIMIT | server-derived Owner user ID      | 3 burst, 10 tokens / hour        | Privileged onboarding abuse; Owner guard/audit remain required                     |

## Surface Inventory Classification

| Surface family                                              | Classification                                       | Evidence / reason                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Public static pages and published content                   | NO APP LIMIT NEEDED                                  | CDN/framework reads; no state mutation or expensive remote action                                                                               |
| `readyStock.list/getBySlug`                                 | BOUNDED BY QUERY/DATA MODEL                          | indexed publication query, 200-book ceiling, positive-stock projection                                                                          |
| Public `publishers`/content reads                           | BOUNDED BY QUERY/DATA MODEL                          | permission or allowlisted published key, pagination/caps                                                                                        |
| Catalog unlock                                              | GLOBAL + PER USER LIMIT                              | public brute-forceable state-changing gateway                                                                                                   |
| Catalog scoped reads                                        | BOUNDED BY QUERY/DATA MODEL                          | digest/session validation plus catalog projection; no mutation limiter on reactive query                                                        |
| Join submission                                             | GLOBAL + PER USER LIMIT                              | public spam-sensitive mutation                                                                                                                  |
| Customer profile/address mutations                          | NO APP LIMIT NEEDED                                  | low-cost, authenticated, user-owned; explicit field/text bounds                                                                                 |
| Order submission / Ready Stock reservation                  | PER USER LIMIT                                       | state-changing and notification/stock cost                                                                                                      |
| Customer order/invoice/payment/deposit/activity reads       | BOUNDED BY QUERY/DATA MODEL                          | ownership indexes, pagination, fixed result limits                                                                                              |
| Payment confirmation/proof                                  | PER USER LIMIT                                       | financial/review queue and storage cost                                                                                                         |
| Deposit top-up/proof                                        | PER USER LIMIT                                       | financial/review queue and storage cost                                                                                                         |
| Admin payment review/approval/rejection                     | OWNER/ADMIN LOW-VOLUME LIMIT not currently installed | Manual, permissioned, audited workflow; no public brute-force surface. Add only if observed automation/compromised-session pattern warrants it. |
| Admin deposit credit/adjustment/allocation/release/reversal | OWNER/ADMIN LOW-VOLUME LIMIT not currently installed | Manual, transaction-protected, audited workflow; authorization and ledger invariants are the primary boundary.                                  |
| Admin order/batch/tracking transitions                      | OWNER/ADMIN LOW-VOLUME LIMIT not currently installed | Manual operational workflow; no public unauthenticated attack path.                                                                             |
| Refund/payout mutations                                     | OWNER/ADMIN LOW-VOLUME LIMIT not currently installed | Manual financial workflow; current guards, state machine, audit, and idempotency are primary controls.                                          |
| Admin book/catalog/content/settings mutations               | OWNER/ADMIN LOW-VOLUME LIMIT not currently installed | Low-volume permissioned operations; upload/import/invitation exceptions are covered above.                                                      |
| Bulk Import preview                                         | BOUNDED BY QUERY/DATA MODEL                          | Admin permission, 2 MiB/200-row/5,000-cell parser bounds; query cannot safely mutate a limiter                                                  |
| Bulk Import confirm                                         | OWNER/ADMIN LOW-VOLUME LIMIT                         | Atomic high-cost mutation; 2/hour refill policy                                                                                                 |
| Admin invitation                                            | OWNER/ADMIN LOW-VOLUME LIMIT                         | Privileged onboarding; 10/hour refill policy                                                                                                    |
| Reports/export recording                                    | BOUNDED BY QUERY/DATA MODEL                          | admin permission, 366-day range, 2,000-result cap                                                                                               |
| Audit/activity reads                                        | BOUNDED BY QUERY/DATA MODEL                          | Owner/admin permission, pagination/caps; no mutation limiter                                                                                    |
| Legacy prototype session exports                            | NO APP LIMIT NEEDED                                  | always returns `LEGACY_IDENTITY_DISABLED`                                                                                                       |

## Implementation

The component-backed policy is centralized in `convex/lib/rateLimit.ts` and
registered in `convex/convex.config.ts` using `@convex-dev/rate-limiter`.
`enforceRateLimit` returns the stable `RATE_LIMITED` error with a bounded
retry-after message. Keys are server-derived; no user-supplied IP or identity
header is trusted. Convex functions do not expose a universally trustworthy
client IP in the current application path, so anonymous public protection uses
the global bucket and provider/edge controls remain separate concerns.

## Tests

- Normal valid catalog/order/payment/deposit flows remain green in the Convex
  suite.
- Twenty-one anonymous join submissions in a deterministic fixture engage the
  global limit; different legitimate authenticated users use isolated keys.
- Invalid catalog attempts remain denied and do not reveal code validity.
- Authorization tests prove a customer cannot use a limiter-protected path to
  reach an Admin mutation; rate limiting never grants access.

## Missing Coverage / Decision

There is no blanket limiter on every query or every low-volume Admin mutation.
That is intentional: adding a mutation-backed limiter to all reactive reads
would add state, cost, and failure modes without addressing the primary threat.
Admin financial mutations remain a documented `OWNER/ADMIN LOW-VOLUME LIMIT`
candidate. Promote them to an implemented policy if observability shows
automation, repeated accidental retries, or a compromised-session threat;
until then their server authorization, transaction/state guards, and audit
records are the control.
