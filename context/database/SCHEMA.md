# Phase 03.1 Convex schema

The deployed schema contains the catalog-to-preorder vertical slice, the
temporary Preview session boundary, and the Phase 03.2 operational records:

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
batches
catalogBatchLinks
orderItemBatchAssignments
batchStatusHistory
orderFulfillmentHistory
invoices
invoiceItems
depositAccounts
depositTransactions
invoiceDepositAllocations
```

Money is stored as non-negative integer IDR amounts. Dates are UTC epoch
milliseconds. Convex document IDs are used for relationships.

Payments, uploads, and customer identity remain deliberately absent from this
schema. Shipment tracking belongs to batches; fulfillment tracking belongs to
orders. Deposit accounts keep denormalized balances while the ledger remains
append-only.
