# BFG Project Status

## Production V1 convergence

**Status:** RELEASE CODE COMPLETE — PRODUCTION BLOCKED BY ENVIRONMENT SETUP

**Branch:** `release/production-v1`

**Functional source of truth:** `develop` at the Phase 06.4 integration merge
`6c46b3d`.

**Visual sources of truth:** the customer/admin mockups in `public/mockups`,
the official assets in `public/brand`, and selected visual patterns from
`origin/qa/ux-refinement-v0.1`. The QA branch is not a functional merge source.

**Product scope source:** the original PRD pack at
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/product/` was audited
read-only. Its approved MVP scope, UX flows, design system, tone, and mascot
guidance are reflected in the local coverage matrices.

### Completed in the release worktree

- Preserved the Phase 01–06.4 Clerk, RBAC, ownership, catalogs, Ready Stock,
  order, batch, tracking, invoice, deposit, payment, exception, profile,
  address, and audit domains.
- Removed browser-local product persistence, Preview/demo activation flags,
  prototype presentation, and the customer-side admin setup leak.
- Made a valid `NEXT_PUBLIC_CONVEX_URL` the single product data path; missing
  configuration fails closed.
- Consolidated public and customer copy around Indonesian-first BFG language.
- Added `/account` with actionable order, invoice, deposit, exception,
  refund-obligation, and bounded cross-domain activity projections.
- Added `/admin/customers` and `/admin/customers/[customerId]` using existing
  server-authorized customer, profile, address, order, invoice, and exception
  queries.
- Rebuilt `/admin` around real operational queues without invented analytics.
- Added production-copy/runtime regression coverage.

### Current validation

- Vitest: 92/92
- Convex: 61/61
- Playwright responsive route smoke: 93/93
- Formatting: PASS
- Lint: 0 errors / 0 warnings
- TypeScript: PASS
- Next.js build: PASS (25 pages)
- `git diff --check`: PASS

### Production boundary

`main` and Vercel Production remain untouched. The linked project correctly uses
`main` as its Production branch, but Vercel reports zero Production environment
variables, the historical Production target is errored, and no custom domain is
assigned. Configure live Clerk credentials/domain/redirects and canonical
Convex Production `clean-eel-522` before release. No Preview or staging
deployment is required.

## Canonical Convex

```text
Account: palevvi@gmail.com
Team: palevvi
Project: blessingforgood
Development: content-snake-214
Development reference: dev/masjak
Production: clean-eel-522
```

No similarly named project is authorized. If access is ambiguous, stop that
environment-sensitive operation instead of switching or creating a project.

## Current context

- **Objective:** converge Phase 01–06.4 logic and the approved visual direction
  into one releasable Production V1.
- **Decisions:** current `develop` logic wins; QA UX is a component/style donor;
  the official logo and mascot are mandatory; customer history is derived from
  canonical records; no financial history is rewritten.
- **Constraints:** no dummy business data, no invented refund/payout behavior,
  no wholesale QA-branch merge, no Preview/staging gate, and no `main` mutation
  before an explicit readiness report.
- **Open questions:** final customer-owned brand copy, unresolved business
  policies, Reporting/Excel, Analytics, and Ready Stock order recording.
- **Current priority:** Production environment setup without changing product
  code or switching Convex projects.
- **Next action:** configure Vercel Production with Clerk Production and
  canonical Convex Production, then rerun preflight before merging `main`.
