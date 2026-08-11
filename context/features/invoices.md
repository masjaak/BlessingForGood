# Invoices

Status: [REPOSITORY] implemented on the Phase 05.1 feature branch; runtime
integration QA is deferred to stable staging.

An admin creates a draft invoice from the authoritative persistent order-item
snapshots. Invoice items store title, publisher, format, ISBN, quantity, unit
price, and subtotal snapshots; client-submitted totals are ignored. Currency
is integer IDR.

Lifecycle:

```text
draft → issued → void
```

One non-void invoice is allowed per order. Voiding preserves the prior record;
a future revision must create a new invoice. Invoice numbers are generated
from the unique Convex invoice ID inside the mutation and are collision-safe
for this Preview prototype, not final accounting policy.

Deposit requirements are explicitly selected as `none`, fixed Rupiah, or
integer basis points. Percentage calculation uses integer arithmetic and
rounds to the nearest whole Rupiah. Shipping, customs, tax, discount,
exchange-rate, and arbitrary manual lines are not calculated.

Customers can query only owned invoices and see line snapshots, requirement,
allocated deposit, verified manual payment, payment state, and outstanding
amount. Invoice lifecycle and payment state remain separate:

```text
invoice.status: draft → issued → void
invoice.paymentStatus: unpaid | payment_submitted | partially_paid | paid
```

Approved manual payment confirmations increment
`verifiedPaymentAmount`; deposit allocation remains separate. The authoritative
outstanding amount is:

```text
max(0, adjustedTotalAmount - allocatedDepositAmount - verifiedPaymentAmount)
```

Payment gateway settlement, overdue policy, refund, withdrawal, chargeback,
and final tax states are deferred. See
`context/features/payment-verification.md`.

## Phase 06.4 exception adjustments

Issued invoices retain `totalAmount` and invoice-item snapshots. A resolved
non-neutral order exception creates an append-only financial adjustment and
projects `adjustedTotalAmount`, `overpaymentAmount`, and
`refundObligationAmount`; it does not edit the issued snapshot. Settlement is
derived from adjusted total, active deposit allocations, and approved external
payments. A `refund_due` obligation does not execute a payout.
