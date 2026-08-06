# Phase 03.1 data invariants

- Publisher slugs are unique.
- Book slugs are unique per publisher.
- ISBNs are unique across variants.
- A book has at most one variant per format.
- A catalog slug is unique.
- A catalog/variant pair is unique.
- Prices and quantities are safe integers; prices are non-negative and quantities are positive.
- Effective catalog price is the item override or the variant price.
- Access codes are keyed digests; plaintext codes are never stored or returned.
- Customer order writes require an active grant and an open catalog.
- Order totals and snapshots are calculated inside one Convex mutation.
- A customer can read only orders owned by its current prototype session.
- Customer edits require a submitted order, an open catalog, and an unexpired editable window.
- Submitted orders contain at least one valid, available catalog item.
- Status changes are limited to the Phase 03.1 order states: submitted, cancelled, completed.
- A catalog-batch pair is unique.
- Order-item assignment quantities are positive integers and their sum cannot exceed the ordered quantity.
- A batch shipment stage is nullable before the first admin update and then moves forward only; skipped movement requires explicit confirmation.
- Fulfillment stages move forward only and remain separate from order status.
- An order has at most one non-void invoice.
- Invoice totals equal the sum of immutable item snapshots and outstanding amount cannot be negative.
- Deposit account available and reserved balances cannot be negative and are updated with every ledger append.
- Deposit transactions cannot be edited or deleted; a reversal references one non-reversal transaction at most once.
- An allocation belongs to the same customer as its invoice and deposit account and cannot exceed invoice outstanding or account available balance.

## Phase 03.2 operational and financial invariants

- Batch names are admin-defined; a new batch has no customer-visible shipment
  stage until its first valid transition.
- Archived batches cannot receive new catalog links, assignments, or shipment
  transitions; existing history remains readable to admins and owned customers.
- A catalog/batch link is unique, and an assignment requires that link to exist.
- One order item may have multiple assignments, but the sum of positive assigned
  quantities cannot exceed the authoritative order-item quantity.
- Shipment and fulfillment transitions are forward-only. The first shipment
  stage is `po_closed`; the first fulfillment stage is `awaiting_payment`.
  Explicit forward skips require admin confirmation; backward correction is
  deferred.
- One order may have only one non-void invoice. Invoice item quantity, unit
  price, subtotals, total, and outstanding amount are validated server-side.
- Invoice status is only `draft`, `issued`, or `void`; an issued invoice cannot
  silently return to draft and a void invoice cannot receive an allocation.
- Deposit requirements are `none`, validated fixed Rupiah, or integer basis
  points from `0` through `10000`; calculation rounds to the nearest whole
  Rupiah without floating-point persistence.
- A customer has at most one IDR deposit account. It is created only by an
  explicit credit operation and starts with zero available and reserved funds.
- Every deposit transaction amount is a positive integer and its deltas are
  calculated server-side. Available and reserved balances cannot become
  negative.
- Deposit transactions are immutable and cannot be deleted. A reversal points
  to exactly one non-reversal transaction, is allowed once, and applies exact
  inverse deltas without producing a negative balance.
- An invoice allocation belongs to the same customer as its account and invoice,
  is backed by one reservation transaction, and cannot exceed available balance
  or invoice outstanding amount.
- Allocation release and allocation reversal update allocation state, account
  summary, ledger, and invoice summary atomically.
