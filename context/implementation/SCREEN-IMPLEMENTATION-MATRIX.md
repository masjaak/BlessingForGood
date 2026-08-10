# Screen Implementation Matrix

| Screen | Route | Audience | Identity/authorization | Status |
| --- | --- | --- | --- | --- |
| Welcome | `/` | public | none | implemented |
| Community guide | `/community` | public | none | implemented |
| How to order | `/how-to-order` | public | none | implemented |
| Help | `/help` | public | none | implemented |
| Ready stock | `/ready-stock` | public | none | implemented |
| Sign in | `/sign-in/[[...sign-in]]` | signed out | Clerk Development | implemented |
| Invitation acceptance | `/sign-up/[[...sign-up]]` | invited | Clerk Restricted Mode | implemented; real QA pending |
| Secret catalog | `/catalog` | authenticated | Convex catalog permission + app-user grant | implemented; runtime QA pending |
| Customer orders | `/account/orders` | customer | own `customerUserId` | implemented; runtime QA pending |
| Customer order detail | `/account/orders/[orderId]` | customer | own order | implemented; runtime QA pending |
| Customer invoices | `/account/invoices` | customer | own `customerUserId` | implemented; runtime QA pending |
| Customer invoice detail | `/account/invoices/[invoiceId]` | customer | own invoice | implemented; runtime QA pending |
| Admin payment review | `/admin/payments` | admin/owner | invoice read/manage permissions | implemented; runtime QA pending |
| Customer profile | `/account/profile` | customer | current app user | implemented; Convex tests pass |
| Customer addresses | `/account/addresses` | customer | current app user | implemented; Convex tests pass |
| Admin overview | `/admin` | admin/owner | admin permission | implemented; runtime QA pending |
| Catalog management | `/admin/catalogs` | admin/owner | catalog/books permissions | implemented; runtime QA pending |
| Order management | `/admin/orders`, `/admin/orders/[orderId]` | admin/owner | order/tracking all permissions | implemented; runtime QA pending |
| Batch management | `/admin/batches`, `/admin/batches/[batchId]` | admin/owner | batch/tracking permissions | implemented; runtime QA pending |
| Invoice management | `/admin/invoices`, `/admin/invoices/[invoiceId]` | admin/owner | invoice/deposit permissions | implemented; runtime QA pending |
| User management | `/admin/users` | owner | owner-only Convex functions | implemented; runtime QA pending |

Navigation is not authorization. Every protected screen remains backed by
server-side Convex checks.
