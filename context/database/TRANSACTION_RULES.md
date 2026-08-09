# BFG Transaction Rules

`orders.submit` is one Convex mutation. It validates the active app user,
grant, catalog state, catalog items, availability, quantities, and authoritative
prices before inserting the order, immutable item snapshots, and initial status
event. Any failure rolls back every write.

`orders.edit` deletes/replaces item snapshots, recalculates totals from current
catalog authority, patches the order, and records the edit event in one
mutation. It rejects edits after catalog close or the editable deadline.

Operational mutations keep related writes atomic: batch stage plus history,
fulfillment stage plus history, invoice plus snapshot items, account ledger
append plus account summary, and allocation/release plus invoice summary.
Financial history is corrected with inverse ledger rows rather than edits.

`batches.linkCatalog`, `batchTracking.assignOrderItem`, and shipment-stage
updates validate active admin/owner permission, references, archive state,
catalog eligibility, and transitions before writing. Actor fields are derived
from the current app user.

`orderFulfillment.updateStage` writes the order projection plus history
together and never changes preorder status.

`invoices.create` loads authoritative order-item snapshots, validates integer
totals, calculates the deposit requirement, and inserts the invoice plus every
invoice item in one mutation. `issue` and `voidInvoice` preserve lifecycle
history; voiding with active allocations is rejected.

Deposit mutations use one account summary and one append-only ledger write in
the same mutation. Allocation/release/reversal update allocation, account, and
invoice state atomically. Original ledger rows are never edited or deleted.

Legacy cleanup is disabled from active Convex exports. Production remains
unconfigured and fail-closed.
