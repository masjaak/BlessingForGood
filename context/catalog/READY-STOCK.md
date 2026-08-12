# Ready Stock

Status: Phase 06.7 policy-closed; runtime QA is part of the release gate

## Data flow

```text
Book Master
  → book variant (format + ISBN + integer IDR price)
    → readyStockInventory (on-hand, reserved, available)
```

Ready Stock orders use the canonical `orders` and `orderItems` domain with
`orders.source = ready_stock`. They do not create a second checkout, payment,
invoice, or purchase-order system.

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
- An owned Ready Stock order requires an authenticated, active BFG customer;
  anonymous checkout is not supported.
- Zero records render `Ready Stock belum tersedia.` without seeded business data.
- Missing, draft, special, archived, inactive, and zero-stock records render unavailable.

## Inventory mutation

`readyStock.setQuantity` requires `books.manage`, validates an existing variant and a safe non-negative integer, upserts one inventory row by variant, and writes an audit event in the same Convex transaction.

Creating a Ready Stock order atomically reserves quantity. Available quantity
is `on-hand - reserved`; fulfillment consumes both on-hand and reserved
quantity, while cancellation/rejection releases reserved quantity once.
Ready Stock never enters a supplier Batch PO. There is no automated payment
reservation expiry in this phase; release requires fulfillment, explicit
cancellation, rejection, or another terminating operational action.

## Query ceiling

The v0.1 public and admin queries scan at most 200 indexed Book Master rows on the server and return at most 100 public items. Add pagination and search-specific indexes when real volume exceeds that ceiling; do not fetch Book Master rows for browser-side filtering.
