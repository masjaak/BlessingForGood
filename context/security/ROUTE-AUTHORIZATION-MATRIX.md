# Route Authorization Matrix

`proxy.ts` and server layouts provide early navigation protection. Convex
functions enforce the resource boundary after identity and BFG role
resolution. `PrototypeModeGuard` prevents protected children from mounting
while Convex auth/provisioning is unresolved.

| Route | Auth requirement | Allowed role | Ownership | Next.js protection | Convex protection | Signed-out / denied behavior | Test status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | public | all | none | public | none | render public page | local smoke |
| `/community` | public | all | none | public | none | render public page | route smoke |
| `/how-to-order` | public | all | none | public | none | render public page | route smoke |
| `/help` | public | all | none | public | none | render public page | route smoke |
| `/join` | public | signed-out visitors | none | public | `joinRequests.submit` validates input | authenticated users see already-member state | Convex tests; browser staging pending |
| `/ready-stock` | public | all | none | public | published positive-stock projection | render public/zero-data page | Convex suite; browser staging pending |
| `/ready-stock/[slug]` | public | all | none | public | published positive-stock projection | hidden/zero stock unavailable | Convex suite; browser staging pending |
| `/sign-in/[[...sign-in]]` | Clerk auth page | signed out | none | signed-in redirect | Clerk | signed-in redirects to `/catalog` | component/build |
| `/sign-up/[[...sign-up]]` | valid invitation | signed out/invite | none | signed-in redirect | Clerk Restricted Mode | invalid/expired Clerk invitation error | component/build |
| `/catalog` | Clerk + active BFG user | customer; admin/owner preview link allowed | catalog grant belongs to app user | catalog layout | `catalog.read`, grant by `appUserId` | redirect to sign-in; role denial | Convex tests |
| `/account/orders` | Clerk + customer | customer | own orders | account layout + guard | `orders.read.own` | redirect/deny; no query before active | Convex tests |
| `/account/orders/[orderId]` | Clerk + customer | customer | order customerUserId | account layout + guard | `orders.read.own` + ownership | redirect/deny | Convex tests |
| `/account/invoices` | Clerk + customer | customer | own invoices | account layout + guard | `invoices.read.own` | redirect/deny | Convex tests |
| `/account/invoices/[invoiceId]` | Clerk + customer | customer | invoice customerUserId | account layout + guard | `invoices.read.own` + ownership | redirect/deny | Convex tests |
| `/account/profile` | Clerk + customer | customer | current app user | account layout + guard | active-user profile helper | redirect/deny | Convex tests |
| `/account/addresses` | Clerk + customer | customer | current app user | account layout + guard | active-user address helper | redirect/deny | Convex tests |
| `/admin` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | operational permission | redirect/permission denial | Convex tests |
| `/admin/catalogs` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | catalog/books manage | redirect/permission denial | Convex tests |
| `/admin/books`, `/admin/books/[bookId]` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | `books.manage` | redirect/permission denial | Convex suite; browser staging pending |
| `/admin/orders` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | orders read/manage all; assisted orders require active customer target | redirect/permission denial | Convex tests |
| `/admin/orders/[orderId]` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | order/tracking all | redirect/permission denial | Convex tests |
| `/admin/batches` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | batches/tracking all; roster counts | redirect/permission denial | Convex tests |
| `/admin/batches/[batchId]` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | admin-only roster, assignment, purchase summary, and lock operations | redirect/permission denial | Convex tests |
| `/admin/invoices` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | invoices/deposits all | redirect/permission denial | Convex tests |
| `/admin/invoices/[invoiceId]` | Clerk + active BFG user | admin/owner | operational | admin layout + guard | invoice/deposit all | redirect/permission denial | Convex tests |
| `/admin/payments` | Clerk + active BFG user | admin/owner | operational payment queue | admin layout + guard | invoice read/manage all | redirect/permission denial | Convex tests |
| `/admin/exceptions` | Clerk + active BFG user | admin/owner | operational exception queue | admin layout + guard | order exception read/manage all | redirect/permission denial | Convex tests |
| `/admin/join-requests` | Clerk + active BFG user | admin/owner | operational admission queue | admin layout + guard | `customers.read` + `customers.manage` | redirect/permission denial | Convex tests; browser staging pending |
| `/admin/users` | Clerk + active BFG user | owner only | appUsers security target | admin layout + owner guard | `users.*` owner helper | redirect/permission denial | Convex tests |

[DEFERRED TO STAGING] Real signed-out and role-specific browser route results,
payment review UX, runtime logs, and authenticated Playwright remain pending;
local unit/Convex tests are not labeled as runtime authentication evidence.
