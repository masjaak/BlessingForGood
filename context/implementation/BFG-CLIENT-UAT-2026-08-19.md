# BFG Client UAT Stabilization — 2026-08-19

## Objective

Stabilize the exact client findings from Phase 08 UAT, preserve every already
green domain, deploy the focused fixes, complete authenticated Admin/Customer
Production recheck, then resume the legitimate 3–5-book Bulk Import V1 pilot.

## Current authority

- Latest client UAT findings in the Phase 08 task prompt.
- `context/product/PRD-CLIENT-AMENDMENTS-2026-08-19.md` for product changes.
- `context/SOURCE_OF_TRUTH.md`, `context/DECISION_LOG.md`, and canonical
  state/security/financial matrices for implementation constraints.
- Existing Production behavior is evidence, not requirement authority.

## Locked preservation boundaries

Clerk authentication, `appUser` authorization, customer ownership, Secret
Catalog security, Ready Stock reservations, invoice snapshots, append-only
deposit ledger, refund separation, Bulk Import V1 contract, customer
homepage structure, BFG dropdown visual language, Indonesian copy, headline
system, and page-aware loading states remain unchanged except for direct
regressions proven by this UAT scope.

## State-machine audit scope

- Invoice: `draft → issued → void`; void preserves the invoice and denies
  settled or unresolved payment states.
- Deposit: append-only credit/reservation/release/reversal ledger; allocation
  is bounded by available balance and invoice outstanding amount.
- Batch: editable until the first shipment stage; shipment transition locks
  roster, assignments, and Catalog links.
- Batch roster: assignments are the canonical selected-customer/item state;
  Purchase Summary is a derived aggregation.
- Batch ↔ Catalog: link/unlink is relationship mutation only; unlink never
  deletes a Catalog or Batch and is blocked by active incompatible assignments.

## Implementation strategy

For each finding: reproduce, trace the shared source, add the smallest
regression that can prove the behavior, fix the shared cause, rerun the
original journey, and record local/rendered/Production evidence separately.

## Production boundary

No dummy invoices, deposits, customers, orders, Catalogs, Batches, or books
may be created in Production. Authenticated verification may use existing
legitimate records. A manual login checkpoint may be requested without asking
for passwords, OTPs, cookies, JWTs, or secrets. Bulk Import requires a real
client CSV and an authenticated Admin checkpoint.

## Current status

Implementation is in progress. Phase 08 is not stabilized and Bulk Import V1
is not closed until the UAT matrix is all GREEN and the authenticated real-data
pilot proves persistence, draft/inactive safety, audit, idempotent preview,
and zero customer leakage.
