# BFG Workspace Access Matrix

Status: `BFG_PHASE_07_1_FINAL_CLOSURE_LOCAL_PRODUCTION_ACCEPTANCE_PENDING`

Customer and Admin use one Clerk/Convex application but remain separate
presentation contexts. The client guard controls which workspace mounts; every
private Convex query and mutation remains server-authorized.

The Clerk → Convex authentication boundary is now verified in the current
Production runtime. A Clerk account still does not grant BFG membership:
`appUsers` admission, status, role, and server authorization remain the source
of truth. The remaining closure gate is deployment of this admission/UI diff
and real customer/Admin/Owner acceptance.

## State machine

| State | Event | Guard | Transition | Side effect |
| --- | --- | --- | --- | --- |
| `CUSTOMER_WORKSPACE` | `OPEN_ADMIN_WORKSPACE` | active `admin` or `owner` appUser | `ADMIN_WORKSPACE` | Navigate to `/admin`; Admin queries may start |
| `CUSTOMER_WORKSPACE` | `OPEN_ADMIN_WORKSPACE` | customer, suspended, missing appUser, or unresolved auth | `ACCESS_DENIED` / auth state | Keep customer context; do not mount Admin children or queries |
| `ADMIN_WORKSPACE` | `OPEN_CUSTOMER_WORKSPACE` | signed-in Admin/Owner | `CUSTOMER_WORKSPACE` | Navigate to `/`; customer shell renders; no role change |
| `AUTH_SYNCING` | `AUTH_RESOLVED` | active appUser exists | `CUSTOMER_WORKSPACE` or `ADMIN_WORKSPACE` by current route | Mount only role-allowed queries |
| `AUTH_SYNCING` | `AUTH_RESOLVED` | missing appUser or admission denied | `APPUSER_MISSING` | Show account-not-active state; skip private queries |
| `AUTH_SYNCING` | `AUTH_RESOLVED` | appUser status is suspended | `SUSPENDED` | Show suspension state; skip business queries |
| any protected state | `AUTH_ERROR` | Convex auth/network/configuration failure | `AUTH_ERROR` | Show recoverable error; expose retry; never fall back to anonymous data |

Invalid transitions are rejected by `ProductAccessGuard`; Convex authorization
is the authoritative second boundary. No workspace switch mutates role,
ownership, business records, or financial state.

`roleCanAccess` is the shared client role policy. The Convex product and
operations providers also use the current route: staff receive Admin queries
only under `/admin`; on customer routes, active customer/Admin/Owner identities
receive only their owned customer projections.

## Matrix

| Surface | Route | Signed Out | Customer | Admin | Owner | Suspended | Missing appUser | Navigation Entry | Direct URL | Expected State | Authorization Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | `/` | public | customer shell | customer shell; switch available only when role resolves | customer shell; switch available | public shell until auth resolves | public shell until auth resolves | public nav / bottom nav | allowed | customer workspace | public route; no private query | PASS |
| Ready Stock | `/ready-stock`, `/ready-stock/[slug]` | public list/detail or empty | public list/detail; customer order action | public list/detail; no admin nav | same | public read; order action denied | public read; order action unavailable | homepage/discovery and signed-out public nav | allowed | customer/public workspace | `readyStock` public projection; `orders.createReadyStock` requires active customer | PASS / data-blocked populated detail |
| Secret Catalog | `/catalog` | public scoped-code gateway | valid scoped catalog session or customer grant | admin catalog session / operational access where query permits | same | private catalog query denied | gateway remains public; private query denied | homepage, public nav, bottom nav | allowed | gateway, then scoped catalog state | `catalogAccess` code/session or `catalog.read` | PASS |
| Buku Saya | `/account/orders` | branded locked state | own orders | own customer-side orders | own customer-side orders | denied/suspended state | account-not-active state | bottom nav; account links | allowed | customer workspace | ProductAccessGuard + `orders.read.own` | PASS locally / Production auth pending |
| Orders | `/account/orders/[orderId]` | auth gate | owned order detail/tracking | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | order list and account activity | allowed | customer workspace | ProductAccessGuard + owned order query | PASS / populated data-blocked |
| Tagihan | `/account/invoices` | branded locked state | own invoices/deposit | own customer-side invoice/deposit projections | same | denied/suspended state | account-not-active state | bottom nav; account links | allowed | customer workspace | ProductAccessGuard + owned invoice/deposit permissions | PASS locally / Production auth pending |
| Invoice detail | `/account/invoices/[invoiceId]` | auth gate | owned invoice/payment/deposit detail | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | Tagihan list, order detail | allowed | customer workspace | ProductAccessGuard + invoice ownership | PASS / populated data-blocked |
| Account | `/account` | branded account gate | own dashboard | customer workspace with Admin switch | customer workspace with Admin switch | suspended state | account-not-active state | bottom nav; account activity | allowed | customer workspace | ProductAccessGuard + own projections | PASS / auth acceptance pending |
| Profile | `/account/profile` | back-to-account auth gate | own profile form | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | Account → Profil | allowed | customer workspace | ProductAccessGuard + `customerProfiles` own helper | PASS after reachability fix |
| Addresses | `/account/addresses` | back-to-account auth gate | own address list/form | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | Account → Alamat pengiriman | allowed | customer workspace | ProductAccessGuard + `customerAddresses` ownership | PASS after reachability fix |
| Admin dashboard | `/admin` | Clerk sign-in gate | access denied; no Admin data | operational workspace | operational workspace | denied/suspended state | account-not-active state | elevated account menu only; never customer primary nav | allowed only after auth/role resolution | Admin workspace or denial | AdminLayout Clerk gate + ProductAccessGuard + protected Convex queries | PASS locally; Production auth pending |
| Join Requests | `/admin/join-requests` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `customers.read` / `customers.manage` | PASS |
| Customers | `/admin/customers`, `/admin/customers/[customerId]` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `customers.read` plus owned operational projections | PASS |
| Books | `/admin/books`, `/admin/books/[bookId]` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `books.manage` | PASS |
| Catalog | `/admin/catalogs` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `catalog.manage` | PASS |
| Ready Stock operations | `/admin/ready-stock` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `books.manage` | PASS |
| Orders operations | `/admin/orders`, `/admin/orders/[orderId]` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `orders.read.all` / `orders.manage` | PASS |
| Batch PO | `/admin/batches`, `/admin/batches/[batchId]` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `batches.*` / `tracking.*` | PASS |
| Invoices | `/admin/invoices`, `/admin/invoices/[invoiceId]` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `invoices.*` / `deposits.*` | PASS |
| Payments | `/admin/payments` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `invoices.manage` | PASS |
| Exceptions | `/admin/exceptions` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `orders.read.all` / `orders.manage` | PASS |
| Refunds | `/admin/refunds` | sign-in gate | denied | allowed | allowed | denied | denied | Admin sidebar | allowed only after auth/role resolution | Admin workspace or denial | `refunds.*` / deposit permissions | PASS |
| Users / Access | `/admin/users` | sign-in gate | denied | denied | allowed | denied | denied | Admin sidebar, owner only | allowed only after auth/role resolution | Owner workspace or denial | `requireOwner` / `users.*` | PASS |

## Evidence and open gate

- Codebase Memory mapped `SiteShell`, `AdminShellLink`, `AdminNav`,
  `ProductAccessGuard`, `ProductProvider`, `ConvexProductProvider`, and the
  Convex auth helpers. `AdminShellLink` was called by every `SiteShell` route
  because it was mounted inside the signed-in customer primary nav.
- `AdminLayout` performs the Clerk signed-in gate. `ProductAccessGuard` resolves
  BFG role/status before Admin children mount; every Admin query/mutation then
  enforces permission or Owner role independently in Convex.
- Deterministic tests cover signed out, missing `appUser`, suspended, customer,
  Admin, and Owner route policy; direct sensitive query/mutation denial; and
  Owner-only role management. The protected-data test rejects before returning
  profile fields.
- Current pre-diff Production deployment already passes Clerk → Convex token,
  issuer, audience, Convex identity, non-member detection, and Admin denial.
  The final closure deployment must add the admission path and visual changes,
  then repeat real customer/Admin/Owner acceptance.

## Phase 07.1 admission delta

The admission state machine and customer/Admin review contract are recorded in
`BFG-BLESSFRIEND-ADMISSION-FLOW.md`. `/join` is intentionally public and also
renders for a signed-in Clerk identity with no `appUser`; private customer
routes remain guarded until an active `appUser` exists. Admin approval is the
only authorization event that can admit an existing Clerk identity.

The Admin sidebar uses the live pending-review count and the dashboard uses the
same pending queue as an attention item. Both are operational indicators, not
a notification platform. Join history is retained; duplicate unresolved
requests are rejected idempotently.

The customer shell uses one `SiteShell` header and the canonical `BrandLogo`
with `Logo-1`. Admin uses the same asset with contextual sizing. Ready Stock,
Exceptions, and Refunds share the existing Admin page primitives and a common
operational grammar without changing domain logic.
