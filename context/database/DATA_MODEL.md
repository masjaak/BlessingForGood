# Phase 03.1 data model

Publishers own books. Books own BB/PB/HB variants. Catalog items link variants
to a secret catalog and may carry a catalog-specific price override.

Customers receive a catalog access grant after server-side code verification.
Orders belong to the customer prototype session and catalog. Order items copy
book, publisher, format, ISBN, currency, unit price, quantity, and subtotal at
submission time so later catalog edits cannot change historical totals.

`prototypeSessions` is an expiring Preview-only boundary, not a user account.
Only token digests are stored. Raw access codes and raw session tokens never
enter Convex documents.

Batches link operationally to catalogs, while order-item assignments record the
actual quantity allocation. Batch status history and order fulfillment history
are separate append-only timelines.

Invoices copy order-item snapshots and store integer IDR totals. Deposit
accounts expose available and reserved balances; deposit transactions are
append-only and invoice allocations connect reservations to invoices.

## Operations model

[REPOSITORY] Shipment movement and order fulfillment are intentionally separate:

- `batches` represent imported-goods movement. A catalog may link to many
  batches and a batch may link to many catalogs.
- `orderItemBatchAssignments` records the actual quantity assigned to each
  batch. The catalog link is operational eligibility, not assignment.
- `batchStatusHistory` uses `PO Ditutup`, `Dipesan ke Supplier`, `Dikirim dari
  Luar Negeri`, `Pemeriksaan Bea Cukai`, `Menuju Gudang Indonesia`, and `Sampai
  di Toko` as the customer-visible sequence.
- `orders.currentFulfillmentStage` and `orderFulfillmentHistory` use
  `Menunggu Pelunasan`, `Menunggu Alamat`, `Sedang Dikemas`, `Sudah Dikirim`,
  and `Selesai`; they do not replace `submitted`, `cancelled`, or `completed`.

Invoices are generated from authoritative `orderItems` snapshots. The invoice
stores the computed deposit requirement, allocated amount, and outstanding
amount so a later policy change cannot rewrite the issued prototype record.
Invoice numbers use the unique Convex invoice ID after insertion and are
collision-safe for this prototype, not a final accounting numbering policy.

Deposit balances are a projection maintained in the same Convex mutation as
each ledger append. `credit` increases available funds, `reservation` moves
available to reserved for an invoice, `release` moves it back, and `reversal`
adds the exact inverse of one eligible prior transaction. Customer queries are
always scoped by the current Preview session on the server.
