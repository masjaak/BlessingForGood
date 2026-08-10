# BFG Book and Catalog Rules

Status: approved for Phase 06.1

## Ownership boundaries

- Book Master owns reusable title, slug, author, description, category, cover reference, publisher, and publication state.
- A book variant owns one format, one unique ISBN, one positive integer IDR price, and its active flag.
- Ready Stock owns public per-variant quantity. A book is not an inventory record.
- Secret Catalog owns curation, access, timing, catalog-item availability, and optional price override.
- The same Book Master record may be referenced by Ready Stock and Secret Catalog; it is never recreated per catalog.

## Publication state

| State | Meaning | Public Ready Stock |
| --- | --- | --- |
| `draft` | incomplete admin work | hidden |
| `published` | approved public metadata | eligible when active variant stock is positive |
| `special` | private/special-catalog metadata | hidden |
| `archived` | retired metadata | hidden |

Visibility is enforced in `convex/readyStock.ts`, not inferred from UI state.

## Slug, ISBN, money, and cover policy

- Book slug is globally unique because `/ready-stock/[slug]` is canonical.
- ISBN is trimmed and unique across variants. One book cannot repeat a format.
- Variant prices are safe positive integer IDR values.
- Cover storage remains an optional string reference. Durable upload/storage infrastructure is deferred; binary/base64 content is not stored in Convex.

## Ready Stock ordering boundary

`READY_STOCK_ORDER_RECORDING` is not approved. Phase 06.1 provides public browsing and a contact/help CTA only. It does not create a checkout, Ready Stock order record, reservation, or sale transition.
