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
isolated tests and removed by their guarded cleanup path. The cleanup path is
Preview-capability-only, requires an explicit test marker and exact catalog or
book IDs/names, and is not a general reset.

## Verified handoff

[CONVEX VERIFIED] Development and branch Preview deployments passed schema
deployment, codegen, Convex tests, keyed access-code/session handling, atomic
order snapshots, ownership checks, and edit-before-close/lock-after-close
transitions.

[PREVIEW VERIFIED] Vercel Preview `dpl_4BxuvP1MvDzS9kktZyGfTmrmcAGk` is READY
at `https://blessing-for-good-1zm4ur6w9-masjaaks-projects.vercel.app`. All 56
Playwright tests passed across the required viewport projects. The route matrix
returned HTTP 200 for all 12 implemented routes, and all Phase 03.1 business
tables were empty after cleanup.

## Adapter status

`ConvexPrototypeProvider` is the primary adapter when a valid
`NEXT_PUBLIC_CONVEX_URL` is injected. The local adapter remains an explicit
development fallback. Existing invoice/deposit UI foundation remains local and
is intentionally not part of Phase 03.1 persistence.

## Exit status

`implemented` on `feat/convex-core-persistence-v0.1`. Production Vercel,
Production Convex, Clerk, and `main` remain untouched.
