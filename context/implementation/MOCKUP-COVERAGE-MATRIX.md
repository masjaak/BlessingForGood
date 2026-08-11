# BFG Mockup Coverage Matrix

Date: 2026-08-11
Sources: the 8 customer and 10 admin images under `public/mockups`, current
Production code, and selected visual patterns from
`origin/qa/ux-refinement-v0.1`. Sample mockup data is never seeded.

`EXTENDED` means current capability exceeds the original mockup while retaining
its visual language. `PASS` requires rendered evidence; source inspection alone
cannot earn it.

## Customer mockups

| Mockup | Route | Viewport | Current state | Implementation evidence | Visual verdict | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- |
| `mobile/mockup 1.png` | `/catalog`, `/sign-in` | 390 × 844 | Secure code access and Clerk entry retained | `CustomerCatalog`, branded auth page, signed-out route screenshot | PARTIAL | Authenticated catalog access could not be rendered against canonical Convex |
| `mobile/mockup 2.png` | `/catalog` browse | 390 × 844 | Catalog books, formats, ISBN, quantity and price retained | `CustomerCatalog` source + domain regression | PARTIAL | Authenticated browse state needs runtime screenshot; mockup tabs remain intentionally absent |
| `mobile/mockup 3.png` | `/catalog` selection | 390 × 844 | Variant and quantity selection feeds canonical order submission | `CustomerCatalog` form/action audit | PARTIAL | Authenticated selected/submitted states need runtime screenshot |
| `mobile/mockup 4.png` | `/ready-stock/[slug]` | 390 × 844 | Canonical variants, price and stock detail retained | `ReadyStockDetail`; shared logo/mascot/shell render | EXTENDED | Detail state requires a real published book; zero data is not seeded |
| `mobile/mockup 5.png` | `/account/orders` | 390 × 844 | Owned order cards/statuses retained | `account/orders`; ownership tests | PARTIAL | Authenticated rendered list unavailable locally |
| `mobile/mockup 6.png` | `/account/orders/[orderId]` | 390 × 844 | Batch, tracking, fulfillment, invoice and exceptions integrated | `account/orders/[orderId]`; Phase 06.4 tests | EXTENDED | Authenticated detail screenshot needs a canonical order fixture/user |
| `mobile/mockup 7.png` | `/account/invoices` and detail | 390 × 844 | Invoice, deposit, payment, adjustment and refund projections retained | invoice routes; financial regression | EXTENDED | Authenticated list/detail screenshot unavailable locally |
| `mobile/mockup 8.png` | `/account` | 390 × 844 | Dashboard adds attention, active work, finance and history | `account/page.tsx`; customer activity tests | EXTENDED | Authenticated rendered dashboard unavailable locally |

## Admin mockups

| Mockup | Route | Viewport | Current state | Implementation evidence | Visual verdict | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- |
| `admin dashboard 1.png` | `/admin` | 1440 × 900 | Actionable operational queues retained | Corrected admin topbar render; `admin/page.tsx` | PARTIAL | Canonical Convex provisioning blocks queue render |
| `admin dashboard 2.png` | `/admin/books`, `/admin/catalogs` | 1440 × 900 | Book Master/catalog operations retained | Compact admin table/form CSS; source regression | PARTIAL | Authenticated content render blocked |
| `admin dashboard 3.png` | `/admin/books/[bookId]` | 1440 × 900 | Structured book/variant forms retained | `AdminBookDetail`; form audit | PARTIAL | Real book detail screenshot unavailable; durable upload remains backlog |
| `admin dashboard 4.png` | `/admin/batches` and detail | 1440 × 900 | Batch, roster, purchase, lock and tracking retained | batch routes; 61/61 Convex baseline | PARTIAL | Authenticated detail render requires canonical batch access |
| `admin dashboard 5.png` | `/admin/orders` and detail | 1440 × 900 | Self-service/assisted orders, source and exceptions retained | order routes; source/ownership tests | PARTIAL | Authenticated queue/detail render blocked |
| `admin dashboard 6.png` | `/admin/customers` and detail | 1440 × 900 | Operational customer history retained separately from roles | customer routes; admin authorization tests | PARTIAL | Authenticated customer record render blocked |
| `admin dashboard 7.png` | `/admin/invoices` and detail | 1440 × 900 | Invoice/deposit/adjustment/refund operations retained | invoice routes; financial tests | PARTIAL | Authenticated finance render blocked |
| `admin dashboard 8.png` | `/admin/payments` | 1440 × 900 | Manual review and immutable payment history retained | payment route; payment regression | PARTIAL | Authenticated payment queue render blocked |
| `admin dashboard 9.png` | Reporting | 1440 × 900 | Reporting-ready canonical records only | PRD coverage matrix | FAIL | Reporting and Excel export are post-V1 backlog |
| `admin dashboard 10.png` | Settings / `/admin/users` | 1440 × 900 | Owner-only role and suspension controls retained | users route; owner authorization tests | EXTENDED | Store/settings product remains unapproved backlog |

## Rendered reference evidence

- Public home: 390 × 844 and 1440 × 900 — corrected logo, mascot, typography,
  navigation, hierarchy, CTA, and overflow.
- Community and How to Order: 390 × 844 — corrected shell and branded guidance.
- Admin: 1440 × 900 — corrected topbar/logo/loading shell; route content remains
  explicitly unapproved because canonical provisioning did not complete.
- Final production-build screenshots are written by Playwright to
  `artifacts/browser-qa/`; generated images are not committed.

## Decision

The correction forward-ports visual primitives only. Current Convex logic,
Clerk/RBAC, ownership, and financial history remain authoritative. Missing
authenticated screenshots are an environment blocker, not permission to add
demo data, local persistence, or a non-canonical backend.
