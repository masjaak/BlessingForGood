# Phase 03.1 Convex schema

The deployed Phase 03.1 schema contains only the catalog-to-preorder vertical
slice and the temporary Preview session boundary:

```text
prototypeSessions
publishers
books
bookVariants
secretCatalogs
catalogAccessCodes
catalogItems
catalogAccessGrants
orders
orderItems
orderStatusHistory
```

Money is stored as non-negative integer IDR amounts. Dates are UTC epoch
milliseconds. Convex document IDs are used for relationships.

Invoices, deposits, payments, batches, cargo, shipment events, uploads, and
customer identity are deliberately absent from this schema.
