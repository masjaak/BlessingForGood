# BFG MOCKUP TRACEABILITY MATRIX

Reconciled: 2026-08-15
Visual authority rule: the inspected image is the visual source; the rendered
implementation is compared against its semantic relationships, not against
sample branding/data that conflicts with the active BFG contract.

All assets below are tracked in `public/mockups/` and were opened directly.
The original screen markdown remains the source narrative; the PNG is the
visual evidence. The image samples use “My Bookshelf” text and example records;
those values are illustrative and are not BFG Production data.

| Mockup | Surface | Route | Component | Layout Primitive | Visible Actions | Data State | Responsive State | Production Evidence | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `public/mockups/admin dashboard 1.png` | Admin dashboard | `/admin` | `AdminLayoutShell`, `AdminNav`, admin page | operational shell, metric cards, queues, tables | open queues, inspect activity, customer-side link | loading/empty/populated operational data | desktop-first 1024/1280/1440 | local Playwright Admin suite; supplied baseline | MAPPED / KEEP |
| `public/mockups/admin dashboard 2.png` | Admin catalog | `/admin/books`, `/admin/catalogs` | `AdminBooks`, catalog pages | filters, tabs, table, status badges | create/edit/publish, open detail | loading/empty/populated catalog | desktop table; responsive shell | local product/catalog tests; supplied product baseline | MAPPED / KEEP |
| `public/mockups/admin dashboard 3.png` | Book/catalog upload | `/admin/books/[bookId]` | `AdminBookDetail`, `BookCover`, shared form primitives | stacked form sections, variant rows, upload panel | save metadata/variant, preview and attach cover, publish | draft/edit/upload/error/success | desktop form; mobile-safe page shell | supplied real cover upload/persistence/projection | ADAPTED / KEEP |
| `public/mockups/admin dashboard 4.png` | Batch PO | `/admin/batches`, `/admin/batches/[batchId]` | batch pages, `AdminOperationalPage` | grouped table/detail, stage/status rows | create/link, assign/move, archive, export where current | editable, locked, staged, empty | desktop-first table with responsive containment | local Convex batch/state tests; supplied tracking baseline | MAPPED / KEEP |
| `public/mockups/admin dashboard 5.png` | Orders and tracking | `/admin/orders`, `/admin/orders/[orderId]` | order pages, operational context | filterable table, detail timeline | inspect, assisted order, stage/exception actions | submitted/completed/cancelled/exception | desktop-first; detail remains reachable | supplied real order/Admin projection PASS | ADAPTED / KEEP |
| `public/mockups/admin dashboard 6.png` | Customer detail | `/admin/customers/[customerId]` | customer detail page, workspace links | profile summary, tabs, linked operations | open orders/invoice/deposit/access; update eligible fields | active/suspended/empty history | desktop-first detail | supplied ownership isolation and Admin customer projection | ADAPTED / KEEP |
| `public/mockups/admin dashboard 7.png` | Invoice and deposit queue | `/admin/invoices`, `/admin/deposits` | invoice/deposit pages, operational cards | queue/table, money summaries, status rows | create/issue/void, top-up review, allocation paths | draft/issued/payment/deposit states | desktop-first finance layout | supplied invoice issuance/Tagihan/notification baseline | ADAPTED / KEEP |
| `public/mockups/admin dashboard 8.png` | Payment verification | `/admin/payments` | payment page, private proof projection | review queue, proof panel, action group | inspect proof, start review, approve/reject | submitted/under review/approved/rejected | desktop-first review surface | supplied payment flow baseline; local private-file tests | MAPPED / KEEP |
| `public/mockups/admin dashboard 9.png` | Reports | `/admin/reports` | reports page, `AdminOperationalPage` | filters, metrics, bounded tables, export action | filter period/search, export CSV | empty/populated period | desktop-first analytical surface | local report/export tests; current baseline | ADAPTED / KEEP |
| `public/mockups/admin dashboard 10.png` | Settings | `/admin/settings` | settings page | single-column structured form | save store/contact/payment instructions | loading/empty/saved/error | desktop-first form | local Owner security/settings tests; current baseline | ADAPTED / KEEP |
| `public/mockups/mockup 1.png` | Secret Catalog gateway | `/catalog` | `SiteShell`, `CustomerCatalog`, access guard | branded gateway/card and code field | enter code, sign in only where needed, continue | signed out/code error/unlocked | mobile header + bottom nav | supplied Secret Catalog generate/copy/unlock PASS | ADAPTED / KEEP |
| `public/mockups/mockup 2.png` | Secret Catalog list | `/catalog` | `CustomerCatalog`, `BookCover`, `SiteShell` | product cards, filters, bottom nav | select catalog item, review order | unlocked scoped products; empty/loading | customer mobile 375–430 and desktop | supplied catalog projection/order baseline; 160 Playwright | ADAPTED / KEEP |
| `public/mockups/mockup 3.png` | Book detail/preorder | `/catalog` inline detail | `CustomerCatalog`, shared forms | detail panel, format selector, quantity/review | choose variant, quantity, submit order | valid/invalid quantity, order loading/error/success | inline mobile detail; desktop adapts | supplied real order PASS | ADAPTED / KEEP |
| `public/mockups/mockup 4.png` | Ready Stock detail | `/ready-stock/[slug]` | `ReadyStockDetail`, `BookCover`, `SiteShell` | gallery-shaped detail shell, price/availability | browse and order/account gate | available/reserved/out-of-stock | mobile and desktop detail | supplied Ready Stock/product baseline | ADAPTED / KEEP |
| `public/mockups/mockup 5.png` | Buku Saya/order list | `/account/orders` | account pages, `SiteShell` | status filters, list/timeline summary | open order detail, inspect status | empty/submitted/fulfilled/exception | mobile bottom nav; desktop account | supplied customer projection/ownership baseline | MAPPED / KEEP |
| `public/mockups/mockup 6.png` | Order detail/tracking | `/account/orders/[orderId]` | order detail, tracking/exception components | six-stage tracking/timeline, money summary | inspect, request eligible cancellation, view invoice/exception | stage, payment, exception, error | mobile timeline; desktop account | supplied order/invoice/tracking baseline | MAPPED / KEEP |
| `public/mockups/mockup 7.png` | Tagihan and Deposit | `/account/invoices`, `/account/deposit` | invoice/deposit pages, `Money`, ledger views | invoice list/detail, balance/history | open invoice, submit proof, top-up proof | unpaid/partial/paid, top-up review, ledger | mobile finance surfaces; desktop account | supplied invoice/Tagihan/deposit baseline | ADAPTED / KEEP |
| `public/mockups/mockup 8.png` | Akun and activity entry | `/account`, `/account/profile`, `/account/addresses`, `/account/notifications`, `/account/inbox` | account pages, `WorkspaceActions`, `SiteShell` | account menu, profile/address cards, activity entry | edit profile/address, open activity/inbox, sign out | signed out/admission/active/suspended | logo-only mobile header + bottom nav; desktop coherent header | supplied ownership/notification baseline | MAPPED / KEEP |

## Visual Contract Decisions

- `Logo-1` replaces the sample “My Bookshelf” mark in the active product.
- Sample names, prices, carts, and records are not rendered as Production data.
- Old mockup controls for payment gateway, automated WhatsApp blast, external
  preview metadata, or bulk import are mapped as visual history and classified
  by the source matrix; they are not active actions without a canonical
  backend consequence.
- Skeletons use the same page geometry as the mapped ready state; a generic
  random bar pattern is not a visual pass.
- Every future visual change must point to one row here and include a rendered
  comparison at the supported viewport before closure.
