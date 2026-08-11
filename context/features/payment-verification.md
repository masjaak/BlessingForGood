# Payment verification v0.1

Status: [REPOSITORY] implementation complete; [LOCAL VERIFIED] Convex and web
validation required by the phase; real integration QA is deferred to stable
staging.

## Source of truth

Convex is authoritative for payment confirmation records, review state, review
actors/timestamps, invoice payment state, and audit history. WhatsApp or other
messaging channels are not payment records.

This phase records manual payment confirmations. It does not connect a bank,
payment gateway, webhook, or automatic reconciliation service.

## Customer workflow

An active customer may submit one pending confirmation for an issued invoice.
The server derives the customer from the authenticated `appUsers` row and
checks the invoice, amount, and current outstanding balance. A rejected attempt
is retained and may be followed by a new submission. A customer cannot approve,
reject, or edit a reviewed attempt.

The submission stores integer IDR amount, payment method, paid date, optional
transfer/proof reference, and optional customer note. Proof is a reference
boundary only; binary files and base64 content are not stored in Convex.

## Admin workflow

`/admin/payments` is the single operational review surface. Admin and owner can
mark a submitted attempt under review, approve it, or reject it with a reason.
The queue is backed by `paymentConfirmations`; the recent history list keeps
approved and rejected attempts visible without duplicating review controls on
the invoice page.

## State model

Invoice lifecycle remains separate:

```text
invoice.status: draft → issued → void
```

Payment confirmation lifecycle is:

```text
submitted → under_review → approved
                         ↘ rejected
```

Invoice payment state is a projection of allocated deposits, approved manual
payments, and pending confirmations:

```text
unpaid | payment_submitted | partially_paid | paid
```

`verifiedPaymentAmount` counts only approved external confirmations.
`allocatedDepositAmount` remains the deposit-ledger settlement component.
`outstandingAmount = totalAmount - allocatedDepositAmount - verifiedPaymentAmount`.

## Approval transaction

Approval rechecks the active reviewer, confirmation state, issued invoice,
current outstanding amount, and integer amount. One Convex mutation then patches
the confirmation, invoice verified amount, invoice outstanding amount, invoice
payment state, and audit event. Re-approval and stale over-amount approvals are
rejected.

Deposit allocations continue to use the append-only ledger and are never copied
into the external payment confirmation amount. This prevents deposit plus
transfer double-counting.

## Authorization

Customer submission and reads use existing own-invoice permissions plus a
server-side `customerUserId` check. Admin and owner review uses existing
`invoices.read.all` / `invoices.manage` permissions. Suspended users fail at the
active-user boundary. Customer B cannot read or mutate customer A's attempts.

## Deferred

- stable staging Clerk and Convex runtime QA;
- durable proof upload/storage implementation;
- payment gateway, bank API, webhook, reconciliation, refunds, withdrawals,
  chargebacks, and accounting integration;
- final payment policy for partial payments, cancellation, and correction
  workflows beyond rejection and resubmission.
