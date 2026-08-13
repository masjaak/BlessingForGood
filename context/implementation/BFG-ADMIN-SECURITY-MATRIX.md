# BFG Admin Security Matrix

Status: `BFG_ADMIN_SECURITY_HARDENED_LOCAL_AUTH_ACCEPTANCE_PENDING`

Production authentication acceptance remains blocked by the external Clerk
Production to Convex token/configuration boundary. This document records local,
deterministic authorization evidence only.

## Authority chain

```text
Clerk identity
→ Convex authentication
→ appUsers lookup
→ active status
→ role and permission
→ Customer or Admin workspace
```

Clerk authenticates identity. `appUsers` and Convex authorize BFG access. A
Clerk login, email address, URL, or visible navigation item never grants Admin.

## Required identity matrix

| Identity | `/admin` | Admin query | Admin mutation | Customer workspace |
| --- | --- | --- | --- | --- |
| Signed out | DENY | DENY | DENY | Public/gated behavior by route |
| Clerk user, no `appUser` | DENY | DENY | DENY | Admission required on private routes |
| Suspended `appUser` | DENY | DENY | DENY | DENY |
| Active customer | DENY | DENY | DENY | ALLOW |
| Active admin | ALLOW | ALLOW | ALLOW except Owner-only operations | ALLOW |
| Active owner | ALLOW | ALLOW | ALLOW | ALLOW |

## Codebase Memory pre-flight answers

1. `/admin` is first protected by `AdminLayout` in
   `src/app/admin/layout.tsx`, which calls Clerk `auth()` and
   `redirectToSignIn()` when no Clerk user exists. Each Admin page then mounts
   its data component behind `ProductAccessGuard` with `requiredRole="admin"`;
   `/admin/users` uses `requiredRole="owner"`.
2. `roleCanAccess(role, "admin")` allows exactly `admin` and `owner`.
3. An active customer cannot render Admin children through direct navigation;
   the shared guard returns the access-denied state first.
4. A missing `appUser` resolves to `admission-required`; Admin children and
   private queries do not mount. Direct Convex calls fail `APP_USER_REQUIRED`.
5. A suspended `appUser` resolves to the suspension state. Direct Convex calls
   fail `USER_SUSPENDED` through `requireActiveUser`.
6. Every Admin-specific query listed below calls `requirePermission` or
   `requireOwner` before reading protected records.
7. Every Admin-specific mutation listed below calls `requirePermission` or
   `requireOwner` before its protected read or write.
8. No Admin-specific Convex API relies only on a frontend guard. No public
   Convex action exists in the current repository.
9. `users.list`, `users.updateRole`, `users.suspend`, and `users.reactivate`
   are Owner-only through `requireOwner`.
10. Changing customer-role behavior affects `ProductAccessGuard` callers on
    account, order, invoice, profile, and address routes. The route-aware data
    providers now select owned customer queries outside `/admin`, preventing
    operational Admin collections from leaking into the customer presentation.
11. `roleCanAccess` affects only client presentation/query selection.
    `requirePermission` affects 21 Convex domain modules. Composing
    `adminPermissions` from `customerPermissions` adds only owned customer
    reads to Admin; customer, Owner-only, and operational permissions are not
    broadened.

## Surface and operation inventory

Authorization values below are the required and observed local behavior.
`DENY` means the guard rejects before a protected payload or write is returned.

| Surface / Operation | Route / Function | Signed Out | Missing appUser | Suspended | Customer | Admin | Owner | Frontend Guard | Server Guard | Sensitive Data? | Sensitive Mutation? | Expected Authorization | Current Authorization | Gap | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin route family | `/admin`, `/admin/*` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | `AdminLayout` + `ProductAccessGuard(admin)` | Per-function permission below | YES | YES | Active Admin/Owner only | Matches | Production session unverified | PASS LOCAL |
| Overview Dashboard | `/admin`; `secretCatalogs.list`, `orders.listForAdmin`, `batches.listForAdmin`, `invoices.listForAdmin`, `paymentConfirmations.listPendingForAdmin`, `orderExceptions.listForAdmin`, `refunds.listForAdmin` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `catalog.manage`, `orders.read.all`, `batches.read`, `invoices.read.all`, `refunds.read.all` | YES | NO | Admin/Owner | Matches | None local | PASS |
| Join Requests read/review | `/admin/join-requests`; `joinRequests.listForAdmin`, `startReview`, `approve`, `reject` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `customers.read` / `customers.manage` | YES | YES | Admin/Owner | Matches; state guards and audit preserved | None local | PASS |
| Customers | `/admin/customers`, `/admin/customers/[customerId]`; `orders.listEligibleCustomers`, `customerProfiles.getForAdmin`, `customerAddresses.listForAdmin`, `orderExceptions.listForAdmin` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `orders.manage`, `customers.read`, `orders.read.all` | YES | NO | Admin/Owner | Matches; denial precedes profile/address payload | None local | PASS |
| Books and publishers | `/admin/books`, `/admin/books/[bookId]`; `books.listForAdmin`, `getForAdmin`, `create`, `update`; `bookVariants.listForBook`, `create`, `update`; `publishers.create` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `books.manage` | Operational | YES | Admin/Owner | Matches | `publishers.create` has no standalone audit event | PASS AUTH / AUDIT NOTE |
| Shared publisher metadata | `/admin/books*`; `publishers.list` | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW | Admin page guard for Admin presentation | `books.read` | NO | NO | Any active member may read non-sensitive publisher names | Matches | Not an Admin-only API | PASS |
| Catalogs | `/admin/catalogs`; `secretCatalogs.list`, `createBundle`, `open`, `close`; `catalogAccess.generateCode`, `revokeCode`; `catalogItems.listForCatalog`, `add` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `catalog.manage` | YES | YES | Admin/Owner | Matches; code/session credentials remain scoped to Secret Catalog | `catalogItems.add` has no standalone audit event | PASS AUTH / AUDIT NOTE |
| Ready Stock | `/admin/ready-stock`; `readyStock.listForAdmin`, `setQuantity` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `books.manage` | Operational | YES | Admin/Owner | Matches; quantity domain guards and audit preserved | None local | PASS |
| Orders | `/admin/orders`, `/admin/orders/[orderId]`; `orders.listForAdmin`, `getForAdmin`, `listEligibleCustomers`, `createAssisted`, `updateStatus` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `orders.read.all` / `orders.manage` | YES | YES | Admin/Owner | Matches; active-customer and state guards preserved | None local | PASS |
| Batch PO and tracking | `/admin/batches`, `/admin/batches/[batchId]`; `batches.listForAdmin`, `getForAdmin`, `create`, `linkCatalog`, `unlinkCatalog`, `archive`; `batchTracking.getForAdmin`, `getForOrderAdmin`, `listUnassignedForAdmin`, `assignOrderItem`, `unassignOrderItem`, `moveOrderItem`, `updateShipmentStage`; `orderFulfillment.getForAdmin`, `updateStage` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `batches.read/manage`, `tracking.read.all/manage` | YES | YES | Admin/Owner | Matches; invalid transitions and audit preserved | None local | PASS |
| Exceptions | `/admin/exceptions`; `orderExceptions.listForAdmin`, `listForOrderAdmin`, `getForAdmin`, `open`, `startReview`, `selectResolution`, `reject`, `resolve` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `orders.read.all` / `orders.manage` | YES | YES | Admin/Owner | Matches; exception/financial state machine preserved | None local | PASS |
| Invoices and deposits | `/admin/invoices`, `/admin/invoices/[invoiceId]`; `invoices.listForAdmin`, `getForAdmin`, `create`, `issue`, `voidInvoice`; `depositAccounts.getForInvoice`; `depositTransactions.listForInvoice`, `recordCredit`, `reverse`; `invoiceDepositAllocations.listForAdmin`, `allocate`, `release`, `reverse` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `invoices.read.all/manage`, `deposits.read.all/manage` | YES | YES | Admin/Owner | Matches; append-only financial and audit consequences preserved | None local | PASS |
| Payments | `/admin/payments`; `paymentConfirmations.listPendingForAdmin`, `listForAdmin`, `getForAdmin`, `startReview`, `approve`, `reject` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `invoices.read.all` / `invoices.manage` | YES | YES | Admin/Owner | Matches; invalid review transitions and audit preserved | None local | PASS |
| Refunds | `/admin/refunds`; `refunds.listForAdmin`, `getForAdmin`, `requestDepositRefundForAdmin`, `createPayout`, `startPayout`, `recordPayout` | DENY | DENY | DENY | DENY | ALLOW | ALLOW | Admin guard | `refunds.read.all/manage`, `deposits.manage` | YES | YES | Admin/Owner | Matches; payout/ledger state guards and audit preserved | None local | PASS |
| Users / Access | `/admin/users`; `users.list`, `updateRole`, `suspend`, `reactivate` | DENY | DENY | DENY | DENY | DENY | ALLOW | Owner guard; nav hidden for non-Owner | `requireOwner` | YES | YES | Owner only | Matches; self/Owner protection and audit preserved | Production Owner session unverified | PASS LOCAL |

## Direct backend bypass evidence

Representative sensitive query: `customerProfiles.getForAdmin`.
Representative Admin mutation: `publishers.create`.
Representative owned customer query: `orders.listMine`.
Representative Owner-only mutation: `users.updateRole`.

| Identity | Sensitive Admin query | Admin mutation | Owner-only mutation |
| --- | --- | --- | --- |
| Signed out | `IDENTITY_REQUIRED` | `IDENTITY_REQUIRED` | DENY |
| Missing `appUser` | `APP_USER_REQUIRED` | `APP_USER_REQUIRED` | DENY |
| Suspended Admin | `USER_SUSPENDED` | `USER_SUSPENDED` | DENY |
| Customer | `PERMISSION_DENIED` | `PERMISSION_DENIED` | `PERMISSION_DENIED` |
| Admin | ALLOW | ALLOW | `PERMISSION_DENIED` |
| Owner | ALLOW | ALLOW | ALLOW |

The query test seeds protected profile fields in the isolated Convex test
database. Unauthorized calls reject rather than receiving a partial record,
count, name, email, phone, address, or financial metadata.

## Credential and error audit

- Admin response views contain only required operational/profile fields.
  `appUserView` deliberately omits Clerk subject/token identifiers.
- No Admin response or component contains passwords, password hashes, Clerk
  secrets, JWTs, cookies, OTPs, deploy keys, API credentials, or webhook
  secrets.
- Server environment reads remain server-side. No secret value was printed.
- Convex authorization errors use concise stable codes such as
  `IDENTITY_REQUIRED`, `APP_USER_REQUIRED`, `USER_SUSPENDED`, and
  `PERMISSION_DENIED`; they do not include tokens, secret values, stack traces,
  or role identifiers in normal client UI.
- Secret Catalog access codes and opaque catalog sessions remain a separate,
  scoped public-catalog mechanism. They are not Clerk/Admin credentials and
  were not coupled to this change.

## Schema and domain impact

```text
Schema diff: ZERO
Business/financial transitions: UNCHANGED
Secret Catalog architecture: UNCHANGED
Clerk Organizations: NOT ENABLED
Second auth system: NOT CREATED
Email whitelist: NOT USED
```

## Codebase Memory post-diff

- Changed authorization symbols: `roleCanAccess`, `ProductAccessGuard`,
  `ConvexProductProvider`, `ConvexOperationsProvider`, and the existing Convex
  permission sets consumed by `requirePermission`.
- Direct client policy consumers: the route guard, both query providers,
  customer catalog/Ready Stock actions, Admin workspace link/navigation, and
  the Owner-only dashboard entry. Codebase Memory reports 55 transitive
  route/component impacts through those shared boundaries.
- Customer route impact: account, order, invoice, profile, address, catalog,
  and Ready Stock surfaces select owned customer queries for every active role
  outside `/admin`.
- Admin route impact: Admin query selection remains limited to `/admin`; all
  existing Admin query/mutation server guards are unchanged.
- Business, financial, Secret Catalog, and schema impact: none.
- Fresh coverage reports no recorded Convex gap. The only Admin parser caveat
  is `src/app/admin/page.tsx:123`; direct source inspection confirms it is the
  tested Owner-only Users link condition.
