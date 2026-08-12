# Order Exceptions

Status: Phase 06.7 policy-closed; runtime integration QA is part of the
release gate.

## Purpose

`orderExceptions` is the canonical item-level operational case for out of
stock, defect, customer cancellation, and admin cancellation events. It keeps
the original `orders`, `orderItems`, invoice snapshots, approved payment
confirmations, and deposit ledger history intact.

## Supported types and lifecycle

```text
out_of_stock
defect
customer_cancellation
admin_cancellation
```

```text
opened → under_review → resolution_selected → resolved
opened → rejected
under_review → rejected
```

Only admin/owner users can review, reject, select a resolution, or resolve a
case. Customers can create only their own cancellation request and can read
only their own safe projection.

## Resolutions

The v0.1 safe set is:

```text
remove_item
deposit_release
refund_required
replacement
no_action
```

`remove_item`, `deposit_release`, `refund_required`, and `replacement` block
the affected quantity from normal fulfillment. `replacement` requires an
explicit replacement reference. `no_action` leaves normal fulfillment
available. Replacement preserves the original order item; it does not rewrite
history or create store credit.

## Cancellation boundary

`evaluateCancellationEligibility(orderItemId)` is the server-side decision
boundary. It returns `eligible`, `requires_admin_review`, or `not_eligible`
with machine-readable reason codes. Fulfilled/cancelled items and active
conflicts are rejected. A fully resolved item returns
`NO_REMAINING_QUANTITY`. Batch-lock and payment/deposit states require admin
review. Before supplier commitment, cancellation is normally eligible subject
to review. After commitment, the admin records the recoverable amount; no full
refund is promised automatically. The customer UI only reflects this result;
it is never the authority.

## Quantity and operational interaction

Partial quantities are supported. The original item quantity is immutable for
history; exception state subtracts only affected quantity from the
fulfillable quantity. Batch assignment checks use the remaining quantity and
preserve historical assignments after lock/PO close. Fulfillment cannot advance
to `completed` while an exception remains in review. An order is marked
`cancelled` only when every item quantity has been resolved through a
non-`no_action` exception; unrelated items remain operational.

## Financial consequence

Money is integer IDR. Each resolved case creates one append-only
`orderExceptionFinancialAdjustments` record:

```text
adjusted invoice total = original invoice total + cumulative adjustments
settled amount = active deposit allocation + approved external payment
outstanding = max(0, adjusted total - settled amount)
overpayment = max(0, settled amount - adjusted total)
```

Issued invoice snapshots retain `totalAmount`. `adjustedTotalAmount`,
`overpaymentAmount`, and `refundObligationAmount` are derived/projection fields.
An obligation can be `refund_due` without any payout being executed. Refund
obligations and payouts are separate records with pending/processing/paid/
failed payout states; successful payouts cannot exceed the obligation. Existing
approved payment confirmations are never deleted or changed. Deposit releases
reuse `invoiceDepositAllocations.releaseAllocationInternal`, append a release
ledger row, restore available balance, and reject a second release.

## Access and UI

- Admin queue: `/admin/exceptions`.
- Refund queue: `/admin/refunds`.
- Admin order detail shows exception history and financial consequence.
- Customer order detail shows safe exception history and eligible cancellation
  request actions.
- Internal notes, rejection reasons, actor IDs, and other customer-private
  operational details are excluded from customer projections.

All mutations require active server-side permissions and current-state checks.
Important actions create exception events and audit records, including
`cancellation.requested`, `cancellation.approved`, `cancellation.rejected`,
`financial_adjustment.created`, and `deposit_allocation.released`.

## Deliberate boundaries

Ready Stock uses the canonical order domain and can use the same exception
history. It does not enter supplier Batch PO. Admin-assisted orders still
require a real active customer `appUsers` row. No proof upload/storage or
analytics projection was added.
