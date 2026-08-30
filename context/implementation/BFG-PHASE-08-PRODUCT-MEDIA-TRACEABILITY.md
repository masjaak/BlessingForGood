# BFG PHASE 08 PRODUCT MEDIA TRACEABILITY

Status: `PRODUCTION_DEPLOYED — ADAPTIVE_COVER_GEOMETRY_CLOSED — AUTHENTICATED_REAL_COVER_UAT_PENDING`
Reconciled: 2026-08-21 (Asia/Jakarta)

## Cover geometry addendum — 2026-08-30

- Fixed-frame letterboxing was isolated to the shared `.book-cover` CSS
  wrapper: `aspect-ratio: 2 / 3` plus `height: 100%` around `contain` artwork.
  The wrapper now follows the intrinsic image ratio; normal-flow images use
  `width: 100%; height: auto`, and `align-self: start` prevents row stretching.
- Owner chain: `BookCover` in `src/components/book-cover.tsx` → `.book-cover`
  and `.book-cover > img` in `src/app/globals.css` → `CoverUploadField` Admin
  preview, Secret Catalog/Ready Stock detail, and Catalog/Ready Stock cards.
  The image-backed surfaces share natural geometry; no explicit mode API was
  needed. The empty/error fallback alone retains a 2:3 placeholder shape.
- The five-shape geometry fixture matrix (200x300, 684x937, 600x1000,
  800x800, 1200x700) passes at 390/768/1440 with zero measured content gaps
  within border tolerance. ProductGallery, thumbnail sizing, upload, storage,
  schema, projections, authorization, and business logic are unchanged.
- Behavior commit `0b6d728` is live through the Git-integrated Vercel
  Production release; GitHub's completed deployment target is
  `https://vercel.com/masjaaks-projects/blessing-for-good/FTE6XgijmQtS1cWLVQuxz3yQv1hn`.
  Authenticated Admin/Customer real-cover UAT remains pending for lack of an
  authorized Clerk session and approved live fixture.

## Rendering addendum — 2026-08-30

- `src/components/book-cover.tsx` is the shared Book Cover image owner. The
  previous default was contained rendering inside the existing fixed frame;
  that image-backed frame geometry is now superseded by the cover-geometry
  addendum above;
  legacy `coverPresentation` remains compatibility data and no longer changes
  the image transform. `CoverUploadField` exposes no manual framing controls.
- `src/components/product-gallery.tsx` retains the existing gallery interaction
  while `.product-gallery-thumbnails` uses normalized image height and
  intrinsic-ratio widths bounded by the existing cover maximum. This removes
  the equal-width landscape shell that made portrait images look too small.
- The local portrait/square/landscape matrix passes at 390/768/1440 and the
  public customer surface check passes 9/9 at 390px. No upload, storage,
  schema, projection, authorization, or business logic changed. No separate
  Convex command was issued; the existing Git-integrated Vercel build remains
  coupled to its configured `convex deploy` command.

| Requirement | Source trace | Current implementation | Decision/status |
| --- | --- | --- | --- |
| Public Ready Stock detail gallery | Original scope, Ready Stock rules, public Ready Stock feature, Ready Stock detail screen | `bookMedia` projection from `readyStock.getBySlug`; contained shared gallery with intrinsic-ratio thumbnails and previous/next controls | `GREEN_DETERMINISTIC` |
| Separate cover and gallery | Admin upload mockup 3 | `books.coverStorageId` remains separate from `bookMedia`; gallery never promotes or replaces cover | `GREEN_DETERMINISTIC` |
| Gallery max count | Admin mockup 3 says `Maks. 8 gambar` | Server rejects the ninth item; Admin displays `n/8` | `GREEN_DETERMINISTIC` |
| Gallery ownership | Latest user decision; Book Master recommendation | `bookMedia.bookId`; no Ready Stock listing media entity | `LOCKED: BOOK MASTER` |
| Book vs variant override | Latest user decision and Book/format model | Variants retain ISBN/price/availability only | `NOT IN V1` |
| Deterministic ordering | Original `displayOrder`; swipeable gallery source | `bookMedia.displayOrder`; move-up/down mutation and persisted query order | `GREEN_DETERMINISTIC` |
| Upload validation | File Upload source; current cover flow; SEC-12 | Existing Convex storage URL flow; JPG/PNG/WebP; 5 MB; Admin permission; duplicate/cross-reference guards | `GREEN_DETERMINISTIC` |
| Delete/reorder | Admin mockup actions and candidate acceptance | Authorized remove with safe storage cleanup; authorized move up/down; append-only audit | `GREEN_DETERMINISTIC` |
| External preview fields | Admin/customer mockup preview controls; latest user decision | One optional label + HTTPS URL on Book Master; Admin uses explicit label/control/support rows so paired controls align; no fetch, scrape, embed, or hotlink | `GREEN_PRODUCTION_UI` |
| External URL security | Security invariants and latest user decision | Server rejects unsafe schemes, credentials, local/private destinations, and >2,048 characters | `GREEN_DETERMINISTIC` |
| Ready Stock projection | Ready Stock source | Customer-safe URLs, alt text, and preview metadata; no storage IDs/private data | `GREEN_DETERMINISTIC` |
| Secret Catalog projection | Source contract does not resolve V1 projection | Existing Catalog projection remains cover-only | `NOT IN V1` |
| Authorization | SEC-05, SEC-06, current `books.manage` boundary | All media mutations use existing Admin/Owner permission; customer Admin query denied | `GREEN_DETERMINISTIC` |
| Audit | SEC-14, current `recordAudit` | Add/remove/reorder/external-preview actions record safe target metadata | `GREEN_DETERMINISTIC` |
| Customer safety | SEC-07/08/09/11/12; source projections | Public projection omits storage IDs and internal media records | `GREEN_DETERMINISTIC` |
| Responsive Admin | Visual system and Admin mockup | Media section extends Book Detail; shared contained gallery; External Preview uses two columns at desktop and stacks at 768/834; no new route | `GREEN_PRODUCTION_UI` — supplied authenticated Book Detail evidence; local responsive checks pass |
| Responsive Customer | Visual system and mobile mockup 4 | Ready Stock detail uses shared contained gallery and responsive controls | `GREEN_DETERMINISTIC` — canonical public suite `24/24` |
| Real Production UAT | Product Media source contract | Supplied authenticated Production screenshot verifies the legitimate Book Detail media surface and the corrected External Preview composition; no approved image asset or real preview URL was used for mutation | `GREEN_PRODUCTION_EVIDENCE — NO_MUTATION_PERFORMED` |

## End-to-end trace

`source → /admin/books/[bookId] → Book Detail media section →
bookMedia/books mutations → Convex storage + authorization + audit →
readyStock.getBySlug customer projection → ProductGallery → Vitest/Convex
tests → Production deployment → one legitimate-book UAT`

## Verdict

The two source decisions are locked and implementation is Production-deployed.
The supplied authenticated Admin screenshot is the current real-flow evidence;
the final External Preview geometry correction is closed. No safe real-book
media mutation was needed for this presentation-only task.
