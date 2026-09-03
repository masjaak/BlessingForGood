# Invoices

Status: [REPOSITORY] implemented; new Customer × Batch issuance is covered by
focused local Convex regressions. Authenticated Production/UAT remains a
separate release gate.

An admin creates a draft invoice from the authoritative persistent order-item
snapshots. Invoice items store title, publisher, format, ISBN, quantity, unit
price, and subtotal snapshots; client-submitted totals are ignored. Currency
is integer IDR.

Lifecycle:

```text
draft → issued → void
```

For new Batch-assigned cycles, at most one active non-void invoice is allowed
per `customerUserId × batchId`; the representative `orderId` is retained for
compatibility and `invoiceItems` preserve every historical line. Admin remains
the only issuer, and repeated Customer × Batch issue returns the existing
issued invoice. Voiding preserves the prior record. Existing issued
per-Order invoices remain historical compatibility records and are not blindly
migrated. Unbatched legacy creation remains only as a compatibility path.

Admin `invoices.voidInvoice` is the canonical destructive resolution for an
Invoice that must leave the active workflow. Physical Invoice deletion is not
supported. Voiding is server-guarded while allocated or verified settlement is
present, or while a payment confirmation is submitted or under review, and it
preserves the Invoice, Order, InvoiceItem, payment proof, Deposit, Refund, and
Audit history.

Invoice numbers are generated from the unique Convex invoice ID inside the
mutation and are collision-safe for this Preview prototype, not final
accounting policy.

Deposit requirements are explicitly selected as `none`, fixed Rupiah, or
percentage. Admin UI accepts human `0–100%` (including supported decimals) and
converts at the boundary to canonical `0–10000` basis points. Percentage
calculation uses integer arithmetic and rounds to the nearest whole Rupiah.
Shipping, customs, tax, discount, exchange-rate, and arbitrary manual lines are
not calculated.

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

Payment gateway settlement, overdue policy, withdrawal, chargeback, and final
tax states are deferred. Phase 06.7 adds explicit refund obligations and
auditable admin payout records; a payout never deletes payment history. See
`context/features/payment-verification.md`.

## Phase 06.4 exception adjustments

Issued invoices retain `totalAmount` and invoice-item snapshots. A resolved
non-neutral order exception creates an append-only financial adjustment and
projects `adjustedTotalAmount`, `overpaymentAmount`, and
`refundObligationAmount`; it does not edit the issued snapshot. Settlement is
derived from adjusted total, active deposit allocations, and approved external
payments. A `refund_due` obligation does not execute a payout; `/admin/refunds`
records a separate pending/processing/paid/failed payout lifecycle.
