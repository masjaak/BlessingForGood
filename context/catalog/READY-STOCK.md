# Ready Stock v0.1

Status: implemented in Phase 06.1; runtime QA deferred to staging

## Data flow

```text
Book Master
  → book variant (format + ISBN + integer IDR price)
    → readyStockInventory (non-negative quantity)
```

Public eligibility requires all of the following:

1. book publication state is `published`;
2. publisher is active;
3. variant is active;
4. a Ready Stock inventory record exists;
5. quantity is greater than zero.

The anonymous public query reads only this projection. It does not read Secret Catalog, access-code, grant, or catalog-item tables.

## Public behavior

- `/ready-stock` provides server-backed title/publisher/ISBN search and filters only when matching data exists.
- Supported filters are category, publisher, and format; sort is newest, title, or price.
- `/ready-stock/[slug]` shows the public book and stocked variants only.
- Zero records render `Ready Stock belum tersedia.` without seeded business data.
- Missing, draft, special, archived, inactive, and zero-stock records render unavailable.

## Inventory mutation

`readyStock.setQuantity` requires `books.manage`, validates an existing variant and a safe non-negative integer, upserts one inventory row by variant, and writes an audit event in the same Convex transaction.

The v0.1 model tracks current available quantity only. Reserved and sold transitions wait for an approved Ready Stock order-recording policy.

## Query ceiling

The v0.1 public and admin queries scan at most 200 indexed Book Master rows on the server and return at most 100 public items. Add pagination and search-specific indexes when real volume exceeds that ceiling; do not fetch Book Master rows for browser-side filtering.
