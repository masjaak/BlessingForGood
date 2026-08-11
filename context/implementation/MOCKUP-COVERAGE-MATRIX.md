# BFG Mockup Coverage Matrix

Sources were inspected directly from `public/mockups`. Mockup records are visual
references only; their sample data is never seeded. `EXTENDED` means newer
Phase 01–06.4 capability inherits the same visual language.

## Customer mockups

| Mockup | Target route | Current implementation | Alignment | Missing visual elements | Newer functionality integrated | Final action |
| --- | --- | --- | --- | --- | --- | --- |
| `mobile/mockup 1.png` | `/catalog` access | Branded code-entry card, official logo shell, mascot guidance | ALIGNED | Exact decorative spacing differs | Clerk identity, hashed codes, grants, fail-closed access | Keep secure implementation |
| `mobile/mockup 2.png` | `/catalog` browse | Unlocked catalog cards, formats, ISBN, price, quantity | PARTIAL | Mockup tabs/filter bar and compact thumbnail list | Secure catalog grant and canonical order submission | Preserve security; refine filters after catalog volume requires them |
| `mobile/mockup 3.png` | catalog book selection | Book/variant selector within `/catalog` | PARTIAL | No separate catalog-book detail/gallery route | Snapshot order items and availability enforcement | Do not duplicate the current order form solely for visual parity |
| `mobile/mockup 4.png` | `/ready-stock/[slug]` | Cover, metadata, variants, stock, price, contact action | EXTENDED | Gallery is limited to available image references | Server search/filter/sort and positive-stock privacy | Keep current canonical detail |
| `mobile/mockup 5.png` | `/account/orders` | Customer-owned order cards, status, value, detail link | EXTENDED | Mockup tab treatment is simplified | Item exceptions and edit eligibility | Keep compact mobile card hierarchy |
| `mobile/mockup 6.png` | `/account/orders/[orderId]` | Order items, batch shipment timeline, fulfillment, invoice, exceptions | EXTENDED | Exact timeline illustration differs | Financial adjustments and cancellation request boundary | Keep canonical integrated detail |
| `mobile/mockup 7.png` | `/account/invoices` and detail | Invoice cards, deposit, verified payments, ledger | EXTENDED | Summary charts are not needed | Append-only ledger, allocations, refund obligations | Keep authoritative projections |
| `mobile/mockup 8.png` | `/account` | New account home plus profile/address destinations | EXTENDED | Mockup menu iconography is simplified | Needs-attention, active orders, exceptions, refund due, activity | Complete |

## Admin mockups

| Mockup | Target route | Current implementation | Alignment | Missing visual elements | Newer functionality integrated | Final action |
| --- | --- | --- | --- | --- | --- | --- |
| `admin dashboard 1.png` | `/admin` | Desktop queue dashboard and shared admin navigation | EXTENDED | No invented sales metrics or global search | Admissions, orders, batches, payments, exceptions, invoices | Complete operational home |
| `admin dashboard 2.png` | `/admin/catalogs`, `/admin/books` | Catalog and Book Master tables/forms | EXTENDED | Bulk import/export absent | Publisher, variants, publication, Ready Stock | Keep separate canonical domains |
| `admin dashboard 3.png` | book/catalog creation | Existing catalog and Book Master forms | PARTIAL | Drag/drop gallery and bulk upload absent | ISBN/price per variant and visibility state | Add durable storage only after provider approval |
| `admin dashboard 4.png` | `/admin/batches` and detail | Batch list, roster, purchase summary, assignment, lock, tracking | EXTENDED | Supplier costing automation absent | Partial assignments and exception guards | Complete for V1 operations |
| `admin dashboard 5.png` | `/admin/orders` and detail | Queue, assisted orders, status, tracking, fulfillment, exceptions | EXTENDED | Exact split-pane table treatment differs | Ownership, source, invoice and exception context | Keep current route/detail pattern |
| `admin dashboard 6.png` | `/admin/customers/[customerId]` | Customer profile, addresses, orders, invoices, exceptions | EXTENDED | Deposit tab and global notes are not duplicated | Canonical ownership-safe operations view | Complete bounded V1 view |
| `admin dashboard 7.png` | `/admin/invoices` | Invoice queue/detail and deposit operations | EXTENDED | Blast/export controls absent | Allocations, immutable adjustments, refund obligations | Preserve financial safety |
| `admin dashboard 8.png` | `/admin/payments` | Manual verification queue/history | EXTENDED | Payment-account settings and proof thumbnails absent | Server review transitions and audit | Keep proof reference boundary |
| `admin dashboard 9.png` | reporting | No reporting route | MISSING | Reports, date ranges, charts, Excel export | Reporting-ready canonical records only | Post-V1 Reporting + Excel phase |
| `admin dashboard 10.png` | settings | No settings route | MISSING | Store/payment/notification settings | Existing environment-owned configuration only | Implement only after settings policy approval |

## Decision

The current application keeps the mockups' warm cream, deep green, editorial
serif, restrained cards, dense admin tables, and mobile customer hierarchy.
The QA UX donor contributed visual patterns only; current Convex logic and
Phase 01–06.4 security/financial rules always win.
