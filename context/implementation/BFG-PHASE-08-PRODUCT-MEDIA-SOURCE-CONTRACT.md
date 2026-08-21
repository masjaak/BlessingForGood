# BFG PHASE 08 PRODUCT MEDIA SOURCE CONTRACT

Status: `DECISIONS_LOCKED — IMPLEMENTED; READY STOCK PROJECTION IN V1`
Reconciled: 2026-08-20 (Asia/Jakarta)

This contract records the source-backed Product Gallery / External Preview
implementation. The latest user decision locks Book Master ownership and an
optional HTTPS metadata-only external preview link; Secret Catalog gallery
projection remains outside V1 until separately source-approved.

## Objective

Give BFG a durable, customer-safe product-media presentation that preserves the
existing full-cover behavior and, where the source permits, adds a bounded
ordered gallery and safe external preview links.

## Business Problem

The current product model has one durable Book Master cover. The original BFG
scope requires a Ready Stock detail gallery, while the supplied Admin upload
mockup shows additional gallery images and external preview controls. The
current Convex model does not yet define the ownership, projection, or URL
policy needed to implement those controls safely.

## Source Documents

- Original `context/product/SCOPE.md`: public Ready Stock catalog and detail
  gallery.
- Original `context/product/BUSINESS_RULES.md`: Ready Stock supports multiple
  swipeable images; Book owns title metadata and format owns ISBN/price.
- Original `context/catalog/READY_STOCK_RULES.md`: each listing supports
  multiple images.
- Original `context/database/SCHEMA.md`: `readyStockMedia` belongs to a
  `readyStockListings` record and stores `fileId`, `displayOrder`, and
  `altText`.
- Original `context/features/public-ready-stock.md` and
  `context/screens/mobile/10-ready-stock-detail.md`: public detail reads a
  gallery.
- Supplied `public/mockups/admin/admin dashboard 3.png`: separate required
  cover and `Galeri Gambar (Maks. 8 gambar)` controls, plus Amazon, Instagram,
  and YouTube preview fields.
- Supplied `public/mockups/mobile/mockup 4.png`: Ready Stock detail uses one
  primary image, navigation controls, and thumbnails.
- Current `context/SOURCE_OF_TRUTH.md`: Book Master currently owns one durable
  cover; multi-image gallery and external preview are future candidates.
- Current `context/implementation/BFG-PHASE-08-CANDIDATES.md`: this is a
  separate P1 candidate requiring a storage/access/ordering/retention/schema
  contract.
- Current `context/implementation/BFG-VISUAL-SYSTEM.md`: reuse `BookCover`,
  Convex storage, the existing BFG visual grammar, and customer-safe
  projections.

## User Role

Admin/Owner manages media. Customers and public visitors consume only the
customer-safe projection allowed by the final ownership and visibility
decision. No customer uploads are implied.

## Current Cover System

Book Master stores either a validated durable Convex storage reference
(`coverStorageId`) or the legacy cover URL boundary. Admin uses
`generateCoverUploadUrl` → validated storage upload → `attachCover`; the
existing cover validation is JPG/PNG/WebP up to 5 MB. Customer projections
resolve only the public-safe URL. The full artwork must remain visible with
contained rendering.

## Gallery Definition

Gallery means additional BFG-managed product images shown as an ordered,
swipeable/thumbnail-supported product detail experience. The cover remains the
primary identity image and is not silently duplicated as an additional gallery
record.

The supplied Admin visual source sets V1 to a maximum of eight additional
gallery images.

## Gallery Ownership

`LOCKED: Book Master` — one reusable gallery for the Book identity. V1 has no
variant-specific override and does not create a separate Ready Stock listing
media boundary.

## Variant Relationship

Gallery media is Book-level and variants do not override it in V1. ISBN, price,
stock, and catalog price remain variant/listing concerns.

## Maximum Media Count

V1 permits up to eight additional Book Master gallery images. The cover is not
counted as a gallery item.

## Media Ordering

V1 uses one persisted `bookMedia.displayOrder` field and small move-up/move-down
actions; there is no second independently editable order list.

## Primary Cover Relationship

The existing Book Master cover remains the primary product identity image.
Gallery upload must not replace, delete, or implicitly promote a gallery image
to cover. The source does not define a “make primary” action; none is included
in the implementation entry gate.

## Upload

Reuse the existing Convex upload URL, storage validation, ownership boundary,
and accessible upload presentation. Do not add a second media backend, CDN,
CMS, or parser. The final contract must define whether gallery files use the
existing 5 MB JPG/PNG/WebP cover limit or a separate source-approved limit.

## Validation

At minimum, the server must validate Admin permission, storage ownership,
JPG/PNG/WebP MIME, size, reference ownership, count, order, and entity state.
Client validation is reachability UX only. Invalid MIME, oversize, duplicate
reference, cross-entity reference, and closed/archived target cases must be
denied server-side.

## Delete

V1 uses: authorize → remove the canonical reference → delete the storage object
only when no other gallery or cover reference uses it. Deleting a gallery image
never deletes the cover or Book entity.

## Reorder

V1 reorders with the smallest existing interaction: move up/down buttons. No
drag-and-drop dependency is used.

## External Preview Definition

The Admin mockup shows optional links labelled Preview Amazon, Preview
Instagram, and Preview YouTube; the customer mockup shows the same preview
destinations. The original product narrative does not define the authoritative
platform allowlist, whether these are per Book or per variant, or whether any
remote image/metadata is fetched.

`LOCKED: optional HTTPS metadata-only link` — V1 stores a label and HTTPS URL
only. BFG never fetches, scrapes, embeds, or hotlinks remote media.

## URL Policy

The server rejects `javascript:`, `data:`, `file:`, localhost/internal/private
destinations, credentials in URLs, unsupported protocols, and URLs over 2,048
characters. Client validation is reachability UX only.

## Customer Projection

The source explicitly requires a gallery on public Ready Stock detail. Secret
Catalog and preorder/book-detail gallery projection is not unambiguously
resolved in the current reconciled source. The recommended safe default is to
project only the approved public Ready Stock detail first, then extend the same
safe media projection to Secret Catalog only after an explicit source decision.

## Ready Stock Projection

`READY_STOCK: GREEN` — the public detail projects ordered gallery URLs, alt
text, and optional preview metadata without exposing storage IDs or private
media.

## Secret Catalog Projection

`NOT IN V1` — Secret Catalog currently keeps its existing cover-only projection;
no media is leaked into that projection by inference.

## Admin UI

If approved, keep one coherent Media section in Admin Book Detail:

```text
COVER BUKU
primary cover

GALERI PRODUK
ordered additional images

PRATINJAU EKSTERNAL
optional safe metadata links
```

Extend the existing Master Buku media area; do not create a separate media
management route or generic CMS.

## Customer UI

If approved, reuse the book-focused BFG detail surface. The Ready Stock detail
may use a contained primary image, reachable previous/next controls, and
thumbnails as shown by the supplied mobile visual source. Avoid marketplace
chrome, heavy carousel controls, or cropped important artwork.

## Authorization

Existing `books.manage` / Admin-or-Owner server permission is the starting
boundary. Every upload, remove, reorder, and external-metadata mutation must
be independently guarded in Convex. Customer/public reads must use safe
projections and never return storage IDs or private records.

## Audit

Reuse immutable `auditEvents` / `recordAudit`. Approved media changes should
record safe action and target metadata only. Never store raw image bytes,
credentials, access codes, or unnecessary customer data.

## Security

Clerk and `appUsers` remain identity/role authority. Convex remains the
authorization boundary. Secret Catalog secrecy, customer ownership, private
proof storage, and no-dummy-Production-data rules remain unchanged. External
URLs are untrusted metadata, not BFG media authority.

## Storage

Use existing Convex storage and `validateStoredFile`; do not create a second
storage provider or external hotlink source. Reference cleanup must be safe for
shared references.

## Responsive Behavior

Admin must remain usable at 1024/1280/1440. Customer detail must remain usable
at 375/390/430/768/1440 with full artwork visibility, reachable gallery
controls, no horizontal overflow, and stable loading/error states.

## Visual Contract

Use `BookCover`, existing contained image behavior, BFG cream/green surfaces,
shared buttons/cards/fields, current typography, and the mockup relationships.
The source image supplies layout relationships only; sample “My Bookshelf”
branding and records are not product data.

## Non-goals

- No Bulk Import change or Production pilot.
- No generic CMS/media library.
- No second storage backend or CDN abstraction.
- No arbitrary remote image hotlinks, scraping, embeds, or metadata fetcher.
- No variant-specific media, cover promotion, or media history rewrite unless
  explicitly locked.
- No customer upload, marketplace cart, or unrelated Book Detail redesign.

## State Model

The UI may represent `EMPTY`, `UPLOADING`, `READY`, `REORDERING`, `REMOVING`,
and `ERROR`. Server mutations remain the authority; invalid transitions and
stale entity state must fail safely.

## Success Criteria

- approved media survives hard refresh;
- order is deterministic and remains safe after repeat operations;
- cover remains intact;
- customer projections expose only approved media;
- invalid file/reference/URL/permission cases are denied server-side;
- audit is append-only and safe;
- responsive Admin/customer rendered checks pass;
- one legitimate existing BFG book passes Production UAT without dummy data.

## Tests

`convex/product-media.test.ts` covers authorization, file validation/reference
separation, persistence/order, delete safety, cover integrity, Ready Stock
customer projection, external URL validation, audit, and no Admin projection
for customers. Component and rendered checks cover the shared contained gallery
controls and responsive no-overflow grammar.

## Production UAT

After implementation, use one legitimate existing BFG book. Admin adds the
approved media/metadata, hard-refreshes, and verifies persistence; customer
checks only the source-approved projection; cover integrity, authorization,
audit, and URL behavior are rechecked. No dummy Production record is allowed.

## Open Decisions

There are **0 material open Product Media decisions for V1**:

1. `PRODUCT_MEDIA_OWNERSHIP`: locked to Book Master; no variant override.
2. `EXTERNAL_PREVIEW_SCOPE`: locked to one optional HTTPS metadata-only link;
   no fetch, scrape, embed, hotlink, or credentials in URL.

Secret Catalog gallery projection is explicitly `NOT IN V1`, not unknown.

## Implementation Entry Gate

```text
GALLERY DEFINITION: LOCKED
OWNERSHIP: BOOK MASTER
BOOK VS VARIANT: BOOK MASTER ONLY; NO VARIANT OVERRIDE IN V1
MAX COUNT: 8 ADDITIONAL IMAGES
ORDERING: PERSISTED `bookMedia.displayOrder` WITH MOVE UP/DOWN
COVER RELATIONSHIP: LOCKED — COVER REMAINS PRIMARY
UPLOAD: EXISTING CONVEX STORAGE; JPG/PNG/WEBP; 5 MB
DELETE: LOCKED; SAFE REFERENCE CLEANUP
REORDER: LOCKED; MOVE UP/DOWN
EXTERNAL PREVIEW: OPTIONAL HTTPS METADATA-ONLY LINK
URL POLICY: SERVER-VALIDATED HTTPS; PRIVATE/LOCAL/CREDENTIAL DESTINATIONS REJECTED
CUSTOMER PROJECTION: READY STOCK ONLY IN V1
READY STOCK: IMPLEMENTED
SECRET CATALOG: NOT IN V1
AUTHORIZATION: EXISTING ADMIN/OWNER BOUNDARY LOCKED
AUDIT: EXISTING APPEND-ONLY AUDIT LOCKED
SECURITY: EXISTING INVARIANTS LOCKED
VISUAL CONTRACT: LOCKED
OPEN MATERIAL QUESTIONS: 0
IMPLEMENTATION: COMPLETE LOCALLY; PRODUCTION DEPLOYMENT/UAT PENDING
```
