# Phase 06.1 — Book Master, Catalog Foundation, and Ready Stock

Status: implementation complete; local validation green

Branch: `feat/catalog-ready-stock-v0.1`

## Product gap audit

| Area | Audit | Evidence / action |
| --- | --- | --- |
| Publishers | EXISTS | Reused `publishers`; admin may create and select records. |
| Book core | PARTIAL → IMPLEMENTED | Extended existing `books` with author, categories, global slug, and publication state. |
| Book variants | PARTIAL → IMPLEMENTED | Reused per-format ISBN/price model; added update and audit. |
| Secret Catalog | EXISTS | Preserved catalogs, items, grants, and hashed-code boundary. New private bundle books use `special`. |
| Publication state | MISSING → IMPLEMENTED | Added draft/published/special/archived and server-side public enforcement. |
| Ready Stock inventory | MISSING → IMPLEMENTED | Added one non-negative quantity record per variant. |
| Public Ready Stock | PARTIAL → IMPLEMENTED | Replaced static placeholder with query-backed browse/search/filter/sort and zero-data state. |
| Book detail | MISSING → IMPLEMENTED | Added `/ready-stock/[slug]` with stocked variants and contact CTA. |
| Admin Book Master | MISSING → IMPLEMENTED | Added `/admin/books` list/create/search/filter and `/admin/books/[bookId]` edit/variant/stock flow. |
| Cover upload | OUT OF SCOPE | Reused cover reference; no storage infrastructure or base64. |
| Ready Stock checkout | BLOCKED BY BUSINESS RULE | `READY_STOCK_ORDER_RECORDING` remains open; no fake checkout. |
| Runtime browser QA | DEFERRED TO STAGING | No transient Preview, staging, or Production work in this phase. |

The original `context/product/PRD.md`, `SCOPE.md`, `BUSINESS_RULES.md`, `UX_FLOWS.md`, `ROUTES.md`, and `context/SOURCE_OF_TRUTH.md` referenced by the assignment are absent from `develop`. The audit therefore uses the Phase 06.1 brief, surviving approved repository decisions, database/security docs, and inspected mockups. The missing original context pack remains a documentation gap and is not reconstructed from guesses.

## Domain implementation

- `books.publicationStatus`: `draft`, `published`, `special`, `archived`.
- `books.slug`: globally unique for the canonical public detail route.
- `bookVariants`: unique ISBN and unique format per book; positive integer IDR price.
- `readyStockInventory`: one row per variant with safe non-negative quantity and authenticated updater.
- Book, publication, variant, and stock mutations write safe audit events.
- Secret-catalog bundle creation reuses Book Master and creates new books as `special`, never public.

## Public and admin behavior

The public query is anonymous and deliberately scoped to published, active, positive-stock data. Search and filtering happen in Convex. Public results contain no catalog ID, access grant, access-code digest, private catalog name, catalog item, or price override.

Book Master is the reusable metadata owner. `/admin/catalogs` remains the private curation/access owner. `/admin/books` owns metadata, publication, formats, prices, and Ready Stock quantity.

## Tests

Focused coverage verifies zero data, published visibility, draft/special/archived isolation, secret-catalog isolation, title/publisher/ISBN search, filters, admin create/update, variant and stock management, audit history, customer denial, negative stock, invalid price, duplicate ISBN, duplicate slug, and missing detail behavior.

Validation evidence: `npm run check` passes with 71 Vitest tests and a complete
Next.js build; `npm run convex:test` passes 44 Convex tests; lint reports zero
warnings; typecheck and `git diff --check` pass.

## Deferred

- Stable-staging Clerk/Convex runtime, browser, responsive, realtime, and log verification.
- Ready Stock order recording, reservation, sold transitions, checkout, and payment integration.
- Durable cover upload/storage.
- Pagination/search-index expansion beyond the documented v0.1 ceiling.
- Production, `main`, and staging infrastructure.
