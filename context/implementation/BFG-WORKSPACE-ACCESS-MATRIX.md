# BFG Workspace Access Matrix

Status: Phase 07.1 audit baseline

Customer and Admin use one Clerk/Convex application but remain separate
presentation contexts. The client guard controls which workspace mounts; every
private Convex query and mutation remains server-authorized.

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

## Matrix

| Surface | Route | Signed Out | Customer | Admin | Owner | Suspended | Missing appUser | Navigation Entry | Direct URL | Expected State | Authorization Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | `/` | public | customer shell | customer shell; switch available only when role resolves | customer shell; switch available | public shell until auth resolves | public shell until auth resolves | public nav / bottom nav | allowed | customer workspace | public route; no private query | PASS |
| Ready Stock | `/ready-stock`, `/ready-stock/[slug]` | public list/detail or empty | public list/detail; customer order action | public list/detail; no admin nav | same | public read; order action denied | public read; order action unavailable | homepage/discovery and signed-out public nav | allowed | customer/public workspace | `readyStock` public projection; `orders.createReadyStock` requires active customer | PASS / data-blocked populated detail |
| Secret Catalog | `/catalog` | public scoped-code gateway | valid scoped catalog session or customer grant | admin catalog session / operational access where query permits | same | private catalog query denied | gateway remains public; private query denied | homepage, public nav, bottom nav | allowed | gateway, then scoped catalog state | `catalogAccess` code/session or `catalog.read` | PASS |
| Buku Saya | `/account/orders` | branded locked state | own orders | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | bottom nav; account links | allowed | customer workspace | ProductAccessGuard + `orders.read.own` | PASS / auth acceptance pending |
| Orders | `/account/orders/[orderId]` | auth gate | owned order detail/tracking | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | order list and account activity | allowed | customer workspace | ProductAccessGuard + owned order query | PASS / populated data-blocked |
| Tagihan | `/account/invoices` | branded locked state | own invoices/deposit | customer-facing route allowed where current behavior permits | same | denied/suspended state | account-not-active state | bottom nav; account links | allowed | customer workspace | ProductAccessGuard + `invoices.read.own`/deposit own queries | PASS / auth acceptance pending |
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
- `AdminLayout` currently performs the Clerk signed-in gate. The client guard
  resolves the BFG appUser role/status before Admin children mount; Convex
  queries/mutations enforce permissions and ownership server-side.
- Current Production truth remains
  `BFG_AUTH_SESSION_V3_CODE_READY_PRODUCTION_AUTH_PENDING`. Real Clerk →
  Convex customer/Admin sessions, no-refresh workspace switching, and live
  `/admin` denial remain required before full Phase 07.1 closure.
