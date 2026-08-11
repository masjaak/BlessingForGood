# BFG Production Release V1

Date: 2026-08-11
Status: **PRODUCTION_BLOCKED**
Release candidate: `27a9463` (`fix: stabilize production auth rendering`)

## Functional Source

Current Phase 01–06.4 integrated application on
`hotfix/production-ui-alignment-v1`, including Clerk identity, Convex-backed
RBAC and ownership, catalogs, Ready Stock, orders, Batch PO, tracking,
invoices, deposits, payments, exceptions, profiles, addresses, customer
history, admin customers, and audit.

## Visual Source

Original customer/admin mockups in `public/mockups`, official assets in
`public/brand`, and the approved QA UX direction. The rendered public pages
match the warm cream canvas, botanical green, editorial serif, sans-serif UI,
official logo, mascot, restrained borders, and intentional empty states.

## Product Source

Original BFG PRD, `context/implementation/PRD-COVERAGE-MATRIX.md`, approved
business decisions, and the existing integrated product. Reporting, Excel
Export, Analytics, Content Management, Settings, Ready Stock order recording,
and remaining cancellation/refund/replacement policy decisions remain out of
scope.

## Git and Vercel

| Item | Result |
| --- | --- |
| Release source commit | `27a9463` |
| Previous `origin/main` | `08e43c0` |
| `origin/main` updated | **NO** |
| Main release commit | Not created; release is blocked before merge |
| Vercel project | `masjaaks-projects/blessing-for-good` |
| Vercel Production branch | `main`; not changed |
| Production deployment | None created by this release |
| Production environment | Not reached |
| Production status | Not reached |
| Production domain | No custom domain configured/returned; the owned domain is not supplied |

No additional hotfix or Preview push was made.

## Clerk Production

**BLOCKED.** The only local credentials are Development-form `pk_test_…` and
`sk_test_…`; they are not used for Production. Vercel Production currently has
zero environment variables. No `pk_live_…`/`sk_live_…` pair from one Clerk
Production instance is available to configure.

Required matching Production names, values never recorded here:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

The actual owned Production domain, DNS verification, Clerk authorized URLs,
and issuer cannot be inferred safely and are not invented.

## Convex Production

Canonical target remains team `palevvi`, project `blessingforgood`, Production
deployment `clean-eel-522`. No alternate project or deployment was selected.
The canonical Production deploy key is not available locally, and the current
CLI identity cannot inspect the canonical project. No Production environment
mutation or business-data mutation was attempted.

Required Production names, values never recorded here:

- Vercel: `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`
- Convex: `CLERK_JWT_ISSUER_DOMAIN`, `BFG_OWNER_CLERK_USER_ID`,
  `BFG_CATALOG_CODE_PEPPER`

## Authentication Chain

Local signed-out redirects and Clerk entry rendering pass. The complete
Production chain is **NOT PROVEN** because the matching Clerk Production
pair, verified domain, Vercel Production variables, and canonical Convex
Production deploy key are absent. Consequently Production browser → Clerk →
Convex → `appUser` provisioning → role authorization cannot be accepted.

## Zero Dummy Data Verification

```text
PRODUCTION_BUSINESS_DATA: ZERO DUMMY RECORDS CREATED BY THIS RELEASE
```

- No seed command was run.
- No Preview seed or Production fixture was run.
- No business JSON was imported.
- No books, publishers, customers, orders, batches, invoices, payments,
  deposits, inventory, exceptions, or fake identities were created by this
  release.
- Canonical Production business rows were not queried because Production
  access is not configured.

## Phase 01–06.4 Preservation

**PASS by source diff and deterministic regression.** No domain schema,
financial math, ownership boundary, RBAC mutation, or state transition changed.
The only implementation change in this release candidate is a shared Clerk
auth-form hydration guard; the other changes are production-safe empty-state
copy and regression coverage.

## Brand Acceptance

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| Official logo | PASS | Fresh rendered public screenshots at 390 and 1440 widths |
| Official mascot | PASS | Home journey card and Ready Stock zero state |
| Design system | PASS | Cream/green/editorial hierarchy, restrained cards, responsive shell |
| Prototype presentation | PASS | Prohibited runtime copy audit is clean; no production UI route contains it |
| Empty-state quality | PASS | Ready Stock, public routes, and customer surfaces use intentional safe states |

## Public Visual QA

| Route | Viewport | Visual verdict | Logo | Mascot | Hierarchy/layout/color/type | Buttons | Empty/error/loading |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 390, 1440 | PASS | PASS | PASS | PASS | PASS | PASS |
| `/community` | 390, 768, 1440 | PASS | PASS | PASS | PASS | PASS |
| `/how-to-order` | 390 | PASS | PASS | PASS | PASS | PASS | PASS |
| `/join` | 390 | PASS | PASS | PASS | PASS | PASS | PASS |
| `/ready-stock` | 390 | PASS | PASS | PASS | PASS | N/A | PASS |
| `/ready-stock/[slug]` | No record exists | N/A | N/A | N/A | N/A | N/A | PASS safe not-found boundary |
| `/catalog` signed out | 390 | PASS redirect | PASS | N/A | PASS | PASS | PASS |
| `/sign-in` | 390 | PASS locally | PASS | N/A | PASS | PASS | PASS |

No populated Ready Stock or catalog screenshot was manufactured.

## Customer Visual QA

Routes `/account`, `/account/orders`, `/account/invoices`,
`/account/profile`, and `/account/addresses` pass signed-out protection and
brand rendering. Authenticated customer content is **BLOCKED** pending a real
Production customer identity and matching Convex provisioning. No mock customer
or business record was created.

## Admin Visual QA

Routes `/admin`, `/admin/books`, `/admin/catalogs`, `/admin/join-requests`,
`/admin/orders`, `/admin/batches`, `/admin/invoices`, `/admin/payments`,
`/admin/exceptions`, `/admin/customers`, and `/admin/users` pass signed-out
protection and redirect rendering at the configured admin widths. Authenticated
operational content is **BLOCKED** pending a real Production owner/admin
identity and matching Convex provisioning.

## Mockup Acceptance

Public/customer-shell and zero-data states: **PASS** against the original
mockup direction and approved QA UX direction. Authenticated customer and admin
states: **NOT ACCEPTED**; no code-only approval is substituted for rendered
role-based screenshots.

## Authorization and Isolation

| Check | Result |
| --- | --- |
| Convex auth/RBAC/ownership invariants | PASS in isolated tests |
| Customer A/B runtime isolation | Not run; Production identities unavailable |
| Owner authorization | Not run live; isolated authorization tests pass |
| Admin authorization | Not run live; isolated authorization tests pass |
| Customer blocked from admin | PASS for signed-out boundary; live role test blocked |
| Suspended-user denial | PASS in isolated authorization tests; live test blocked |

## Financial Regression

**PASS.** Integer IDR, invoice snapshots, append-only deposits, allocations,
payment review, invoice adjustments, refund obligations, and no automatic
payout behavior remain unchanged and covered by the existing Convex tests.

## Test Gates

| Gate | Result |
| --- | --- |
| Vitest | 92/92 PASS |
| Convex | 61/61 PASS |
| Playwright full local route smoke | 108/108 PASS |
| Post-copy targeted admin smoke | 6/6 PASS |
| TypeScript | PASS |
| Lint | 0 errors / 0 warnings |
| Formatting | PASS |
| Next.js build | PASS; 25 routes |
| `git diff --check` | PASS |

The shared Clerk auth form removed the intermittent sign-in hydration error
seen during the first rendered run. No runtime 500 was observed locally; the
only local browser warning is the expected Development Clerk notice, which is
why those keys cannot be shipped to Production.

## Production Runtime and Smoke

Not run. There is no new Production deployment or configured Production
domain to inspect. Vercel Production logs and live public/customer/admin smoke
must be run only after the missing Production configuration is supplied and
`main` is deployed.

## Superseded Workflow Decisions

- **SUPERSEDED:** Preview is a mandatory release gate.
- **SUPERSEDED:** Staging is required before every Production update.
- **SUPERSEDED:** A hotfix-branch Preview is acceptable final delivery.
- **SUPERSEDED:** Prototype runtime can represent customer progress.
- **SUPERSEDED:** Tests alone prove visual acceptance.

Current decisions: PRD/mockup plus rendered UI are acceptance criteria; `main`
is the sole Production Git line; Production is the client-visible delivery;
business dummy data remains zero; functional and visual gates are both
required.

## Required Manual Action

Configure one real Production environment chain, without changing the code or
creating business data:

1. In the Clerk Production dashboard, use the actual owned BFG domain and
   configure authorized URLs/DNS, then obtain the matching `pk_live_…` and
   `sk_live_…` pair from that same instance.
2. In canonical Convex `palevvi/blessingforgood` Production `clean-eel-522`,
   obtain a Production deploy key and set the required issuer, real owner user
   ID, and stable catalog pepper.
3. In Vercel project `masjaaks-projects/blessing-for-good`, add the required
   Production variable names above with those values only; keep Preview and
   Development untouched.

The missing inputs are the exact owned Production domain and the matching
Production Clerk pair plus canonical Convex Production deploy key/configuration.
Until that one configuration action is complete, merging or pushing `main`
would violate the release gate.

## Production Decision

```text
PRODUCTION_BLOCKED

Blocker:
Vercel Production has zero required environment variables; no matching Clerk
Production credential pair, verified owned domain, or canonical Convex
Production deploy key/configuration is available.

Everything else:
Local code, deterministic regression, public rendered visual QA, zero-dummy
data discipline, and the release documentation are ready.

Required user action:
Complete the single linked Clerk Production → canonical Convex Production →
Vercel Production configuration above, then resume from authenticated rendered
QA. Do not provide Development keys, create an alternate Convex project, seed
business data, or push a Preview branch.
```
