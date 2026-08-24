# BFG Mockup Coverage Matrix

Date: 2026-08-24
Sources: the 8 customer and 10 admin images under `public/mockups`, current
Production code, and selected visual patterns from
`origin/qa/ux-refinement-v0.1`. Sample mockup data is never seeded.

V3.1 supersedes the earlier customer access interpretation in this historical
matrix: `/catalog` is a public token gateway, while `/account`,
`/account/orders`, and `/account/invoices` render intentional signed-out
states before any Clerk entry. The current rendered evidence and verdicts are
maintained in `CUSTOMER-MOCKUP-COVERAGE.md`.

`EXTENDED` means current capability exceeds the original mockup while retaining
its visual language. `PASS` requires rendered evidence; source inspection alone
cannot earn it.

## Client UAT Round 2 mobile trace

The eight supplied files under `public/mockups/mobile/` were opened directly on
2026-08-24. The verdict below is structural and visual; it does not treat
mockup sample data as production data. `MATCH` means the current route keeps the
same information order, shell, and primary action. `PARTIAL` means the route is
canonical but intentionally differs in composition or is missing an approved
fixture for rendered authenticated evidence. No route was fabricated to force a
match.

| Mockup | Route/state | Verdict | Evidence / remaining gap |
| --- | --- | --- | --- |
| 1 | `/catalog` access + `/sign-in` | PARTIAL | Private access and dedicated invite-only auth are present; the mockup combines credentials and monthly-code entry in one screen, while BFG keeps those security boundaries separate. |
| 2 | `/catalog` list | PARTIAL | Catalog list, publisher/format choices, quantity, price, and five-item mobile nav are present; Ready Stock is a separate canonical route and no cart or unapproved sample cargo is fabricated. |
| 3 | `/catalog` selection | PARTIAL | Variant selection, ISBN, price, cover, quantity, and canonical preorder action are present; the current route uses a list/summary composition rather than a separate mockup-style detail screen. |
| 4 | `/ready-stock/[slug]` | PARTIAL | Shared gallery, cover, availability, price, and stock-backed order path are present; populated authenticated render evidence requires an approved real product. |
| 5 | `/account/orders` | PARTIAL | Owned order list, status, quantity, price, and tracking links are present; the current list does not reproduce every mockup filter/tab and no customer fixture is seeded. |
| 6 | `/account/orders/[orderId]` | PARTIAL | Canonical order detail, invoice context, exceptions, fulfillment, and tracking are present; the mockup’s exact six-step populated timeline needs an approved order fixture for rendered comparison. |
| 7 | `/account/invoices` + `/account/deposit` | PARTIAL | Invoice, deposit, payment, adjustment, and refund projections are canonical; BFG keeps invoice and deposit as separate routes instead of merging financial navigation into one screen. |
| 8 | `/account` | PARTIAL | Account identity, catalog access, history, support, and Activity entry are present; the mockup’s full menu is a visual reference and not every sample support destination is an approved product route. |

This round’s rendered browser evidence remains signed-out/local unless the
canonical Clerk Production credentials and approved business fixtures are
available. The deterministic viewport matrix covers 375, 390, 430, 768, 834,
1024, 1280, and 1440; authenticated Production screenshot claims remain
blocked by external access rather than hidden behind a generic “responsive
passed” label.

## Customer mockups

| Mockup                | Route                          | Viewport  | Current state                                                         | Implementation evidence                                           | Visual verdict | Remaining gap                                                        |
| --------------------- | ------------------------------ | --------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| `mobile/mockup 1.png` | `/catalog`, `/sign-in`         | 390 × 844 | Public secure-code gateway and dedicated BFG auth retained            | `CustomerCatalog`, branded auth page, production-mode screenshots | PASS           | A real code is intentionally not redeemed during QA                  |
| `mobile/mockup 2.png` | `/catalog` browse              | 390 × 844 | Catalog books, formats, ISBN, quantity and price retained             | `CustomerCatalog` source + Convex token-session regression        | EXTENDED       | Browse requires an authentic admin-issued code; no fixture is seeded |
| `mobile/mockup 3.png` | `/catalog` selection           | 390 × 844 | Variant and quantity selection feeds canonical order submission       | `CustomerCatalog` form/action audit                               | PARTIAL        | Authenticated selected/submitted states need runtime screenshot      |
| `mobile/mockup 4.png` | `/ready-stock/[slug]`          | 390 × 844 | Canonical variants, price and stock detail retained                   | `ReadyStockDetail`; shared logo/mascot/shell render               | EXTENDED       | Detail state requires a real published book; zero data is not seeded |
| `mobile/mockup 5.png` | `/account/orders`              | 390 × 844 | Owned order cards/statuses retained                                   | `account/orders`; ownership tests                                 | PARTIAL        | Authenticated rendered list unavailable locally                      |
| `mobile/mockup 6.png` | `/account/orders/[orderId]`    | 390 × 844 | Batch, tracking, fulfillment, invoice and exceptions integrated       | `account/orders/[orderId]`; Phase 06.4 tests                      | EXTENDED       | Authenticated detail screenshot needs a canonical order fixture/user |
| `mobile/mockup 7.png` | `/account/invoices` and detail | 390 × 844 | Invoice, deposit, payment, adjustment and refund projections retained | invoice routes; financial regression                              | EXTENDED       | Authenticated list/detail screenshot unavailable locally             |
| `mobile/mockup 8.png` | `/account`                     | 390 × 844 | Dashboard adds attention, active work, finance and history            | `account/page.tsx`; customer activity tests                       | EXTENDED       | Authenticated rendered dashboard unavailable locally                 |

## Admin mockups

| Mockup                   | Route                             | Viewport   | Current state                                                | Implementation evidence                         | Visual verdict | Remaining gap                                                           |
| ------------------------ | --------------------------------- | ---------- | ------------------------------------------------------------ | ----------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `admin dashboard 1.png`  | `/admin`                          | 1440 × 900 | Actionable operational queues retained                       | Corrected admin topbar render; `admin/page.tsx` | PARTIAL        | Canonical Convex provisioning blocks queue render                       |
| `admin dashboard 2.png`  | `/admin/books`, `/admin/catalogs` | 1440 × 900 | Book Master/catalog operations retained                      | Compact admin table/form CSS; source regression | PARTIAL        | Authenticated content render blocked                                    |
| `admin dashboard 3.png`  | `/admin/books/[bookId]`           | 1440 × 900 | Structured book/variant forms retained                       | `AdminBookDetail`; form audit                   | PARTIAL        | Real book detail screenshot unavailable; durable upload remains backlog |
| `admin dashboard 4.png`  | `/admin/batches` and detail       | 1440 × 900 | Batch, roster, purchase, lock and tracking retained          | batch routes; 61/61 Convex baseline             | PARTIAL        | Authenticated detail render requires canonical batch access             |
| `admin dashboard 5.png`  | `/admin/orders` and detail        | 1440 × 900 | Self-service/assisted orders, source and exceptions retained | order routes; source/ownership tests            | PARTIAL        | Authenticated queue/detail render blocked                               |
| `admin dashboard 6.png`  | `/admin/customers` and detail     | 1440 × 900 | Operational customer history retained separately from roles  | customer routes; admin authorization tests      | PARTIAL        | Authenticated customer record render blocked                            |
| `admin dashboard 7.png`  | `/admin/invoices` and detail      | 1440 × 900 | Invoice/deposit/adjustment/refund operations retained        | invoice routes; financial tests                 | PARTIAL        | Authenticated finance render blocked                                    |
| `admin dashboard 8.png`  | `/admin/payments`                 | 1440 × 900 | Manual review and immutable payment history retained         | payment route; payment regression               | PARTIAL        | Authenticated payment queue render blocked                              |
| `admin dashboard 9.png`  | Reporting                         | 1440 × 900 | Reporting-ready canonical records only                       | PRD coverage matrix                             | FAIL           | Reporting and Excel export are post-V1 backlog                          |
| `admin dashboard 10.png` | Settings / `/admin/users`         | 1440 × 900 | Owner-only role and suspension controls retained             | users route; owner authorization tests          | EXTENDED       | Store/settings product remains unapproved backlog                       |

## Rendered reference evidence

- Public home: 390 × 844 and 1440 × 900 — corrected logo, mascot, typography,
  navigation, hierarchy, CTA, and overflow.
- Community and How to Order: 390 × 844 — corrected shell and branded guidance.
- Admin: 1440 × 900 — corrected topbar/logo/loading shell; route content remains
  explicitly unapproved because canonical provisioning did not complete.
- Final production-build screenshots are written by Playwright to
  `artifacts/browser-qa/`; generated images are not committed.

## Decision

The correction forward-ports the approved customer presentation and the
smallest compatible catalog-session path. Current Convex logic, Clerk/RBAC,
ownership, and financial history remain authoritative. Missing authenticated
fixtures are not permission to add demo data, local persistence, or a
non-canonical backend.
