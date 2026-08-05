# Screen Implementation Matrix

| Screen | Route | Audience | Status | Data source | Known gap |
| --- | --- | --- | --- | --- | --- |
| Welcome | `/` | public | browser-verified foundation | repository copy + official brand assets | final copy remains prototype copy |
| Community guide | `/community` | public | foundation | prototype copy | canonical content document missing |
| How to order | `/how-to-order` | public | foundation | prototype copy | final rules document missing |
| Secret catalog access | `/catalog` | customer | browser-verified foundation | local prototype adapter + `BookCover` fallback | Clerk/Convex unavailable |
| Customer orders | `/account/orders` | customer | browser-verified foundation | local prototype adapter | no production identity |
| Admin overview | `/admin` | admin | browser-verified foundation | local prototype adapter | Clerk/authorization unavailable |
| Catalog management | `/admin/catalogs` | admin | browser-verified foundation | local prototype adapter | richer CRUD deferred |
| Order management | `/admin/orders` | admin | browser-verified foundation | local prototype adapter | audit persistence deferred |
| Invoice management | `/admin/invoices` | admin | browser-verified foundation | local prototype adapter | payment verification deferred |
| Customer invoices | `/account/invoices` | customer | browser-verified foundation | local prototype adapter | production identity deferred |
| Help foundation | `/help` | public | foundation | repository brief | canonical help copy missing |
| Ready-stock foundation | `/ready-stock` | public | foundation | zero-data state | inventory/catalog implementation deferred |
