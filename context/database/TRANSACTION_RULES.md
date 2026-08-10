# BFG Transaction Rules

`orders.submit` is one Convex mutation. It validates the active app user,
grant, catalog state, catalog items, availability, quantities, and authoritative
prices before inserting the order, immutable item snapshots, and initial status
event. Any failure rolls back every write.

`orders.edit` deletes/replaces item snapshots, recalculates totals from current
catalog authority, patches the order, and records the edit event in one
mutation. It rejects edits after catalog close or the editable deadline.

`joinRequests.submit` validates and normalizes anonymous fields, checks indexed
active duplicates, and inserts one request atomically. Review mutations validate
the current status, patch reviewer/timestamp/state/invitation handoff, and
record the audit event in the same transaction. Rejected history remains; no
transition reopens a request or creates an `appUser`.

Operational mutations keep related writes atomic: batch stage plus history,
fulfillment stage plus history, invoice plus snapshot items, account ledger
append plus account summary, and allocation/release plus invoice summary.
Financial history is corrected with inverse ledger rows rather than edits.

`batches.linkCatalog`, `batchTracking.assignOrderItem`, and shipment-stage
updates validate active admin/owner permission, references, archive state,
catalog eligibility, and transitions before writing. Actor fields are derived
from the current app user.

`batchTracking.unassignOrderItem` and `batchTracking.moveOrderItem` re-read
current batch/item assignments, reject archived or `po_closed`/later batches,
recheck submitted-order quantity and linked-catalog compatibility, and write
the assignment change plus audit event atomically. A move cannot target an
existing assignment.

`orders.createAssisted` validates the active admin/owner actor, a bounded
idempotency key, an existing active customer, open catalog, valid item/variant,
and positive quantity. The key is checked through
`orders.by_assisted_submission_key` before the write. It derives the customer
snapshot and price, then inserts the same order, item, status-history, and
audit pipeline used by operational order creation.

`orderFulfillment.updateStage` writes the order projection plus history
together and never changes preorder status.

`invoices.create` loads authoritative order-item snapshots, validates integer
totals, calculates the deposit requirement, and inserts the invoice plus every
invoice item in one mutation. `issue` and `voidInvoice` preserve lifecycle
history; voiding with active allocations, approved payment, or pending payment
confirmation is rejected.

Deposit mutations use one account summary and one append-only ledger write in
the same mutation. Allocation/release/reversal update allocation, account, and
invoice state atomically. Original ledger rows are never edited or deleted.

`paymentConfirmations.submit` derives customer ownership from the invoice,
validates integer amount against current outstanding, and inserts the attempt
plus the `payment_submitted` projection in one mutation. `startReview` changes
only a pending review state. `approve` patches the confirmation, verified
invoice amount, outstanding amount, payment state, and audit row in one
mutation after rechecking current settlement capacity. `reject` preserves the
attempt, reviewer, timestamp, reason, and audit row while recalculating the
invoice payment projection. No confirmation writes the deposit ledger.

Legacy cleanup is disabled from active Convex exports. Production remains
unconfigured and fail-closed.

`books.create`, `books.update`, `bookVariants.create`, and
`bookVariants.update` validate admin/owner permission, references, uniqueness,
and metadata/price invariants before writing their audit event in the same
mutation. `readyStock.setQuantity` validates admin/owner permission, variant
existence, and non-negative safe-integer quantity before atomically upserting
one per-variant inventory record and its audit event. Reservation and sale
transitions are not implemented without an approved Ready Stock order model.
