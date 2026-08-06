# Phase 03.2 — Batch tracking, invoice & deposit persistence

Status: implementation complete; isolated Preview handoff pending until the
deployment verification section is updated.

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

Update this section only after evidence exists:

- [ ] isolated Convex Preview deployment identified by name
- [ ] Vercel Preview is READY from this branch
- [ ] Preview route and runtime-log checks pass
- [ ] Preview operational E2E passes with targeted cleanup
- [ ] new operational tables are empty before QA and after cleanup
- [ ] Development remains separate and Production remains untouched

## Known limitations

The prototype has no final accounting policy, payment settlement, refund,
tax, customs, shipping, exchange-rate, or identity layer. Assignment
reassignment correction and backward stage correction are deferred. The
Preview session boundary must be replaced by Clerk and Production
authorization before real customer or financial use.

## Exit gate

Completion requires the Preview checklist above, no committed secrets, no seed
records, no Production changes, and no merge to `main`.
