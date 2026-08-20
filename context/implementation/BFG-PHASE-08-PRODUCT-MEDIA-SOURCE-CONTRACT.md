# BFG PHASE 08 PRODUCT MEDIA SOURCE CONTRACT

Status: `SOURCE_TRACED — PRODUCT MEDIA IMPLEMENTATION BLOCKED`
Reconciled: 2026-08-20 (Asia/Jakarta)

This contract records the source-backed Product Gallery / External Preview
Metadata candidate. It does not authorize schema, storage, mutation, or UI
implementation while the material ownership and external-link decisions below
remain open.

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

The supplied Admin visual source shows a maximum of eight additional gallery
images. This is a visual source signal, not yet a complete data contract.

## Gallery Ownership

`OPEN_PRODUCT_DECISION`: choose the canonical owner for gallery media:

1. `Book Master` — one reusable gallery for Catalog and Ready Stock product
   presentation; recommended because title-level cover/media already belongs to
   Book Master and avoids duplicating the same images per format.
2. `Ready Stock listing/variant` — follows the original `readyStockMedia`
   schema concept and allows stock-specific imagery, but requires the current
   implementation to introduce a canonical listing boundary.

No media schema or mutation is authorized until the owner is explicitly locked.

## Variant Relationship

Recommended direction, pending the ownership decision: gallery media is
Book-level and variants do not override it in V1. ISBN, price, stock, and
catalog price remain variant/listing concerns. A variant-specific gallery is
not source-resolved.

## Maximum Media Count

The mockup shows up to eight gallery images in addition to the required cover.
The final owner, whether the limit is per Book Master or per Ready Stock
listing, and whether replacement counts toward the limit must be locked with
ownership.

## Media Ordering

The source requires deterministic gallery order for swipeable images. If Admin
reordering is approved, one persisted zero-based or one-based ordering field
must be canonical; there must be no second independently editable order list.

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

Deletion is not authorized until ownership is locked. The safe shape is:
authorize → remove canonical reference → verify persistence → delete the
storage object only when no other canonical reference uses it. Deleting a
gallery image must not delete the cover or the Book/Ready Stock entity.

## Reorder

Reordering is not authorized until ownership and the maximum/order field are
locked. If approved, use the smallest existing interaction (for example,
move-left/move-right) before adding a drag-and-drop dependency.

## External Preview Definition

The Admin mockup shows optional links labelled Preview Amazon, Preview
Instagram, and Preview YouTube; the customer mockup shows the same preview
destinations. The original product narrative does not define the authoritative
platform allowlist, whether these are per Book or per variant, or whether any
remote image/metadata is fetched.

`OPEN_PRODUCT_DECISION`: lock the external preview contract. Recommended V1:
optional metadata-only HTTPS URLs for an explicit allowlist of legitimate
publisher/product-preview destinations (Amazon, Instagram, and YouTube only if
the client confirms those labels); no fetch, scrape, embed, or remote image
hotlink.

## URL Policy

Pending the external-preview decision, the minimum non-negotiable policy is:
reject `javascript:`, `data:`, `file:`, localhost/internal destinations,
credentials in URLs, unsupported protocols, and unbounded strings. The server
must validate any allowlist; a client-side input pattern is insufficient.

## Customer Projection

The source explicitly requires a gallery on public Ready Stock detail. Secret
Catalog and preorder/book-detail gallery projection is not unambiguously
resolved in the current reconciled source. The recommended safe default is to
project only the approved public Ready Stock detail first, then extend the same
safe media projection to Secret Catalog only after an explicit source decision.

## Ready Stock Projection

`READY_STOCK: SOURCE-LOCKED IN PRINCIPLE` — the public detail must be able to
show the ordered gallery without exposing internal cost, supplier data, storage
IDs, or private media. Exact ownership and query shape remain blocked by the
open ownership decision.

## Secret Catalog Projection

`OPEN_PRODUCT_DECISION` — current sources define Secret Catalog product access
and cover presentation, but do not explicitly settle whether the new gallery or
external preview links appear there. Do not leak media into private catalog
projections by inference.

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

Only after the open decisions are locked:

- approved media survives hard refresh;
- order is deterministic and remains safe after repeat operations;
- cover remains intact;
- customer projections expose only approved media;
- invalid file/reference/URL/permission cases are denied server-side;
- audit is append-only and safe;
- responsive Admin/customer rendered checks pass;
- one legitimate existing BFG book passes Production UAT without dummy data.

## Tests

Tests are not authorized beyond source-contract coverage until the open behavior
is locked. The eventual RED set must cover only locked behavior: authorization,
file validation/count, persistence/order, delete safety, cover integrity,
customer projection, external URL validation, audit, responsive reachability,
and no leakage into unauthorized projections.

## Production UAT

After implementation, use one legitimate existing BFG book. Admin adds the
approved media/metadata, hard-refreshes, and verifies persistence; customer
checks only the source-approved projection; cover integrity, authorization,
audit, and URL behavior are rechecked. No dummy Production record is allowed.

## Open Decisions

There are currently **2 material open product decisions**:

1. `PRODUCT_MEDIA_OWNERSHIP`: Book Master gallery versus Ready Stock
   listing/variant gallery. Recommendation: Book Master gallery, no
   variant-specific override in V1.
2. `EXTERNAL_PREVIEW_SCOPE`: canonical platforms and whether the mockup’s
   Amazon/Instagram/YouTube fields are active product behavior. Recommendation:
   explicit allowlisted HTTPS metadata-only links, no fetch/embed/hotlink.

Secret Catalog projection follows the ownership/platform decision and remains
blocked rather than inferred.

## Implementation Entry Gate

```text
GALLERY DEFINITION: LOCKED IN PRINCIPLE; OWNER DEPENDENT
OWNERSHIP: OPEN_PRODUCT_DECISION
BOOK VS VARIANT: OPEN UNTIL OWNERSHIP LOCKED
MAX COUNT: VISUAL SIGNAL = 8; FINAL SCOPE OPEN
ORDERING: SOURCE REQUIRES DETERMINISTIC ORDER; MUTATION OPEN
COVER RELATIONSHIP: LOCKED — COVER REMAINS PRIMARY
UPLOAD: EXISTING ARCHITECTURE REUSE; FINAL LIMIT OPEN
DELETE: OPEN
REORDER: OPEN
EXTERNAL PREVIEW: OPEN_PRODUCT_DECISION
URL POLICY: MINIMUM SECURITY LOCKED; ALLOWLIST OPEN
CUSTOMER PROJECTION: READY STOCK IN PRINCIPLE; SECRET CATALOG OPEN
READY STOCK: OPEN QUERY/OWNER DEPENDENCY
SECRET CATALOG: OPEN_PRODUCT_DECISION
AUTHORIZATION: EXISTING ADMIN/OWNER BOUNDARY LOCKED
AUDIT: EXISTING APPEND-ONLY AUDIT LOCKED
SECURITY: EXISTING INVARIANTS LOCKED
VISUAL CONTRACT: LOCKED IN PRINCIPLE
OPEN MATERIAL QUESTIONS: 2
IMPLEMENTATION: NOT AUTHORIZED
```
