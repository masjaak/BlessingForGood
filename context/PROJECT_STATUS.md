# BFG Project Status

## Phase 06.7 Business Policy Closure

**Status:** IMPLEMENTED LOCALLY — RELEASE GATE PASSED; DELIVERY PENDING

Phase 06.7 closes Ready Stock ordering/reservation, pre/post-PO cancellation,
defect replacement, refund obligation/payout, deposit refund, non-account
customer, and Join-request retention policy. The canonical policy documents
are `context/policies/BFG-BUSINESS-POLICY-V1.md` and
`context/policies/BFG-POLICY-DECISION-MATRIX.md`.

Customer Visual V4.1, the global skeleton/loading system, and the Phase 06.6
customer/admin flow remain locked. Admin visual redesign remains deferred to
Phase 07. No production business data was seeded and no Preview delivery is
used.

The repository's `AGENTS.md` references `context/SOURCE_OF_TRUTH.md`, but that
file is absent from the current checkout; the current source-of-truth chain is
this status file, `context/decisions/DECISIONS.md`, the feature/database/security
documents, and the Phase 06.7 policy documents above.

## Customer Mobile UX Correction V3.1

**Status:** PRODUCTION READY — LIVE QA PASSED

V3.1 corrects the rendered customer mobile experience forward-only. The
header logo is smaller, top-right `Masuk` opens the dedicated BFG sign-in
page, signed-out bottom-navigation destinations render customer states before
authentication, and `/catalog` is a public token gateway. Secret Catalog
access uses a server-validated opaque expiring session; the previous
authenticated-member-plus-code prerequisite is superseded for this customer
entry flow. Existing active-member grants remain backward compatible, and
token-only browsing does not create customer identity or owned orders.

The homepage story cards now use a larger official logo and a non-overlapping
top-right Blessy composition. Join remains canonical `joinRequests`, and all
customer/admin data continues through the shared Convex backend. Admin visual
redesign remains deferred. No business fixtures or dummy records were added.

**Branch:** `main`

**Starting commit:** `8e67bfc` (`docs: record V3 production deployment`)

**Production commit:** `aa294c5` (`docs: record final production deployment`)

**Vercel deployment:** `dpl_H6m6a6vtGf61fzNXbWwTRyQmmggY` — Ready; canonical
aliases include `https://blessingforgood.com`. Vercel logs show the build,
TypeScript check, static generation, Convex schema validation, and deployment
to Production Convex `clean-eel-522` completed successfully.

The V3.1 customer surfaces are implemented forward-only in the integrated
Phase 01–06.4 application. Generated catalog codes and session credentials are
never stored as plaintext authoritative values. The full admin visual
redesign remains deferred.

Local gates currently pass: TypeScript, ESLint, 100 Vitest tests, 64 Convex
tests, and 108/108 Playwright tests across customer/admin responsive projects.
Live public mobile QA at 390px passed for homepage, token gateway, signed-out
states, BFG sign-in, no-ticket sign-up, navigation, and detail Back controls.
No secret values, dummy records, or alternate deployments were used.

The join continuation is safe when `BFG_JOIN_WHATSAPP_GROUP_URL` is absent:
the request persists and the customer sees the configured-link fallback. Its
Production value was not exposed or independently read during this pass.

## Historical Production UI alignment hotfix (superseded by V3)

**Status:** LOCAL RELEASE CANDIDATE READY — PRODUCTION BLOCKED BY EXTERNAL AUTH/ENVIRONMENT CONFIGURATION

**Branch:** `hotfix/production-ui-alignment-v1`

**Release candidate:** `a0a3bce` (`feat: align customer shell with local mockups`)

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

- Vitest: 93/93
- Convex: 61/61
- Playwright responsive route smoke: 108/108 PASS
- Formatting: PASS
- Lint: 0 errors / 0 warnings
- TypeScript: PASS
- Next.js build: PASS (25 pages)
- `git diff --check`: PASS

### Customer experience finalization V1

- Inspected all eight local customer/mobile mockups under
  `public/mockups/mobile/` and documented their exact paths, visual rules,
  route parents, and brand asset relationships.
- Aligned the customer shell to the local mobile information architecture:
  five-item signed-in bottom navigation, safe-area/content offset, customer
  mobile menu links, and BFG-styled Clerk appearance.
- Public customer screenshots pass at 375, 390, 430, 768, and 1440 widths;
  the Ready Stock zero state remains intentionally empty and mascot-led.
- Authenticated account screenshot acceptance remains blocked by the existing
  matching Clerk/Convex environment requirement. No dummy business records or
  test production fixtures were created.
- Admin visual refinement is deferred; admin route regression remains covered
  by the full Playwright suite.

### Production preflight (2026-08-11)

- Vercel project `masjaaks-projects/blessing-for-good` is reachable and linked
  to the canonical repository. Production currently has three sensitive
  variables, but they are named `CLERK_SECRET_PROD`, `CONVEX_DEPLOY_PROD`, and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_PROD`; the application-required names are not
  present. Values were not printed or copied blindly.
- `blessingforgood.com` and `www.blessingforgood.com` are attached to the
  project, publicly resolve to Vercel, and serve HTTPS 200. The public Clerk
  hostname `clerk.blessingforgood.com` also resolves through Clerk and serves
  HTTPS 200.
- Clerk CLI health check is not authenticated or linked to a Clerk
  application. Local credentials remain Development `pk_test_`/`sk_test_`, so
  the Production key pair, owner, issuer, and certificate state are not
  independently verified through the CLI.
- No environment, domain, Clerk, Convex, business-data, branch, or deployment
  mutation was attempted. The existing Production deployments predate
  `a0a3bce` and are not accepted as this release.

### Production boundary

`main` and Vercel Production remain untouched by design. The canonical BFG
domain is publicly reachable, but Vercel Production has only incorrectly named
sensitive variables; the required names, matching Clerk Production pair, and
canonical Convex Production deploy key/configuration are not verified. Public
rendered QA and local deterministic gates pass; authenticated customer/admin
rendered acceptance and Production smoke remain blocked. No alternate project,
dummy business data, Preview delivery, or staging deployment is used.

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

- **Objective:** close all Phase 06.7 business policies before Phase 07 Admin
  operational UI/UX.
- **Decisions:** current `develop` logic wins; QA UX is a component/style donor;
  the official logo and mascot are mandatory; customer history is derived from
  canonical records; no financial history is rewritten.
- **Constraints:** no dummy business data, no invented wallet/store-credit
  behavior, no Preview delivery, no reporting/analytics/CMS/settings, and no
  Admin visual redesign before Phase 07.
- **Open backlog:** Reporting/Excel, Analytics, CMS, Settings, notification
  platform, payment gateway, and full Admin visual redesign.
- **Current priority:** commit the green Phase 06.7 candidate to `main`, push
  it, and verify the Vercel Production deployment and live public smoke.
- **Next action:** deploy the tested commit through the linked Vercel
  Production project, then record the final commit and live result.
