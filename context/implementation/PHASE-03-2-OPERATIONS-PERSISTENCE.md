# Phase 03.2 — Batch tracking, invoice & deposit persistence

Status: complete; isolated Convex Preview and Vercel Preview verification is
recorded below.

## Objective

Extend the Phase 03.1 persistent preorder slice into a guarded operational
flow for batches, shipment tracking, order fulfillment, invoice snapshots,
deposit requirements, and an append-only deposit ledger.

## Source and boundary

[REPOSITORY] Canonical source is `/Users/masjak/Developer/BlessingForGood` on
`feat/convex-operations-persistence-v0.1`, based on
`feat/convex-core-persistence-v0.1`.

[PROTOTYPE ASSUMPTION] Identity remains an expiring Preview prototype session.
Production remains fail-closed. Clerk, Production authorization, payment
gateway, payment reconciliation, refund processing, shipping/customs APIs,
WhatsApp API, Production deployment, and `main` merge are not included.

## Implemented persistence

- `batches`, `catalogBatchLinks`, and `orderItemBatchAssignments` persist
  cargo relationships and quantity-safe allocation.
- `batchStatusHistory` persists the separate shipment timeline.
- `orders.currentFulfillmentStage` and `orderFulfillmentHistory` persist the
  separate fulfillment timeline.
- `invoices` and `invoiceItems` persist immutable order snapshots, exact IDR
  totals, requirement calculation, allocation summary, and draft/issued/void
  lifecycle.
- `depositAccounts`, `depositTransactions`, and
  `invoiceDepositAllocations` persist zero-start account summaries, append-only
  ledger effects, and reservation-backed invoice allocations.

## Transition and financial rules

[PROTOTYPE ASSUMPTION] Shipment stages are `po_closed`,
`ordered_to_supplier`, `shipped_internationally`, `customs`,
`to_indonesia_warehouse`, and `at_store`. Fulfillment stages are
`awaiting_payment`, `awaiting_address`, `packing`, `shipped`, and `completed`.
Both are forward-only; shipment skips require explicit admin confirmation.

[PROTOTYPE ASSUMPTION] Deposit requirements are `none`, `fixed`, or
`percentage`; percentages are integer basis points and use integer nearest
Rupiah rounding. Invoice numbers use the unique Convex document ID after
insert and are prototype numbering, not final accounting policy.

[PROTOTYPE ASSUMPTION] Historical ledger rows are immutable. Release restores
available funds, reservation moves available to reserved, and reversal writes
an exact inverse row referencing the original.

## Security boundary

Admin mutations validate the server-side Preview capability, current
non-expired admin session, references, state transitions, and financial
invariants. Customer queries validate the current customer session and order,
invoice, account, allocation, or transaction ownership on the server.
Session tokens and access codes are never stored raw or returned to the UI.

## Frontend routes

Customer routes:

```text
/account/orders
/account/orders/[orderId]
/account/invoices
/account/invoices/[invoiceId]
```

Admin routes:

```text
/admin/batches
/admin/batches/[batchId]
/admin/orders
/admin/orders/[orderId]
/admin/invoices
/admin/invoices/[invoiceId]
```

Active Convex screens use reactive queries and explicit loading, empty, and
error states. The local adapter remains an explicit local-development fallback
and is not merged with Convex records in one screen.

## Validation before Preview

[CONVEX VERIFIED] `npm run convex:codegen` passes; the real Development
deployment accepted the current functions and schema.

[CONVEX VERIFIED] 27 Convex tests cover batch relationships, shipment and
fulfillment transitions, invoice snapshots and requirements, ownership,
ledger arithmetic, allocation, release, reversal, and zero-data behavior.

[REPOSITORY] 51 Vitest tests, `npm run check`, lint, typecheck, build, and the
complete 60-test Playwright matrix pass across 375×812, 768×1024, 1024×768,
and 1440×900. The browser flow proves admin/customer realtime tracking,
invoice and deposit updates, release behavior, and second-customer isolation.

## Preview handoff checklist

- [x] isolated Convex Preview deployment identified by name
- [x] Vercel Preview is READY from this branch
- [x] Preview route and runtime-log checks pass
- [x] Preview operational E2E passes with targeted cleanup
- [x] new operational tables are empty after cleanup
- [x] Development remains separate and Production remains untouched

## Preview verification

[PREVIEW VERIFIED] Convex Preview deployment
`preview/feat-convex-operations-persistence-v0-1` is `charming-horse-40` at
`https://charming-horse-40.convex.cloud`. The current branch schema and
functions are deployed, and the four server-side Preview environment names
are configured outside Git. No Production Convex deployment was selected.

[PREVIEW VERIFIED] Vercel Preview deployment
`dpl_As6GRhi5NcGWCPALZMTbkMYUstJC` is READY at
`https://blessing-for-good-a2nl9jhjf-masjaaks-projects.vercel.app`. The remote
build deployed the Convex functions and generated all 19 App Router routes.

[PREVIEW VERIFIED] `60/60` Playwright tests pass across 375×812, 768×1024,
1024×768, and 1440×900. The operational flow proves batch assignment,
shipment and fulfillment realtime updates, invoice snapshots, deposit credit,
allocation, release, reload persistence, targeted cleanup, and
cross-customer isolation.

[PREVIEW VERIFIED] All Phase 03.1 and Phase 03.2 business tables report no
documents after guarded cleanup. Vercel has no error-level runtime logs for
the final run. Convex history contains only expected unauthenticated
negative-path entries from route smoke checks; no secret values are logged.

## Known limitations

The prototype has no final accounting policy, payment settlement, refund,
tax, customs, shipping, exchange-rate, or identity layer. Assignment
reassignment correction and backward stage correction are deferred. The
Preview session boundary must be replaced by Clerk and Production
authorization before real customer or financial use.

## Exit gate

Completion is satisfied: the Preview checklist is complete, no secrets or seed
records are committed, Production is unchanged, and no merge to `main` was
performed.
