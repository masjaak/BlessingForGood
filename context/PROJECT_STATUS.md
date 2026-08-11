# BFG Project Status

## Production UI alignment hotfix

**Status:** PUBLIC VISUAL CORRECTION COMPLETE — AUTHENTICATED VISUAL QA BLOCKED

**Branch:** `hotfix/production-ui-alignment-v1`

**Functional source of truth:** current remote `main`, forward-integrated with
the existing `release/production-v1` product history because remote `main`
still pointed to the older prototype merge.

**Visual sources of truth:** the customer/admin mockups in `public/mockups`,
the official assets in `public/brand`, and selected visual patterns from
`origin/qa/ux-refinement-v0.1`. The QA branch is not a functional merge source.

**Product scope source:** the original PRD pack at
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/product/` was audited
read-only. Its approved MVP scope, UX flows, design system, tone, and mascot
guidance are reflected in the local coverage matrices.

### Completed in the hotfix worktree

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
- Restored official logo/mascot scale, mobile navigation, branded empty/loading
  states, a connected customer account hierarchy, and one compact admin shell.
- Rendered the optimized build at customer widths 375, 390, 430, 768, and 1440
  and protected admin widths 1024, 1280, and 1440.

### Current validation

- Vitest: 92/92
- Convex: 61/61
- Playwright responsive route smoke: 108/108 PASS
- Formatting: PASS
- Lint: 0 errors / 0 warnings
- TypeScript: PASS
- Next.js build: PASS (25 pages)
- `git diff --check`: PASS

### Production boundary

`main` and Vercel Production remain untouched. Local authenticated QA reports a
Clerk instance-key mismatch, and the current CLI identity cannot access canonical
Convex Development `content-snake-214`; account/admin content therefore cannot
receive rendered visual approval. No alternate project, dummy business data,
Preview, or staging deployment is used.

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
- **Current priority:** restore matching Clerk credentials and canonical Convex
  access for authenticated screenshot QA.
- **Next action:** fix that single environment chain, rerun customer/admin
  screenshots, then report merge readiness without changing `main` first.
