# BFG Admin Visual Source Map

Status: Phase 07 final reference map

The local Admin reference set is in `public/mockups/admin/` and consists of
`admin dashboard 1.png` through `admin dashboard 10.png` (1586×992 PNGs).
The references were inspected as a visual donor set. They are not a business
source of truth: Phase 06.7 policies and current Convex behavior supersede any
older workflow implied by a mockup.

| Route                                                   | Reference            | Reusable                                                                                 | Superseded / current requirement                                                                                   |
| ------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/admin`                                                | Admin dashboard 1–10 | Desktop sidebar, top context, grouped work areas, restrained cards, table-first scanning | Growth charts, fake KPIs, upload/report/settings destinations; dashboard is an attention queue                     |
| `/admin/join-requests`, `/admin/customers`              | Admin dashboard 1–10 | Dense people list, status at row level, detail before material decision                  | Membership and ownership follow canonical Join/appUser records; no generic CRM rewrite                             |
| `/admin/books`, `/admin/catalogs`, `/admin/ready-stock` | Admin dashboard 1–10 | Catalog-management hierarchy, compact forms, list/table comparison                       | Secret Catalog security remains canonical; Ready Stock uses on-hand/reserved/available                             |
| `/admin/orders`, `/admin/batches`, `/admin/exceptions`  | Admin dashboard 1–10 | Operational queues, detail context, clear next action                                    | Final Phase 06.7 cancellation and defect policies are authoritative; no invented transitions                       |
| `/admin/invoices`, `/admin/payments`, `/admin/refunds`  | Admin dashboard 1–10 | Finance queue/table density, explicit record state, context before action                | No revenue analytics or gateway; invoice snapshot, payment history, obligation, payout, and ledger remain separate |
| `/admin/users`                                          | Admin dashboard 1–10 | Quiet system-management treatment and clear role state                                   | Existing RBAC, owner-only role operations, and suspension boundaries remain unchanged                              |

## Decision

The implemented Admin visual layer reuses the reference set's desktop
information density and persistent navigation, but deliberately keeps the
current BFG operational shell and existing route names. The references do not
authorize analytics, reporting, CMS, settings, payment gateway, or a new
backend model.
