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

## Phase 03.2 operations extension

[REPOSITORY] The operational tables add the following persisted records:

| Table | Purpose | Historical rule |
| --- | --- | --- |
| `batches` | Admin-defined cargo/batch record and nullable current shipment stage | Current stage is a projection; history is separate. |
| `catalogBatchLinks` | Many-to-many operational catalog relationship | One catalog/batch pair only once. |
| `orderItemBatchAssignments` | Quantity allocation of an order item to one or more batches | Positive integer quantities; total never exceeds the order item quantity. |
| `batchStatusHistory` | Customer-visible shipment-stage events | Append-only; created in the same mutation as the batch projection update. |
| `orderFulfillmentHistory` | Customer order fulfillment-stage events | Append-only; separate from preorder order status. |
| `invoices` | IDR invoice header, requirement, allocation, outstanding, and lifecycle state | Issued financial history is not overwritten; revisions use void plus a new record. |
| `invoiceItems` | Immutable order-item description and amount snapshots | Totals derive only from these rows. |
| `depositAccounts` | One IDR account summary per Preview customer session | Available and reserved amounts are maintained transactionally. |
| `depositTransactions` | Append-only credit, reservation, release, debit, and reversal ledger | No update or delete mutation exists. |
| `invoiceDepositAllocations` | Reservation-backed invoice allocation history | Release/reversal preserves the allocation row and writes ledger history. |

Operational documents use Convex IDs for relationships and UTC epoch
milliseconds for timestamps. Financial amounts are safe integer Rupiah values;
percentage requirements are integer basis points (`0..10000`).
