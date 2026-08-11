# Phase 06.4 — Order Exceptions

Status: implementation complete locally on `feat/order-exceptions-v0.1`.

## Objective

Give BFG a safe operational workflow for OOS, defect, customer cancellation,
admin cancellation, resolution, and financial consequence tracking without
rewriting order, batch, invoice, payment, or deposit history.

## Delivered

- Canonical `orderExceptions` item-level domain with immutable event history.
- OOS, defect, customer-cancellation-request, and admin-cancellation cases.
- Forward-only review and resolution state transitions with stale-state guards.
- One server-side cancellation eligibility evaluator.
- Partial affected quantities and remaining fulfillable quantity calculation.
- Admin exception queue at `/admin/exceptions` and order-detail integration.
- Customer-safe order exception history and server-gated cancellation request UI.
- Append-only financial adjustment records and invoice adjusted-total projection.
- Deposit allocation release through existing append-only ledger semantics.
- Refund/credit obligation recording without payout execution.
- Batch lock, assignment, and fulfillment completion guards.
- Authorization, ownership, suspension, privacy, audit, and financial tests.

## Financial decision

Issued invoice history remains the original snapshot. A resolved non-neutral
exception adds a negative integer-IDR adjustment and recalculates the invoice
projection. Approved external payment confirmations remain immutable. Deposit
allocation release creates the existing compensating ledger transaction. Any
overpayment becomes a `refund_due` obligation only; no bank transfer, cash
withdrawal, gateway reversal, or automatic credit is attempted.

## Known ceiling

The v0.1 workflow does not decide cancellation policy, replacement policy,
deposit-refund policy, refund disbursement, post-PO cancellation policy, or
Ready Stock order recording. It also does not upload proof or build reporting
exports. These are documented as business decisions or later phases.

## Verification evidence

- `convex/orderExceptions.test.ts` covers zero data, ownership, transitions,
  partial quantity, lock/payment review, invoice/payment/deposit invariants,
  suspension, audit, and duplicate resolution/release rejection.
- Full Convex regression includes all previous domains.
- Local typecheck, lint, format, test, and build are the implementation gate.
- Canonical Convex codegen was attempted and stopped after selected-project
  access was denied; no alternate project was selected. Generated API typing
  was updated only for the local source tree. Runtime deployment verification
  remains deferred.
- Production, `main`, staging, and transient Preview debugging are outside
  this phase.
