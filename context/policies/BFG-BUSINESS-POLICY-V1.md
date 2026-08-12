# Blessing For Goods Business Policy V1

Status: FINAL
Phase: 06.7 Business Policy Closure
Effective: 2026-08-12

This is the canonical operational policy for ordering, exceptions, refunds,
deposit refunds, manual customers, and Join-request retention. Customer Visual
V4.1 and the Phase 06.6 loading/flow system remain unchanged.

## Ready Stock Ordering

- Policy: Ready Stock creates a normal canonical `orders` record with `source=ready_stock`.
- Reason: Ready Stock and preorder share ownership, invoice, payment, fulfillment, and audit history.
- Allowed: An authenticated active non-suspended BFG customer may order a published available variant and a positive integer quantity.
- Not Allowed: Guest checkout, frontend stock decrements, arbitrary prices, or a parallel Ready Stock order table.
- Domain Consequence: The server creates one order, immutable order-item snapshot, active stock reservation, and audit event in one transaction.
- Customer Consequence: Signed-out visitors may browse; signed-out ordering shows the existing account gate.
- Admin Consequence: Ready Stock orders appear in the canonical order queue and may be invoiced, paid, fulfilled, cancelled, or resolved through existing operations.
- Financial Consequence: Invoices and payment/deposit records use the existing domains; no Ready Stock payment engine exists.
- Audit Requirement: Record source, actor, order/item references, quantity, and reservation creation.

## Ready Stock Reservation

- Policy: Creation reserves inventory immediately and atomically.
- Reason: Two customers must not claim the same final copy.
- Allowed: `available = on_hand - reserved`; only the server may change reservation state.
- Not Allowed: Negative available stock, frontend-only checks, duplicate active reservations, or automated payment expiry in this phase.
- Domain Consequence: Existing inventory quantity remains on-hand; a reservation row tracks quantity and active/released/fulfilled state.
- Customer Consequence: A successful order owns the reserved quantity while the order is operationally open.
- Admin Consequence: Admin may change on-hand stock only above the active reserved quantity.
- Financial Consequence: Reservation does not create payment or refund activity.
- Audit Requirement: Record reservation, release, and fulfillment consumption with actor and quantity.

## Pre-PO Cancellation

- Policy: Before a supplier PO is locked/committed, a customer may request cancellation; admin review is still required.
- Reason: Payment, deposit, partial quantity, and invoice reconciliation must remain safe.
- Allowed: A customer request for remaining unfulfilled quantity and an admin approval/rejection through `orderExceptions`.
- Not Allowed: Direct customer order mutation, hard deletion, or silent payment-history edits.
- Domain Consequence: An item-level cancellation exception is opened, reviewed, resolved, and its financial adjustment is append-only.
- Customer Consequence: The request is shown as under review until BFG resolves it.
- Admin Consequence: Admin confirms the affected quantity and resolution before any financial or inventory effect.
- Financial Consequence: Recoverable paid value becomes a refund obligation; deposit allocations may be released only through the ledger flow.
- Audit Requirement: Record request, decision, resolution, adjustment, actor, and timestamps.

## Post-PO Cancellation

- Policy: After supplier commitment, customer cancellation is not automatically eligible; admin decides whether supplier recovery is possible.
- Reason: BFG may already owe a non-refundable supplier commitment.
- Allowed: A customer request may be submitted for review; admin may record a recoverable IDR amount, including zero or a partial amount.
- Not Allowed: Automatic full-refund promises, silently assuming supplier recovery, or overwriting the original invoice.
- Domain Consequence: The explicit recoverable amount reduces the adjusted invoice total; the resulting settled overpayment creates the refund obligation.
- Customer Consequence: Customer sees that the request is being reviewed and that the refundable amount depends on BFG confirmation.
- Admin Consequence: Admin must make the recovery decision explicit and may not exceed the affected item value.
- Financial Consequence: Only settled value above the adjusted committed amount becomes refundable; unpaid/non-refundable value is not a payout obligation.
- Audit Requirement: Store recoverable amount, reason, resolution, actor, timestamp, and the immutable original amount.

## Ready Stock Cancellation

- Policy: An unfulfilled Ready Stock order may be cancelled through the same exception review; a fulfilled order cannot use normal cancellation.
- Reason: Reservation must be released before fulfillment and consumed after fulfillment.
- Allowed: Cancellation request before completion, admin review, and idempotent active-reservation release.
- Not Allowed: Customer cancellation after fulfillment or manual inventory release without the order exception flow.
- Domain Consequence: The canonical order remains historical; active reservations are released exactly once and the order may become cancelled after all affected quantities resolve.
- Customer Consequence: The request and refund status remain visible in the account.
- Admin Consequence: Admin confirms the order is not fulfilled before approving cancellation.
- Financial Consequence: Existing invoice/payment history remains; any refund is an obligation followed by a payout.
- Audit Requirement: Record cancellation decision and reservation release.

## Defect Resolution

- Policy: A confirmed defect prefers replacement; refund obligation is the fallback.
- Reason: Replacement preserves the intended purchase when a matching item can be supplied.
- Allowed: Admin may resolve a defect as replacement with a fulfillment/reference note, or as refund fallback when replacement is unavailable or impractical.
- Not Allowed: Deleting the defective order item, silently issuing store credit, or treating a defect as an unreviewed cancellation.
- Domain Consequence: The original item and defect exception remain; replacement is an explicit resolution consequence.
- Customer Consequence: Customer sees replacement arranged or refund processing status, without internal supplier/bank detail.
- Admin Consequence: Admin records feasibility and the replacement reference before resolving.
- Financial Consequence: Replacement is financially neutral; refund fallback creates a separate refund obligation for settled refundable value.
- Audit Requirement: Record defect, selected resolution, replacement reference or refund amount, actor, and timestamps.

## Replacement

- Policy: Replacement may use available Ready Stock or supplier/future-batch supply when the same intended variant can be supplied.
- Reason: The customer should receive the intended item where operationally feasible.
- Allowed: One explicit replacement resolution and a bounded reference to the replacement fulfillment path.
- Not Allowed: Rewriting the original item, inventing a store-credit wallet, or claiming replacement without an operational reference.
- Domain Consequence: The original order item remains immutable; the exception stores `resolution=replacement` and the replacement reference.
- Customer Consequence: The account shows replacement arranged; no refund is promised by the replacement selection.
- Admin Consequence: Admin owns the feasibility decision and follow-up fulfillment.
- Financial Consequence: No invoice reduction or payout is created for a replacement-only resolution.
- Audit Requirement: Record replacement selection and reference.

## Refund Obligation

- Policy: A refund obligation means BFG owes the customer money; it is separate from a payout.
- Reason: Recording what is owed must not pretend money has already moved.
- Allowed: Create an obligation for recoverable settled value and preserve payment/invoice history.
- Not Allowed: Deleting approved payments, calling an obligation paid before a successful transfer, or over-crediting an obligation.
- Domain Consequence: A canonical obligation has amount, paid amount, held payout amount, source, customer, and remaining status.
- Customer Consequence: Customer may see pending, processing, or paid-safe status.
- Admin Consequence: Admin may create payout attempts only within the remaining obligation.
- Financial Consequence: `remaining = obligation - successful payouts`; IDR values are safe integers.
- Audit Requirement: Record creation, source reference, amount, and every status transition.

## Refund Disbursement

- Policy: Payout lifecycle is `pending → processing → paid` or `processing → failed`; failed attempts may be retried.
- Reason: BFG needs an auditable operational handoff without storing sensitive banking credentials.
- Allowed: Authorized admin/owner may create a payout amount, start it, and record paid/failed outcome with channel and reference note.
- Not Allowed: Customer marking a payout paid, arbitrary edits to a paid payout, or payout amounts above the obligation.
- Domain Consequence: Pending/processing amounts are held against concurrent payout attempts; paid amount is updated only on success.
- Customer Consequence: Customer sees safe refund progress, never internal banking credentials.
- Admin Consequence: Financially authorized admin/owner performs transitions with confirmation and error feedback.
- Financial Consequence: Payment history remains; payout is a new auditable record.
- Audit Requirement: Record obligation, amount, channel, reference/note, actor, status, and processed timestamp.

## Partial Refund

- Policy: One obligation may be settled by multiple successful payouts when needed.
- Reason: Supplier recovery and operational transfer limits may be partial.
- Allowed: Multiple non-overlapping payout attempts whose successful total never exceeds the obligation.
- Not Allowed: Concurrent overpayment, changing a paid amount, or treating a failed attempt as settled.
- Domain Consequence: Held payout amounts reserve remaining capacity; failed attempts release their hold; successful attempts reduce remaining value.
- Customer Consequence: Refund remains in progress until the remaining amount reaches zero.
- Admin Consequence: Admin must create a new retry/partial payout rather than editing history.
- Financial Consequence: `total successful payouts <= obligation amount`.
- Audit Requirement: Every partial attempt and result is independently recorded.

## Deposit Refund

- Policy: Only unallocated available deposit may be requested for refund.
- Reason: Allocated deposit is still committed to an active invoice/order obligation.
- Allowed: Customer or authorized admin may request an amount no greater than current available unallocated IDR deposit; payout uses the refund lifecycle.
- Not Allowed: Refunding allocated/reserved deposit, editing the balance number, or reducing the balance before a payout outcome is recorded.
- Domain Consequence: Payout attempts temporarily reserve the requested amount in the append-only ledger; success writes release plus debit consequences, failure writes release only.
- Customer Consequence: Deposit remains visible until payout success/failure is resolved; a failed payout does not make money disappear.
- Admin Consequence: Admin starts and records payout outcome; server checks available capacity and concurrent holds.
- Financial Consequence: Successful payout creates a negative append-only ledger consequence; failed payout restores availability.
- Audit Requirement: Record request, payout, ledger references, amount, actor, and outcome.

## Manual Non-Account Customers

- Policy: NOT SUPPORTED in Phase 06.7.
- Reason: Arbitrary identities would break ownership, invoice, deposit, payment, refund, and history guarantees.
- Allowed: Admin-assisted orders for existing active BFG customer `appUsers` only.
- Not Allowed: Name/phone/WhatsApp-only customer records or fake app users.
- Domain Consequence: `orders.customerUserId` remains a verified active customer relation.
- Customer Consequence: Every order belongs to a real BFG account.
- Admin Consequence: Assisted order form requires selecting an existing eligible customer.
- Financial Consequence: Payment, deposit, refund, and invoice ownership remain unambiguous.
- Audit Requirement: Record the authenticated admin actor and canonical customer/order references.

## Join Request Retention

- Policy: Retain Join requests as admission and audit history; no automatic deletion is introduced in this phase.
- Reason: Approved and rejected outcomes are operational evidence and rejected history supports controlled resubmission.
- Allowed: Forward-only review transitions and bounded operational corrections with audit support.
- Not Allowed: Automatic cron deletion or casual conversion of a Join request into an editable CRM profile.
- Domain Consequence: `joinRequests` rows remain after approval/rejection and keep their review fields.
- Customer Consequence: Admission history is not silently lost.
- Admin Consequence: Admin sees historical submitted, under-review, approved, and rejected records.
- Financial Consequence: None; Join records never create money or ownership.
- Audit Requirement: Review actions retain actor and timestamp; future privacy-retention policy must be explicit and configurable.

## Explicit Phase Limits

- Ready Stock payment-expiry automation is deferred; reservations remain until payment/admin progression or explicit cancellation/rejection.
- Full Admin visual redesign, reporting, Excel export, analytics, CMS, settings, notification platform, and payment gateway remain Phase 07+ backlog.
- This policy does not create a store-credit, wallet, or automated supplier-recovery system.
