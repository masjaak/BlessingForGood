# Screen Implementation Matrix

| Screen                 | Route               | Audience | Status                          | Data source                                                    | Known gap                                  |
| ---------------------- | ------------------- | -------- | ------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| Welcome                | `/`                 | public   | browser-verified foundation     | repository copy + official brand assets                        | final copy remains prototype copy          |
| Community guide        | `/community`        | public   | foundation                      | prototype copy                                                 | canonical content document missing         |
| How to order           | `/how-to-order`     | public   | foundation                      | prototype copy                                                 | final rules document missing               |
| Secret catalog access  | `/catalog`          | customer | Preview-verified vertical slice | Convex Preview; explicit local fallback + `BookCover` fallback | Clerk/Production auth unavailable          |
| Customer orders        | `/account/orders`   | customer | Preview-verified vertical slice | Convex Preview; explicit local fallback                        | no production identity                     |
| Admin overview         | `/admin`            | admin    | Preview-verified vertical slice | Convex Preview; explicit local fallback                        | Clerk/Production authorization unavailable |
| Catalog management     | `/admin/catalogs`   | admin    | Preview-verified vertical slice | Convex Preview; explicit local fallback                        | richer CRUD deferred                       |
| Customer order detail  | `/account/orders/[orderId]` | customer | Preview-verified operations | Convex Preview; explicit local fallback | Clerk/Production identity deferred |
| Order management       | `/admin/orders`     | admin    | Preview-verified operations | Convex Preview; explicit local fallback | reassignment audit correction deferred |
| Admin order detail     | `/admin/orders/[orderId]` | admin | Preview-verified operations | Convex Preview | backward correction deferred |
| Batch management       | `/admin/batches`    | admin    | Preview-verified operations | Convex Preview | provider integration deferred |
| Batch detail           | `/admin/batches/[batchId]` | admin | Preview-verified operations | Convex Preview | final logistics policy deferred |
| Invoice management     | `/admin/invoices`   | admin    | Preview-verified operations | Convex Preview; explicit local fallback | payment verification deferred |
| Admin invoice detail   | `/admin/invoices/[invoiceId]` | admin | Preview-verified operations | Convex Preview | final accounting policy deferred |
| Customer invoices      | `/account/invoices` | customer | Preview-verified operations | Convex Preview; explicit local fallback | Production identity deferred |
| Customer invoice detail | `/account/invoices/[invoiceId]` | customer | Preview-verified operations | Convex Preview | payment settlement deferred |
| Help foundation        | `/help`             | public   | foundation                      | repository brief                                               | canonical help copy missing                |
| Ready-stock foundation | `/ready-stock`      | public   | foundation                      | zero-data state                                                | inventory/catalog implementation deferred  |
