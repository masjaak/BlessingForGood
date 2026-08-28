# BFG SECURITY INVARIANTS

Reconciled: 2026-08-28
These invariants are mandatory before any security-sensitive change. The
client may hide or show controls; only Convex guards grant authority.

| ID | Invariant | Canonical authority / implementation | Required verification |
|---|---|---|---|
| SEC-01 | Clerk is the authentication authority; BFG does not store passwords or alternate session credentials. | Clerk provider; Convex `ctx.auth.getUserIdentity()` in `convex/lib/auth.ts` | signed-out identity denial; token issuer/audience configuration; no BFG password/token fields |
| SEC-02 | `appUsers` is the admission, role, status, and ownership authority. | `appUsers` schema; `users.ensureCurrentUser`; `findCurrentUser` | missing appUser denied; approved admission consequence; ownership tests |
| SEC-03 | Authentication alone never grants BFG membership or customer catalog/order access. | `requireCurrentUser`, `requireActiveUser`, `catalogAccess`, `orders` | Clerk-only identity denial and no owned order creation |
| SEC-04 | Suspended users fail closed on private queries and mutations. | `requireActiveUser` | suspended customer/Admin/Owner route and direct backend denial |
| SEC-05 | Role matrix is `customer`, `admin`, `owner`; Owner-only operations remain Owner-only. | `BfgRole`, permission sets, `requireAdminOrOwner`, `requireOwner` | signed out/missing/suspended/customer/Admin/Owner matrix for routes, queries, mutations |
| SEC-06 | Admin UI guards do not replace server authorization. | Every Convex Admin query/mutation calls shared guards | direct bypass tests against sensitive functions |
| SEC-07 | Customers see only owned orders, invoices, payments, deposits, refunds, exceptions, profile, address, batches, notifications, and Inbox. | `requireOwnedResource` and domain-specific projections | cross-customer ID substitution tests |
| SEC-08 | Admin/Owner may use customer-safe projections but cannot use customer routes to bypass Admin permission boundaries. | route-aware providers plus server permissions | Admin/Owner customer-route tests; sensitive Admin API tests |
| SEC-09 | Secret Catalog codes are generated server-side, stored as peppered digests, shown plaintext only once, and never returned from stored queries. | `catalogAccess.generateCode`, `lib/accessCodes`, configured secret | code storage inspection; generated response only; no digest/plaintext leakage |
| SEC-10 | Secret Catalog redemption is catalog-scoped, expiring, revocable, and rate-limited. | `catalogAccess` sessions/attempt tables and server validators | wrong catalog, expired/revoked code, brute-force threshold, session replay tests |
| SEC-11 | Anonymous catalog browsing never creates a BFG customer or owned order. | `orders.submit/createReadyStock` requires active customer; access session is separate | code-only browsing then order denial |
| SEC-12 | File uploads validate type, size, ownership, and access; private proofs are not public. | `convex/lib/storage.ts`, books/payment/deposit upload mutations | invalid file and cross-user proof access tests; signed URL projection |
| SEC-13 | Notification and Inbox rows are recipient-scoped; bodies do not contain credentials, access codes, or digests. | `notifications` indexes and query filters; event writers | cross-recipient query/read tests; safe metadata review |
| SEC-14 | Audit rows are append-only and safe; sensitive credentials and raw financial secrets are excluded. | `auditEvents`, `recordAudit` | privileged/financial event tests; metadata redaction review |
| SEC-15 | Sensitive financial/admin actions require the correct role and state, not a UI confirmation alone. | domain mutations and state helpers | invalid transition/role bypass tests |
| SEC-16 | Production and Development identity/configuration remain separated; no fallback to similarly named BFG projects. | repository decisions and environment runbooks | pre-deploy environment verification |
| SEC-17 | Admin/Owner MFA remains a Production operational requirement even when implementation authorization is Convex-side. | Clerk production policy/runbooks | Production operator acceptance; do not claim from local UI tests alone |
| SEC-18 | No dummy business records are created in Production to satisfy a screenshot or flow. | zero-data policy and release process | review every UAT fixture/data mutation; retain `BLOCKED_BY_DATA` when needed |
| SEC-19 | Invitation completion never exposes or logs password values; Clerk owns password policy and validation. | `src/components/clerk-invitation-acceptance.tsx`, installed Clerk Future resource | password input type/autocomplete assertion; field-error retry assertion; safe diagnostic review |
| SEC-20 | Current verified Clerk email is compared with the current approved admission email; historical subjects do not authorize a different current identity, and different current sessions remain blocked. | `src/components/clerk-invitation-acceptance.tsx`, `clerk-invitation-form.tsx`, `users.ts` | same-email/different-subject, different-email mismatch, removed-tombstone reapply, masked diagnostics |

## Security Closure Rule

Any change that alters a route, query, mutation, projection, session, file,
role, notification, or financial surface must update this index or explicitly
state why the invariant is unchanged, then add a regression before the change
can close.
