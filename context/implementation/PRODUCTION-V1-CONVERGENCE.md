# BFG Production V1 Convergence

## Objective

Converge current `develop` business logic, the original PRD, supplied mockups,
official brand assets, and selected QA UX patterns into one coherent release on
`release/production-v1` without changing `main` or deploying Production before
readiness is reported.

## Source-of-truth decisions

- Phase 01–06.4 on `develop` is the functional authority.
- The original PRD pack is read-only scope evidence.
- `public/mockups` and `public/brand` are the visual/brand authority.
- `origin/qa/ux-refinement-v0.1` is a style/component donor only.
- No QA branch store, browser persistence, legacy role simulation, or business
  assumption is merged.

## Runtime decision

The root product provider uses canonical Convex whenever
`NEXT_PUBLIC_CONVEX_URL` is a valid HTTP(S) URL. Missing configuration fails
closed. The browser-local store, Preview/demo flags, Preview banner, local role
store, and dead local invoice path were removed. The existing
`src/domain/prototype` directory remains a historical compatibility location
for shared order types and pure logic; no route depends on a prototype mode.

## Customer dashboard and history

`/account` derives its view from existing owned queries:

- orders and order status history;
- invoices and authoritative payment projections;
- deposit account and append-only transactions;
- customer-safe order exception views and history.

The activity projection is bounded, chronological, contains no admin internal
notes/actors, and creates no new database source of truth.

## Financial invariants

- All amounts remain integer IDR.
- Invoice, payment, allocation, deposit ledger, financial adjustment, and refund
  obligation records remain authoritative.
- Dashboard/history code is read-only and does not recompute settlement rules.
- Approved payments and historical ledger entries are never edited or deleted.
- `refund_due` is displayed as an obligation; no payout, withdrawal, reversal,
  or bank transfer is executed.

## Customer operations

`/admin/customers` reuses the active customer selector already required by
admin-assisted orders. Customer detail reads profiles, addresses, canonical
orders, invoices, and exceptions through existing admin-authorized functions.
Role/suspension management remains owner-only at `/admin/users`.

## Known limitations

- Ready Stock purchase recording remains blocked by policy and uses an admin
  contact handoff.
- Reporting, Excel export, and analytics are not implemented.
- Catalog browse/detail does not reproduce every mockup tab/gallery pattern.
- Durable image/proof upload is not implemented.
- Customer and admin lists retain documented bounded-query ceilings.
- Final brand/community copy remains customer-owned content.

## Release boundary

No Preview or staging gate is required. `main` stays untouched until the final
local regression, rendered route QA, and names-only Production Clerk/Convex/
Vercel preflight produce a readiness decision.

## Release QA result

- `npm run check`: PASS with 92/92 Vitest tests, zero lint warnings/errors,
  TypeScript PASS, and a 25-page Next.js build PASS.
- `npm run convex:test`: 61/61 PASS.
- Responsive signed-out route QA: 93/93 PASS across customer widths 375, 390,
  430, and 768 plus admin widths 1024, 1280, and 1440.
- Public pages, Clerk entry, protected-route redirects, logo rendering, Ready
  Stock zero state, horizontal overflow, console errors, and page errors were
  checked. Authenticated role/data journeys remain part of the eventual
  Production smoke because no release test identities were supplied.

## Production preflight result

- Linked Vercel project: `masjaaks-projects/blessing-for-good`.
- Git integration: `masjaak/BlessingForGood`; Production branch: `main`.
- Production environment variable count: zero. Required Clerk and Convex names
  are therefore absent.
- The current historical Production target is an errored prototype-era `main`
  deployment and has no assigned custom domain.
- Canonical Convex identifiers remain `content-snake-214` and `clean-eel-522`.
  Names-only CLI checks were stopped after access was denied; no project/account
  switch or deployment creation was attempted.

Release code is complete, but the `main` merge is `PRODUCTION_BLOCKED` until the
single Production-environment setup is completed with live Clerk credentials,
the verified Production domain/redirects, and the deploy key/environment for
canonical Convex Production `clean-eel-522`.
