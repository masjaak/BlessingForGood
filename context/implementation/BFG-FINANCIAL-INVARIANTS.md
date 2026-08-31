# BFG FINANCIAL INVARIANTS

Reconciled: 2026-08-15
Read before any invoice, payment, deposit, exception, refund, order-price, or
inventory-financial change.

| ID | Invariant | Canonical implementation | Failure prevented |
|---|---|---|---|
| FIN-01 | All commercial amounts are non-negative safe integer IDR values. | `convex/lib/validation.ts`, validators, invoice/deposit calculations | floating-point drift, negative balances, invalid invoices |
| FIN-02 | Order items retain immutable title, publisher, format, ISBN, unit-price, currency, quantity, and subtotal snapshots. | `orderItems` schema and `orders` insertion | later catalog edits rewriting historical orders |
| FIN-03 | Invoice items and invoice totals retain historical snapshots; adjusted totals are derived from append-only exception records. | `invoices`, `invoiceItems`, `invoiceProjection`, exception adjustments | destructive invoice edits |
| FIN-03A | Source-defined DP/final semantics are represented by the invoice deposit requirement/allocation snapshot; no unapproved settlement meaning is inferred. | `depositRequirementMode`, `depositRequirementValue`, invoice projections | changing payment semantics after issuance |
| FIN-04 | Invoice payment status derives from allocated deposit, verified payments, and pending confirmations. | `invoiceCalculations`, payment/invoice projections | manual “paid” shortcut |
| FIN-05 | Payment proof approval is the only path from submitted proof to verified payment consequence. | `paymentConfirmations.approve/reject` | unreviewed settlement |
| FIN-06 | Deposit is an append-only ledger; credit, reservation, release, debit, and reversal are explicit rows. | `depositTransactions`, `depositLedger` | balance edits and missing history |
| FIN-07 | Available deposit cannot become negative and is never directly edited. | ledger delta guard and account projection | over-allocation/overpayment |
| FIN-08 | Deposit allocations have active/released/reversed state and are idempotent. | `invoiceDepositAllocations` and ledger helpers | double release or double reservation |
| FIN-09 | Ready Stock availability is `onHand - reserved`; reservation is atomic and scoped to an order item. | `readyStockInventory`, `readyStockReservations`, reservation helper | overselling, duplicate reservation, negative stock |
| FIN-10 | Ready Stock cancellation releases active reservation; fulfillment consumes it. | `orderExceptions`, `orderFulfillment`, reservation helper | inventory leakage or double consumption |
| FIN-11 | Cancellation/exception financial effect is item-level and append-only. | `orderExceptions`, `orderExceptionFinancialAdjustments` | rewriting original order/invoice/payment history |
| FIN-12 | Post-PO recovery can be zero, partial, or full according to recorded policy; no automatic full refund promise exists. | exception resolution and `recoverableRefundAmount` validation | over-refunding |
| FIN-13 | `refund obligation ≠ cash payout`. | `refundObligations` and `refundPayouts` | conflated obligation/settlement status |
| FIN-14 | Refund payouts are pending → processing → paid or failed/retry and support partial settlement. | `refunds.startPayout/recordPayout` | lost retry, double payout, partial-state corruption |
| FIN-15 | Refund payout amount cannot exceed the remaining obligation; paid obligations cannot be paid again. | payout validation and lifecycle sync | overpayment |
| FIN-16 | Deposit refund is limited to unallocated available deposit; payout holds and successful/failed ledger consequences remain visible. | `refunds.requestDepositRefund`, ledger holds | withdrawing reserved/allocated funds |
| FIN-17 | Order status cannot be cancelled through the generic status mutation; cancellation uses exception policy. | `orders.updateStatus`, `orderExceptions` | bypassed cancellation policy |
| FIN-18 | Fulfillment cannot complete with unresolved exceptions; payment/address/stock guards apply. | `orderFulfillment`, exception state helpers | fulfilment before resolution |
| FIN-19 | Price or catalog changes never rewrite existing order/invoice snapshots. | server-side order/invoice insertion and projection | historical inconsistency |
| FIN-20 | No payment gateway, automatic bank settlement, manual customer identity, or dummy Production settlement is part of the contract. | out-of-scope policy and release rules | unauthorized financial scope expansion |
| FIN-21 | Total Spending is the sum of committed OrderItem selling-price snapshots in the selected date range, independent of payment, deposit, or invoice state; each economic commitment is counted once. | `convex/batchTracking.ts:getBookOverview`, `orderItems` snapshots | paid history disappearing from Customer Books or current Book Master repricing history |
| FIN-22 | Pending Payment is the sum of current outstanding balances on issued invoices only; open/uninvoiced Batch items are not pending payment. Total Deposit is the canonical available Customer deposit balance, not a blind sum of top-ups. | `convex/batchTracking.ts:getBookOverview`, `invoices`, `depositAccounts` | conflating commitment, invoice, and deposit balances |
| FIN-23 | New Batch invoice totals use assigned quantity and immutable OrderItem selling-price snapshots, with at most one active non-void invoice per Customer × Batch; existing issued history is not blindly migrated. | `convex/invoices.ts`, `invoices.batchId`, `invoiceItems` | duplicate invoices, repricing, or destructive historical migration |

## Financial Closure Rule

For every financial mutation, the change must update the consequence matrix,
state index, audit/notification mapping, and an invalid-transition regression.
“The UI displays the right amount” is not financial verification.
