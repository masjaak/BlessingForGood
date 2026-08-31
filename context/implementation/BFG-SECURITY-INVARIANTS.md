# BFG SECURITY INVARIANTS

Reconciled: 2026-08-31
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
| SEC-09 | Secret Catalog codes are generated server-side, stored as peppered digests, shown plaintext only once, and never returned from stored queries. The current generated code is marked global; historical rows may omit that scope. | `catalogAccess.generateCode`, `lib/accessCodes`, configured secret | code storage inspection; generated response only; no digest/plaintext leakage |
| SEC-10 | Current Secret Catalog redemption is global across currently eligible open/unexpired Catalogs, expiring, revocable, and rate-limited; when eligible, the initial session Catalog is the generated code's source Catalog, and each requested Catalog is rechecked server-side. Historical per-Catalog and period sessions retain their existing guards. | `catalogAccess` sessions/attempt tables and server validators | eligible/ineligible Catalog, source-Catalog projection, expired/revoked/rotated code, brute-force threshold, session replay tests |
| SEC-11 | Anonymous catalog browsing never creates a BFG customer or owned order. | `orders.submit/createReadyStock` requires active customer; access session is separate | code-only browsing then order denial |
| SEC-12 | File uploads validate type, size, ownership, and access; private proofs are not public. | `convex/lib/storage.ts`, books/payment/deposit upload mutations | invalid file and cross-user proof access tests; signed URL projection |
| SEC-13 | Notification and Inbox rows are recipient-scoped; bodies do not contain credentials, access codes, or digests. | `notifications` indexes and query filters; event writers | cross-recipient query/read tests; safe metadata review |
| SEC-14 | Audit rows are append-only and safe; sensitive credentials and raw financial secrets are excluded. | `auditEvents`, `recordAudit` | privileged/financial event tests; metadata redaction review |
| SEC-15 | Sensitive financial/admin actions require the correct role and state, not a UI confirmation alone. | domain mutations and state helpers | invalid transition/role bypass tests |
| SEC-16 | Production and Development identity/configuration remain separated; no fallback to similarly named BFG projects. | repository decisions and environment runbooks | pre-deploy environment verification |
| SEC-17 | Admin/Owner MFA remains a Production operational requirement even when implementation authorization is Convex-side. | Clerk production policy/runbooks | Production operator acceptance; do not claim from local UI tests alone |
| SEC-18 | No dummy business records are created in Production to satisfy a screenshot or flow. | zero-data policy and release process | review every UAT fixture/data mutation; retain `BLOCKED_BY_DATA` when needed |
| SEC-19 | Invitation completion never exposes or logs password values; Clerk owns password policy and validation. | `src/components/clerk-invitation-acceptance.tsx`, installed Clerk Future resource | password input type/autocomplete assertion; field-error retry assertion; safe diagnostic review |
| SEC-20 | Current verified Clerk email is compared with the current approved admission email; historical subjects do not authorize a different current identity, different current sessions remain blocked, and existing Clerk identity does not bypass the BFG handoff. | `src/components/clerk-invitation-acceptance.tsx`, `clerk-invitation-form.tsx`, `users.ts`, `joinRequestInvitations.ts` | same-email/different-subject, different-email mismatch, existing-identity handoff, removed-tombstone reapply, masked diagnostics |
| SEC-21 | General Admin System visibility/access uses the canonical active `appUsers.role` / capability model, never a personal email allowlist; active Admins can use Users read/status operations, operational Settings, and read-only Audit, while role/invitation/revocation and ownership-critical operations retain Owner-only guards. | `convex/lib/auth.ts`, `convex/users.ts`, `src/components/admin-nav.tsx`, Admin Users/Settings/Audit pages | equivalent active Admins see System and can use intended operational routes; customer, inactive, and non-Admin identities are denied; Admin self-promotion, Owner-target status changes, and Owner-only role/access operations remain denied |
| SEC-22 | Customer-facing Book/Batch projections are scoped to the authenticated Customer and selected Batch; Customer cancellation is denied server-side even if a caller bypasses UI; active Admin role/status/member mutations retain the Owner boundary; Book hard delete cannot delete transaction truth. | `convex/batchTracking.ts`, `convex/orderExceptions.ts`, `convex/lib/auth.ts`, `convex/users.ts`, `convex/joinRequests.ts`, `convex/books.ts` | cross-Customer/cross-Batch query substitution; direct Customer cancellation mutation; inactive/Owner/self role or removal target; ordered Book deletion with preserved Order/Invoice/Payment/Audit snapshots |

## Security Closure Rule

Any change that alters a route, query, mutation, projection, session, file,
role, notification, or financial surface must update this index or explicitly
state why the invariant is unchanged, then add a regression before the change
can close.
