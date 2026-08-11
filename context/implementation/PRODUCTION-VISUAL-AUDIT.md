# BFG Production Visual Audit

Date: 2026-08-11
Branch: `hotfix/production-ui-alignment-v1`
Functional source: current `origin/main`, forward-integrated with the existing `release/production-v1` history because remote `main` still pointed to the prototype merge.
Visual sources: original customer/admin mockups and `origin/qa/ux-refinement-v0.1`.

## Rendered evidence

The audit used local production code at 390 × 844 and 1440 × 900. The original 8 customer and 10 admin mockups were inspected directly. Public pages rendered; authenticated pages reached Clerk but remained at `Menyiapkan akun BFG…` because the canonical Convex development deployment could not be queried by the current CLI identity. No alternate Convex project or deployment was selected.

Current rendered root causes:

- the official logo asset loads, but large transparent bounds make it visibly too small;
- mascot assets load, but the same intrinsic whitespace makes them visually incidental;
- the fixed mobile text navigation overlaps page content and does not match the mockup hierarchy;
- public pages reuse the donor palette but not the mockups' centered mobile brand/navigation composition;
- admin routes inherit the customer shell instead of the mockups' compact operational frame;
- loading states are generic cards and can dominate the complete rendered route;
- the current typography and spacing become oversized on operational screens;
- the QA UX branch supplied useful tokens and primitives, but current Production extended them without a route-level convergence pass.

Legend: `PASS` = rendered and aligned; `PARTIAL` = useful foundation with visible drift; `FAIL` = rendered output is rejected, blocked at loading, or materially diverges. Functional status refers to the inherited tested implementation, not visual approval.

## Route matrix

| Route | Functional status | Current visual status | Mockup reference | QA UX reference | Logo | Mascot | Color | Typography | Hierarchy | Layout | Navigation | Empty state | CTA / button | Responsive | Required correction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | PASS | FAIL | Customer visual language | Home donor | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | FAIL | FAIL | N/A | PARTIAL | FAIL | Make the brand visible, remove overlapping mobile nav, use a mockup-led customer hero and intentional mascot scale. |
| `/community` | PASS | PARTIAL | Customer visual language | Community donor | FAIL | FAIL | PASS | PARTIAL | PARTIAL | PARTIAL | FAIL | N/A | PASS | FAIL | Restore centered mobile brand rhythm and keep the mascot large enough to guide the welcome state. |
| `/how-to-order` | PASS | PARTIAL | Customer flow language | How-to donor | FAIL | FAIL | PASS | PARTIAL | PARTIAL | PARTIAL | FAIL | N/A | PASS | FAIL | Tighten steps, restore product-like mobile flow, and remove bottom-nav overlap. |
| `/help` | PASS | PARTIAL | Extended | Help donor | FAIL | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL | FAIL | N/A | PASS | FAIL | Bring support content into the corrected customer shell and Indonesian product language. |
| `/ready-stock` | PASS | FAIL | Mobile 2 | Ready Stock donor | FAIL | FAIL | PASS | PARTIAL | FAIL | FAIL | FAIL | FAIL | N/A | FAIL | Replace generic loading/zero state, retain filters and search, and adopt the mockup's compact catalog rhythm. |
| `/ready-stock/[slug]` | PASS | FAIL | Mobile 4 | Extended donor | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | FAIL | FAIL | PARTIAL | PASS | FAIL | Use a product-detail composition aligned with the mockup while retaining canonical variants/inventory. |
| `/catalog` | PASS | FAIL | Mobile 1–3 | Catalog donor | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | FAIL | N/A | FAIL | FAIL | FAIL | Render a polished access-code screen after auth and keep all secure catalog behavior. |
| `/join` | PASS | FAIL | Customer visual language | Extended donor | FAIL | FAIL | PASS | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | Replace the dominant generic loading card, preserve form behavior, and use branded success guidance. |
| `/sign-in` | PASS | FAIL | Mobile 1 | Extended | FAIL | N/A | PASS | PARTIAL | FAIL | FAIL | N/A | N/A | FAIL | FAIL | Make the official mark visibly legible and style Clerk within a balanced brand-led auth composition. |
| `/sign-up` | PASS | FAIL | Mobile 1 language | Extended | FAIL | N/A | PASS | PARTIAL | FAIL | FAIL | N/A | N/A | FAIL | FAIL | Match sign-in treatment and retain Clerk security. |
| `/account` | PASS | FAIL | Mobile 8, extended dashboard | None | FAIL | FAIL | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Keep dashboard/history logic but replace SaaS KPI composition with attention, progress, finance, and activity hierarchy. |
| `/account/orders` | PASS | FAIL | Mobile 5 | Orders donor | FAIL | FAIL | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Use compact book rows/status filters and a useful branded zero state. |
| `/account/orders/[orderId]` | PASS | FAIL | Mobile 6 | Extended | FAIL | PARTIAL | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | Present item, batch, tracking, invoice, exception, and history as one customer-safe story. |
| `/account/invoices` | PASS | FAIL | Mobile 7 | Invoice donor | FAIL | FAIL | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Prioritize outstanding amount, deposit, payment state, and refund obligation. |
| `/account/invoices/[invoiceId]` | PASS | FAIL | Mobile 7 extended | Extended | FAIL | PARTIAL | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | Preserve backend projections and create a clear payment/adjustment detail hierarchy. |
| `/account/profile` | PASS | FAIL | Mobile 8 | Extended | FAIL | PARTIAL | PARTIAL | PARTIAL | FAIL | FAIL | FAIL | N/A | PARTIAL | FAIL | Align fields, feedback, and account navigation with the customer system. |
| `/account/addresses` | PASS | FAIL | Mobile 8 extended | Extended | FAIL | PARTIAL | PARTIAL | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Use compact address cards/forms and branded empty guidance. |
| `/admin` | PASS | FAIL | Admin 1 | Admin donor | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Replace customer header/footer with a persistent operational shell and compact queue hierarchy. |
| `/admin/books` | PASS | FAIL | Admin 2 | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Adopt dense catalog table/filter patterns without changing Book Master logic. |
| `/admin/books/[bookId]` | PASS | FAIL | Admin 3 | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | N/A | PARTIAL | FAIL | Use the mockup's structured book/variant form hierarchy. |
| `/admin/catalogs` | PASS | FAIL | Admin 2–3 language | Admin donor | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Keep secure code management while clarifying catalog state and actions. |
| `/admin/join-requests` | PASS | FAIL | Admin operational language | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Create a compact admission queue with explicit lifecycle/actions. |
| `/admin/orders` | PASS | FAIL | Admin 5 | Orders donor | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Preserve assisted/self-service orders and adopt the mockup's dense queue/detail pattern. |
| `/admin/orders/[orderId]` | PASS | FAIL | Admin 5 extended | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | Consolidate order, assignment, invoice, and exception actions in an operational detail view. |
| `/admin/batches` | PASS | FAIL | Admin 4 | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Use compact batch filters/table while preserving lock and roster behavior. |
| `/admin/batches/[batchId]` | PASS | FAIL | Admin 4 extended | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | Structure summary, roster, purchase totals, lock, and tracking without customer-scale headings. |
| `/admin/invoices` | PASS | FAIL | Admin 7 | Invoice donor | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Use a dense finance queue driven by authoritative projections. |
| `/admin/invoices/[invoiceId]` | PASS | FAIL | Admin 7 extended | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | Separate issued history, adjustments, allocations, payments, and obligations visually. |
| `/admin/payments` | PASS | FAIL | Admin 8 | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Make review status/actions immediately scannable without financial toggles. |
| `/admin/exceptions` | PASS | FAIL | Admin operational language | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Build a dense OOS/defect/cancellation queue with resolution and financial effect hierarchy. |
| `/admin/customers` | PASS | FAIL | Admin 6 | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Use customer operations table and keep role management separate. |
| `/admin/customers/[customerId]` | PASS | FAIL | Admin 6 | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | PARTIAL | PARTIAL | FAIL | Present profile, orders, invoices, deposit, exceptions, and activity in one operational record. |
| `/admin/users` | PASS | FAIL | Admin 10 language | Extended | FAIL | N/A | PARTIAL | FAIL | FAIL | FAIL | FAIL | FAIL | PARTIAL | FAIL | Keep owner-only identity/role/suspension controls in the corrected admin shell. |

## Feature preservation classification

| Capability group | Classification | Evidence |
| --- | --- | --- |
| Clerk, appUsers, RBAC, suspension, ownership | PRESERVED | Current server authorization and route guards retained; auth/ownership tests are green. |
| Join requests and review | VISUAL ONLY CHANGED | Convex mutations and lifecycle remain the source of truth. |
| Book Master, publishers, variants, ISBN, pricing, publication | VISUAL ONLY CHANGED | Existing admin components and Convex functions remain intact. |
| Ready Stock search, filters, sorting, detail, inventory | VISUAL ONLY CHANGED | Existing server-backed queries/components remain intact. |
| Secret Catalog codes and grants | VISUAL ONLY CHANGED | Existing Clerk identity and Convex grant flow remain intact. |
| Orders, assisted orders, Batch PO, roster, locking, tracking | VISUAL ONLY CHANGED | Existing domain operations and state transitions remain intact. |
| Invoices, deposits, allocations, payments | VISUAL ONLY CHANGED | No financial mutation or arithmetic change is required for this correction. |
| OOS, defect, cancellations, adjustments, refund obligations | VISUAL ONLY CHANGED | Phase 06.4 domain and tests remain intact. |
| Profile, addresses, dashboard, customer/admin history | VISUAL ONLY CHANGED | Existing queries and derived history remain intact. |

## Audit constraints

- No QA UX branch merge.
- No browser-local business persistence.
- No alternate Convex project or deployment.
- No seeded business data for screenshots.
- Reporting, Excel export, analytics, content management, and settings remain visible PRD backlog rather than visual placeholders.

## Post-correction result

The matrix above records the rejected pre-correction state. The optimized
Production build was then rendered at 375, 390, 430, 768, and 1440 customer
widths plus 1024, 1280, and 1440 protected admin widths.

| Area | Final rendered result | Evidence |
| --- | --- | --- |
| Global customer shell | PASS | Official logo, desktop navigation, native mobile menu, account entry and footer rendered without overflow |
| Home | PASS | 390 and 1440 screenshots; BFG hierarchy and mascot restored |
| Community | PASS | 390 screenshot plus targeted 768/1440 overflow retest |
| How to Order | PASS | 390 screenshot; current product flow and guidance |
| Ready Stock zero state | PASS | 390 screenshot; server controls and official mascot |
| Join | PASS | 390 screenshot; complete branded form and translated copy |
| Sign-in / protected redirects | PASS | Official logo and Clerk entry render; development-key notice is environment-owned |
| Secret Catalog authenticated states | BLOCKED | Clerk instance mismatch and canonical Convex provisioning failure |
| Account authenticated states | BLOCKED | Same environment chain; no fake customer or local store used |
| Admin shell | PASS | Authenticated owner screenshot shows corrected topbar/logo/loading treatment |
| Admin operational content | BLOCKED | Canonical provisioning never advances beyond the loading guard |

Detailed screenshot verdicts and corrections are in
`context/implementation/PRODUCTION-SCREENSHOT-REVIEW.md`.
