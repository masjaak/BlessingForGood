# Phase 05.1 — Payment Verification and Operational Handoff

## Status

```text
IMPLEMENTATION COMPLETE
LOCAL VALIDATION GREEN
RUNTIME INTEGRATION QA DEFERRED TO STAGING
PRODUCTION READINESS NOT READY
```

## Objective

Connect customer payment confirmation to the authoritative invoice and manual
admin review workflow without introducing a payment gateway.

## Decisions

- Convex is the source of truth for confirmations, invoice payment state,
  review actors/timestamps, and audit history.
- `paymentConfirmations` is a separate append-only-attempt table. Reviewed
  confirmation fields are not edited or overwritten.
- Invoice lifecycle (`draft`, `issued`, `void`) stays separate from payment
  confirmation state and invoice payment projection.
- External approved payment is tracked in
  `invoices.verifiedPaymentAmount`; deposit allocation remains in the existing
  append-only deposit ledger.
- Integer IDR is mandatory. Approved settlement cannot exceed the current
  outstanding amount.
- One `submitted` or `under_review` confirmation is allowed per invoice. A
  rejected attempt remains visible and may be followed by another attempt.
- Proof is an optional future reference string. No binary or base64 content is
  stored in Convex.
- Existing invoice/deposit permissions are reused: customers use own-invoice
  access; admin/owner use operational invoice management.

## Delivered

- `paymentConfirmations` schema, indexes, validators, and server functions;
- customer submit/list/read flow on invoice detail;
- `/admin/payments` queue and resolved-history surface;
- atomic approval/rejection/review transitions and audit rows;
- invoice payment projection updated on approval and deposit allocation;
- focused authorization, duplicate, rejection/resubmission, stale approval,
  audit, suspension, and deposit-plus-transfer tests;
- context documentation and staging backlog updates.

Local evidence: `npm run check` passes with 65 Vitest tests;
`npm run convex:test` passes with 38 Convex tests; `git diff --check` passes.

## Runtime boundary

The implementation is not real Clerk, Vercel, Convex Preview, or browser
runtime evidence. Full integration QA is intentionally deferred to one stable
staging environment. Transient branch Preview debugging is not a Phase 05.1
gate.

## Staging acceptance backlog

Run in staging before Production handoff:

- customer Clerk sign-in and JWT identity reaching Convex;
- customer submission, duplicate prevention, rejection/resubmission;
- admin/owner review, approval, rejection, and audit history;
- suspended-user denial and customer A/B isolation;
- deposit plus transfer settlement and invoice totals;
- proof-reference handling and browser/responsive behavior;
- realtime customer/admin updates, runtime logs, guarded data cleanup, and
  authenticated Playwright coverage.

## Out of scope

Payment gateways, bank APIs, automatic matching/reconciliation, webhooks,
refunds, withdrawals, chargebacks, multi-currency, uploads, notifications,
Production authentication/deployment, and Phase 04.2 identity hardening.

## Next action

Merge the feature branch into `develop` through the normal review process, then
run the complete Phase 05.1 and deferred Phase 04.1 integration backlog in the
long-lived staging environment.
