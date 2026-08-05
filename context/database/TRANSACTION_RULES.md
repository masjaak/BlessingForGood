# Phase 03.1 transaction rules

`orders.submit` is one Convex mutation. It validates the session, grant,
catalog state, catalog items, availability, quantities, and authoritative
prices before inserting the order, snapshot items, and initial status event.
Any failure rolls back every write.

`orders.edit` deletes and replaces the order items, recalculates totals from
current catalog authority, patches the order, and records an edit event in one
mutation. It rejects edits after catalog close or the editable deadline.

Convex Production is not configured in this phase. The rules are deployed and
smoke-tested on the personal dev deployment; Preview verification follows
after frontend migration.
