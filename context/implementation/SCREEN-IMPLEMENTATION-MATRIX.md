# Screen Implementation Matrix

| Screen | Route | Audience | Status | Data source | Known gap |
| --- | --- | --- | --- | --- | --- |
| Welcome | `/` | public | foundation | repository copy | final copy/brand assets missing |
| Community guide | `/community` | public | foundation | prototype copy | canonical content document missing |
| How to order | `/how-to-order` | public | foundation | prototype copy | final rules document missing |
| Secret catalog access | `/catalog` | customer | in-progress | local prototype adapter | Clerk/Convex unavailable |
| Customer orders | `/account/orders` | customer | in-progress | local prototype adapter | no production identity |
| Admin overview | `/admin` | admin | in-progress | local prototype adapter | Clerk/authorization unavailable |
| Catalog management | `/admin/catalogs` | admin | in-progress | local prototype adapter | richer CRUD deferred |
| Order management | `/admin/orders` | admin | in-progress | local prototype adapter | audit persistence deferred |
| Invoice management | `/admin/invoices` | admin | functional | local prototype adapter | payment verification deferred |
| Customer invoices | `/account/invoices` | customer | functional | local prototype adapter | production identity deferred |
| Help foundation | `/help` | public | foundation | repository brief | canonical help copy missing |
| Ready-stock foundation | `/ready-stock` | public | foundation | zero-data state | inventory/catalog implementation deferred |
