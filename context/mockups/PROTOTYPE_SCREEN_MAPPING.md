# Prototype Screen Mapping

Physical references are now committed under `public/mockups/`. The numbered files retain their source names. The visual labels below are based on direct inspection; sample content inside the screenshots is reference-only and is not seeded into the zero-data prototype.

## Customer references

| Mockup | Visual structure | Prototype route/area | Status | Confidence |
| --- | --- | --- | --- | --- |
| `mockup 1.png` | Private monthly catalog access, code field, deadline, primary unlock action | `/catalog` access state | confirmed | high |
| `mockup 2.png` | Catalog list, Pre-Order/Ready Stock tabs, publisher/cargo filters, bottom navigation | `/catalog` list | confirmed | high |
| `mockup 3.png` | Book detail, cover area, BB/PB/HB selector, ISBN/price/deadline, primary order action | `/catalog` detail and format selection | confirmed | high |
| `mockup 4.png` | Ready-stock detail and availability/price CTA | `/ready-stock` | confirmed | high |
| `mockup 5.png` | Customer order list with status filters and order cards | `/account/orders` | confirmed | high |
| `mockup 6.png` | Order detail with vertical shipment/status timeline | order detail/tracking area | confirmed | high |
| `mockup 7.png` | Invoice, deposit balance, active invoices, deposit history | `/account/invoices` | confirmed | high |
| `mockup 8.png` | Account/profile menu and support links | `/account` conceptual area | confirmed | medium |

## Admin references

| Mockup | Visual structure | Prototype route/area | Status | Confidence |
| --- | --- | --- | --- | --- |
| `admin dashboard 1.png` | Overview metrics, activity, progress, cargo summary, quick actions | `/admin` | confirmed | high |
| `admin dashboard 2.png` | Catalog table with search, filters, formats, deadline, status, row actions | `/admin/catalogs` | confirmed | high |
| `admin dashboard 3.png` | Catalog upload form, book data, format/price rows, visibility settings | catalog creation flow | confirmed | medium |
| `admin dashboard 4.png` | Batch PO list and expanded cargo/publisher detail | admin catalog/order operations | confirmed | medium |
| `admin dashboard 5.png` | Order table, filters, status progress, expanded tracking update | `/admin/orders` | confirmed | high |
| `admin dashboard 6.png` | Customer profile, order list, and order timeline/detail panel | customer/order detail concept | confirmed | medium |
| `admin dashboard 7.png` | Invoice list, deposit movement, payment verification | `/admin/invoices` | confirmed | high |
| `admin dashboard 8.png` | Payment verification queue and destination accounts | payment operations concept | confirmed | medium |
| `admin dashboard 9.png` | Report metrics, trend chart, status distribution, top customers | reporting concept; no dummy data allowed | confirmed | medium |
| `admin dashboard 10.png` | Store, contact, catalog access, invoice, payment, and notification settings | settings concept; no route currently implemented | confirmed | medium |

## Six anchor areas

| Anchor | Reference coverage | Current implementation coverage |
| --- | --- | --- |
| Welcome/Home | mascot, warm entry, clear CTAs | `/` |
| Secret access and catalog list | mockups 1–2 | `/catalog` |
| Book detail and format selection | mockup 3 | `/catalog` interaction |
| Order review, detail, and tracking | mockups 5–6 | `/catalog` order flow and account/admin status surfaces |
| Admin dashboard | admin mockup 1 | `/admin` |
| Catalog and order management | admin mockups 2 and 5 | `/admin/catalogs`, `/admin/orders` |

## Interpretation boundaries

- The screenshots use a different reference name and sample business records. They guide hierarchy, density, and interaction patterns only.
- Routes that do not exist in the prototype remain unmapped; no dead links or placeholder screens are introduced to imitate them.
- Financial, order, and catalog values shown in mockups are never copied into runtime state.
