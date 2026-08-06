# Phase 03.1 transaction rules

`orders.submit` is one Convex mutation. It validates the session, grant,
catalog state, catalog items, availability, quantities, and authoritative
prices before inserting the order, snapshot items, and initial status event.
Any failure rolls back every write.

`orders.edit` deletes and replaces the order items, recalculates totals from
current catalog authority, patches the order, and records an edit event in one
mutation. It rejects edits after catalog close or the editable deadline.

Convex Production is not configured in this phase. The rules are deployed and
smoke-tested on the personal dev deployment and the branch-scoped Preview
deployment. Production remains fail-closed until a later approved phase.

Operational mutations keep related writes atomic: batch stage plus history,
fulfillment stage plus history, invoice plus snapshot items, account ledger
append plus account summary, and allocation/release plus invoice summary.
Financial history is corrected with inverse ledger rows rather than edits.

## Phase 03.2 operational rules

`batches.linkCatalog`, `batchTracking.assignOrderItem`, and shipment-stage
updates validate the admin Preview session, references, archive state, catalog
eligibility, and transition before writing. Shipment projection plus history
is one mutation. Unlinking a catalog is blocked while an assignment for that
catalog would lose its operational relationship.

`orderFulfillment.updateStage` validates the separate fulfillment state and
writes the order projection plus history together. It never changes the
existing preorder order status.

`invoices.create` loads authoritative order-item snapshots, validates all
integer totals, calculates the deposit requirement, inserts the invoice, and
inserts every invoice item in one mutation. `issue` and `voidInvoice` preserve
the lifecycle history. `voidInvoice` rejects invoices with active allocations.

Deposit mutations use one account summary and one append-only ledger write in
the same mutation. Allocation and release additionally update the allocation
row and invoice summary atomically. Reversal creates a new inverse ledger row;
it never patches or deletes the original transaction. The direct transaction
update/delete surface is intentionally absent.

The test-only cleanup mutation is a separate guarded Preview capability. It
requires the admin session, an explicit customer session, and a test marker;
it deletes only records created by that test. It is not available as a general
reset and must never be configured for Production.
