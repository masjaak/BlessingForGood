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
