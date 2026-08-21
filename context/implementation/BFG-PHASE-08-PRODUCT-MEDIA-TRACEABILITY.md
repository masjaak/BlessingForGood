# BFG PHASE 08 PRODUCT MEDIA TRACEABILITY

Status: `IMPLEMENTED_LOCALLY — PRODUCTION_DEPLOYMENT_AND_UAT_PENDING`
Reconciled: 2026-08-21 (Asia/Jakarta)

| Requirement | Source trace | Current implementation | Decision/status |
| --- | --- | --- | --- |
| Public Ready Stock detail gallery | Original scope, Ready Stock rules, public Ready Stock feature, Ready Stock detail screen | `bookMedia` projection from `readyStock.getBySlug`; contained shared gallery with thumbnails and previous/next controls | `GREEN_DETERMINISTIC` |
| Separate cover and gallery | Admin upload mockup 3 | `books.coverStorageId` remains separate from `bookMedia`; gallery never promotes or replaces cover | `GREEN_DETERMINISTIC` |
| Gallery max count | Admin mockup 3 says `Maks. 8 gambar` | Server rejects the ninth item; Admin displays `n/8` | `GREEN_DETERMINISTIC` |
| Gallery ownership | Latest user decision; Book Master recommendation | `bookMedia.bookId`; no Ready Stock listing media entity | `LOCKED: BOOK MASTER` |
| Book vs variant override | Latest user decision and Book/format model | Variants retain ISBN/price/availability only | `NOT IN V1` |
| Deterministic ordering | Original `displayOrder`; swipeable gallery source | `bookMedia.displayOrder`; move-up/down mutation and persisted query order | `GREEN_DETERMINISTIC` |
| Upload validation | File Upload source; current cover flow; SEC-12 | Existing Convex storage URL flow; JPG/PNG/WebP; 5 MB; Admin permission; duplicate/cross-reference guards | `GREEN_DETERMINISTIC` |
| Delete/reorder | Admin mockup actions and candidate acceptance | Authorized remove with safe storage cleanup; authorized move up/down; append-only audit | `GREEN_DETERMINISTIC` |
| External preview fields | Admin/customer mockup preview controls; latest user decision | One optional label + HTTPS URL on Book Master; no fetch, scrape, embed, or hotlink | `GREEN_DETERMINISTIC` |
| External URL security | Security invariants and latest user decision | Server rejects unsafe schemes, credentials, local/private destinations, and >2,048 characters | `GREEN_DETERMINISTIC` |
| Ready Stock projection | Ready Stock source | Customer-safe URLs, alt text, and preview metadata; no storage IDs/private data | `GREEN_DETERMINISTIC` |
| Secret Catalog projection | Source contract does not resolve V1 projection | Existing Catalog projection remains cover-only | `NOT IN V1` |
| Authorization | SEC-05, SEC-06, current `books.manage` boundary | All media mutations use existing Admin/Owner permission; customer Admin query denied | `GREEN_DETERMINISTIC` |
| Audit | SEC-14, current `recordAudit` | Add/remove/reorder/external-preview actions record safe target metadata | `GREEN_DETERMINISTIC` |
| Customer safety | SEC-07/08/09/11/12; source projections | Public projection omits storage IDs and internal media records | `GREEN_DETERMINISTIC` |
| Responsive Admin | Visual system and Admin mockup | Media section extends Book Detail; shared contained gallery; no new route | `LOCAL_RENDER_PENDING` |
| Responsive Customer | Visual system and mobile mockup 4 | Ready Stock detail uses shared contained gallery and responsive controls | `LOCAL_RENDER_PENDING` |
| Real Production UAT | Product Media source contract | Requires one legitimate existing book; no dummy record created | `BLOCKED_EXTERNAL until authenticated UAT` |

## End-to-end trace

`source → /admin/books/[bookId] → Book Detail media section →
bookMedia/books mutations → Convex storage + authorization + audit →
readyStock.getBySlug customer projection → ProductGallery → Vitest/Convex
tests → Production deployment → one legitimate-book UAT`

## Verdict

The two source decisions are locked and implementation is locally complete.
Production deployment and authenticated real-book acceptance remain explicit
delivery gates; they are not represented as green until evidence exists.
