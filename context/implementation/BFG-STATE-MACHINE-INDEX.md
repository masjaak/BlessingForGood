# BFG STATE MACHINE INDEX

Reconciled: 2026-08-15
This is an index, not a second implementation. The named Convex validators,
transition helpers, mutations, and tests are canonical.

| Domain | States | Events / transitions | Guards / invalid transitions | Canonical implementation | Tests |
|---|---|---|---|---|---|
| Admission | `submitted`, `under_review`, `approved`, `rejected` | submit, start review, approve, reject, retry admission | duplicate active request; review only from expected state; Clerk alone cannot admit | `convex/joinRequests.ts`, `convex/users.ts`, `validators.ts` | `convex/phase071-reconciliation.test.ts`, policy/auth tests |
| Invitation acceptance | `route_booting`, `ticket_processing`, `missing_requirements`, `verification_required`, `signup_complete`, `finalizing`, `session_activating`, `waiting_for_convex`, `membership_reconciling`, `active`, `session_mismatch`, `invalid_or_expired`, `error` | mount route, process `__clerk_ticket`, render Clerk-reported fields, verify/Protect, finalize, activate session, await Convex auth, reconcile membership, redirect Account | no ticket; invalid/expired ticket; no invented fields; verification/Protect cannot be bypassed; different Clerk session cannot claim invite; Account redirect requires active BFG Customer | `src/components/clerk-invitation-acceptance.tsx`, `src/components/clerk-invitation-form.tsx`, `src/domain/prototype/convex-store.tsx`, `convex/userProvisioning.ts`, `convex/users.ts` | `tests/components/clerk-invitation-acceptance.test.tsx`, auth/admission tests |
| appUser access | missing, `active`, `suspended` | admitted/ensure, suspend, reactivate | `requireActiveUser`; missing appUser and suspended users fail closed | `convex/lib/auth.ts`, `convex/users.ts` | auth/security tests |
| Product publication | `draft`, `published`, `special`, `archived` | create/update/publish/archive | customer projections exclude invalid publication/availability; archived edit guarded where applicable | `convex/books.ts`, `convex/lib/catalogView.ts` | product/phase071 tests |
| Ready Stock reservation | `active`, `released`, `fulfilled` | reserve, release on cancellation, fulfill on completion | no negative available; repeated release/fulfillment no-op/guarded; `onHand-reserved` | `convex/lib/readyStockReservations.ts`, `convex/orders.ts`, `convex/orderFulfillment.ts` | policy/Ready Stock tests |
| Order | `submitted`, `cancelled`, `completed` | submit, cancel via exception resolution, complete | no direct cancellation shortcut; completed requires no unresolved exception; Ready Stock completion fulfills reservations | `convex/orders.ts`, `convex/orderExceptions.ts` | order/policy tests |
| Batch PO | editable/unset, six shipment stages, archived | create/link/assign, stage update, archive | forward state helper; stage locks catalog/roster edits; archived terminal | `convex/batches.ts`, `convex/batchTracking.ts`, `convex/lib/shipmentTransitions.ts` | batch/state tests |
| Shipment tracking | `po_closed`, `ordered_to_supplier`, `shipped_internationally`, `customs`, `to_indonesia_warehouse`, `at_store` | update stage | no backward transition; no skip unless explicit `allowSkip` path | `convex/lib/shipmentTransitions.ts`, `batchTracking.ts` | transition tests |
| Fulfillment tracking | `awaiting_payment`, `awaiting_address`, `packing`, `shipped`, `completed` | update stage | sequential helper and exception guard; this phase has no payment-settlement guard; completion triggers Ready Stock consume | `convex/lib/fulfillmentTransitions.ts`, `orderFulfillment.ts` | fulfillment/policy tests |
| Secret Catalog | `draft`, `open`, `closed`, `archived` | create/open/close/archive behavior | closed/archived cannot reopen; effective close time denies access | `convex/secretCatalogs.ts`, `convex/lib/catalogView.ts` | catalog tests |
| Catalog access code | active, revoked, expired/invalid | generate, redeem, revoke, expiry | digest/pepper; no plaintext persistence; rate limit; catalog scope | `convex/catalogAccess.ts`, `convex/lib/accessCodes.ts` | security/access tests |
| Catalog access session | active, expired, revoked | issue on unlock, validate per query | session digest/expiry/revocation; no cross-catalog use | `convex/catalogAccess.ts`, `convex/lib/sessions.ts` | access/session tests |
| Member catalog grant | active, revoked, expired/closed effective | grant, revoke, expiry/close | active customer target; Admin/Owner mutation; ownership still required for order | `convex/catalogAccess.ts`, schema grants | access/ownership tests |
| Invoice | `draft`, `issued`, `void` | create, issue, void | no issue void; controlled relation/order; snapshot immutable | `convex/invoices.ts`, `convex/lib/invoiceProjection.ts` | invoice tests |
| Invoice payment | `unpaid`, `payment_submitted`, `partially_paid`, `paid` | submit proof, approve payment, allocate deposit | derived from approved/pending consequence; no manual settlement | `convex/paymentConfirmations.ts`, `convex/lib/invoiceCalculations.ts` | payment/financial tests |
| Payment confirmation | `submitted`, `under_review`, `approved`, `rejected` | submit, start review, approve/reject | reviewable state and invoice ownership; private proof | `convex/paymentConfirmations.ts` | payment tests |
| Deposit top-up | `submitted`, `under_review`, `approved`, `rejected` | submit proof, review, approve/reject | proof/file/amount validation; approval creates ledger credit | `convex/depositTopUps.ts` | deposit tests |
| Deposit allocation | `active`, `released`, `reversed` | allocate, release, reverse | sufficient available/reserved; no repeated release/reverse | `convex/invoiceDepositAllocations.ts`, `convex/lib/depositLedger.ts` | financial/policy tests |
| Deposit ledger | append-only `credit`, `reservation`, `release`, `debit`, `reversal` | record credit/adjust, allocate/release/reverse | non-negative available/reserved; no edit/delete | `convex/depositTransactions.ts`, `convex/lib/depositLedger.ts` | ledger tests |
| Cancellation | eligible, requires admin review, not eligible | evaluate, request/open exception, resolve | fulfilled/cancelled/conflicted/payment/batch guards | `convex/lib/cancellationEligibility.ts`, `convex/orderExceptions.ts` | exception/cancellation tests |
| Exception | `opened`, `under_review`, `resolution_selected`, `resolved`, `rejected` | open, review, select resolution, resolve/reject | state-specific actions; affected quantity and recovery bounded | `convex/orderExceptions.ts`, `convex/lib/orderExceptionState.ts` | policy/phase071 tests |
| Refund obligation | `none`, `credit_due`, `refund_due`, `settled`; lifecycle `pending`, `partially_paid`, `paid` | create/sync obligation, payout settlement | obligation distinct from payout; amount cannot exceed recoverable value | `convex/refunds.ts`, schema validators | refund/policy tests |
| Refund payout | `pending`, `processing`, `paid`, `failed` | create, start, record paid/failed, retry | only pending starts; processing records; no overpayment | `convex/refunds.ts` | refund policy tests |
| Notification | unread, read | create event, mark read | recipient ownership; no fake rows; `readAt` is only read mutation | `convex/notifications.ts`, `convex/lib/notifications.ts` | notification ownership tests |
| Inbox/message | unread, read | create event-backed operational message, mark read | recipient/role scope; no social-chat state | `convex/notifications.ts` with `surface=inbox` | activity/inbox tests |
| Content | `draft`, `published` | upsert, publish | approved content key; public query only published | `convex/contentBlocks.ts` | content tests |
| Staff invitation | `pending`, `claimed`, `revoked` | invite, claim on matching Clerk email, revoke | owner/Admin policy; only pending can revoke/claim | `convex/users.ts`, schema | user/security tests |

## Transition Rule

Every stateful mutation must name its source state, target state, guard, side
effect, audit consequence, customer projection, and invalid-transition test in
[`BFG-BUSINESS-CONSEQUENCE-MATRIX.md`](BFG-BUSINESS-CONSEQUENCE-MATRIX.md).

## Invitation submit clarification — 2026-08-28

The `missing_requirements` form enters a submitting state only for the
duration of the Clerk `password`/`update` call. A returned or thrown Clerk
field error transitions back to `missing_requirements` with a mapped field
message and preserves the current ticket for correction. A successful update
re-reads the current Clerk resource and transitions to another requirement,
verification, or `signup_complete`; it never finalizes from submitted field
names alone. Finalization, session activation, Convex readiness, and active
membership remain the existing downstream gates.

## Maintenance guard clarifications — 2026-08-22

No new lifecycle states were added. The current guards are:

- Invoice creation/issue continues to use the existing eligible-order
  financial flow, including the pre-invoice exception-adjustment path; the
  Order detail CTA reflects actual invoice presence rather than a duplicate
  state machine.
- Batch linking and item movement require the linked Secret Catalog's
  `closesAt` to equal the Batch `poDeadlineAt` (including both being unset).
- Book Save remains an editable `draft` update; publication is an explicit
  `books.update(..., publicationStatus: "published")` action, with the same
  Admin/Owner authorization and audit boundary.
