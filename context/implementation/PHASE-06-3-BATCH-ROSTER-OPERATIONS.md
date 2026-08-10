# Phase 06.3 — Batch PO, Roster, and Manual Customer Operations

Status: IMPLEMENTATION COMPLETE locally.

## Objective

Complete the operational bridge from customer order items to Batch PO roster,
purchase summary, shipment tracking, and existing-customer assisted orders
without creating a parallel order or financial system.

## Context audit

- Existing batches, catalog links, assignments, shipment history, fulfillment,
  orders, invoices, and admin routes were reused.
- Batch PO and roster were `PARTIAL`; admin-assisted orders were `MISSING`.
- Non-account manual customers remain `BLOCKED BY BUSINESS DECISION`.

## Implemented

- Reused `currentShipmentStage` as the batch state machine and `po_closed` as
  the roster lock.
- Added derived batch counts, customer roster, purchase summary, and bounded
  unassigned work queue.
- Added atomic assignment unassign/move operations and locked-state guards.
- Added optional order source tracking and admin-assisted order creation for
  existing active customers.
- Added server-side assisted-order idempotency protection and a disabled-while-
  submitting admin form guard.
- Added server-derived customer selection, price snapshots, audit events, and
  canonical order-pipeline integration.
- Added admin batch/order workflow UI and zero-data-safe states.

## Decisions and limitations

- No new batch status machine, supplier-cost model, supplier integration, or
  arbitrary price override was added.
- Customer/public ownership remains rooted in `appUsers`; no fake identities.
- Manual non-account customer creation remains open as
  `MANUAL_NON_ACCOUNT_CUSTOMER_POLICY`.
- Unassigned scanning is bounded to 200 submitted orders/items for v0.1.

## Validation and deferred work

The Phase 06.3 Convex suite passes 52 tests. Full local format, lint,
typecheck, Vitest, build, and `git diff --check` remain the completion gate.
Real Clerk/browser/runtime QA remains deferred to stable staging. No Preview,
staging, Production, or `main` operation is part of this phase.
