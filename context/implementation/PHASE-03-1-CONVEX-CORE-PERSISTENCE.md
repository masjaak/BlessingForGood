# Phase 03.1 — Convex core persistence

## Objective

Move only the secret-catalog-to-preorder vertical slice from the browser-local
prototype adapter to isolated Convex development and Preview deployments.

## Boundary

In scope: prototype sessions, publishers, books, variants, secret catalogs,
catalog access grants, catalog items, orders, order-item price snapshots,
ownership, edit-before-close, and reactive reads.

Out of scope: Clerk, Production authorization, Production Convex, batch/cargo,
tracking persistence, invoices, deposits, payments, uploads, and WhatsApp API.

## State model

```text
catalog: draft -> open -> closed -> archived
order: submitted -> cancelled | completed
order edit: submitted + open catalog + before close -> replaced snapshots
```

Every transition is guarded server-side. Customer sessions are anonymous,
expiring Preview sessions and are not authentication.

## Deployment separation

```text
local: personal Convex dev deployment
Preview: branch-scoped Convex Preview deployment
Production: untouched and fail-closed
```

No seed data is created during deployment. Test records are created only by
isolated tests and removed by their guarded cleanup path.
