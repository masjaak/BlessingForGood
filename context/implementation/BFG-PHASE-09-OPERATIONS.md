# BFG PHASE 09 — OPERATIONS & MAINTENANCE

Status: `ACTIVE — MAINTENANCE MODE`
Initial review: 2026-08-22 (Asia/Jakarta)
Owner: BFG Owner/Admin
Product rule: `STABILITY > NEW FEATURES`

## Purpose

Phase 09 is the permanent operating model for the completed BFG product. It
keeps the current product secure, available, correct, observable, recoverable,
and maintainable. It is not a feature-development phase. A new capability
requires an explicit, source-backed business requirement before implementation.

The initial pass establishes the baseline and playbooks. It does not mutate
Production business data and does not add application behavior.

## Current Production Baseline

| Item                           | Evidence                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| Phase 08                       | `COMPLETE`                                                       |
| Current product                | `BFG_CURRENT_PRODUCT_SCOPE_COMPLETE`                             |
| Production                     | `BFG_PRODUCTION_STABLE`                                          |
| Product mode                   | `MAINTENANCE`                                                    |
| Current source / `origin/main` | `85908d912dc9a071eac67a27e7c81bf9ab4bb247`                       |
| Local regression               | Vitest `241/241`; Convex `111/111`; Playwright `264/264`         |
| Build gates                    | TypeScript, ESLint, Format, Build, and `git diff --check` pass   |
| Live domain                    | Public routes healthy; Admin boundary redirects to Clerk sign-in |
| Production data                | Read-only validation only; no dummy record or media mutation     |

The current source tree contains one security-only dependency patch in
`package-lock.json`: transitive `nanoid` `3.3.17 → 3.3.18`. The local audit is
clean after the patch. No Production deployment was created by this
documentation pass, so the patch remains pending the normal maintenance
release procedure.

The previous eight live cover assertions are reconciled in the monthly report:
the assertion required a stored cover image that the live public seed did not
contain. Current deterministic geometry checks pass at all configured
viewports. The classification is `ENVIRONMENT_ONLY / DATA-LIMITED`, not a
Product UI defect.

## Infrastructure

- Repository: `/Users/masjak/Developer/BlessingForGood`
- GitHub: `https://github.com/masjaak/BlessingForGood.git`
- Production branch: `main`
- Vercel project: `masjaaks-projects/blessing-for-good`
- Canonical domain: `https://www.blessingforgood.com`
- Current Vercel Production deployment: `dpl_8tZaUD7jxYxg96N6NhYZzCjmUwtU`
  (`READY`, source commit `85908d9`)
- Convex Development: `content-snake-214`
- Convex Production: `clean-eel-522`

The Vercel CLI is authenticated as `masjaak` and verified the deployment and
aliases. The Vercel MCP connector returned a scope `403`; that is a connector
authorization limitation, not evidence of a Vercel outage. The canonical
`npm run convex:check` was attempted and returned a non-interactive selected
project access error. No alternate Convex project was selected.

## Operational Owners

- Owner: security decisions, role-sensitive actions, release approval,
  incident command, recovery decisions.
- Admin: routine catalog/order/payment operations, audit review, and smoke
  evidence within assigned permissions.
- Maintainer: source changes, dependency review, tests, deployment evidence,
  context updates, and rollback preparation.
- Client/user: legitimate data needed for populated Gallery, Preview, Settings,
  Batch, invoice-cancellation, deposit-allocation, and Bulk Import UAT.

## Maintenance Cadence

| Cadence                   | Required activity                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuous / after deploy | Vercel `READY`, canonical URL, Convex reachability evidence, runtime error check, route/auth boundary smoke                                         |
| Weekly                    | Canonical URL, latest deployment, Vercel error status, Convex evidence, Admin dashboard boundary, Customer homepage                                 |
| Monthly                   | Full security checklist, dependency review, auth/RBAC, Secret Catalog, financial invariants, critical-flow and responsive smoke, error/audit review |
| Quarterly                 | Recovery readiness, deeper dependency/security review, storage/media review, permission review, technical-debt prioritization                       |
| Incident                  | Severity classification, evidence preservation, safe containment, fix/rollback, verification, report                                                |

The recommended monthly timing is the first week of each month. Scheduling is
an operational responsibility; this repository does not create an automation.

## Health Checks

After every Production deployment verify all of the following, not only the
Vercel state:

1. Vercel deployment is `READY` and aliases point to the canonical domain.
2. The canonical URL and public routes return expected responses.
3. Protected routes have the expected Clerk redirect or access boundary.
4. The Convex Production target is the canonical `clean-eel-522` deployment.
5. No new runtime/build error spike is visible in the available logs.
6. Auth shell, Admin boundary, and Customer boundary work without loops or
   indefinite skeletons.
7. The relevant local regression and rendered checks pass before release.

Current live HTTP evidence: `/`, `/how-to-order`, `/sign-in`, `/catalog`, and
`/ready-stock` returned `200`; `/admin` redirected to `/sign-in` with a safe
`redirect_url`; signed-out `/account`, `/account/orders`, `/account/invoices`,
and `/account/batches` returned their intentional customer-safe shells. This
does not substitute for authenticated Customer UAT.

## Security Review

The recurring checklist is
[`BFG-MONTHLY-SECURITY-CHECKLIST.md`](BFG-MONTHLY-SECURITY-CHECKLIST.md).
The initial review found no high-confidence tracked secret and no critical
security finding. Local backend tests cover Clerk identity, BFG admission/RBAC,
suspension, ownership, Secret Catalog, uploads, and financial guards.

Security incidents take precedence over normal maintenance. An auth bypass,
secret exposure, cross-customer access, privilege escalation, or Secret
Catalog leak is `SEV-0`.

## Dependency Review

The initial review inspected `package.json`, the lockfile, and the production
dependency audit. One transitive high advisory for `nanoid@3.3.17` was fixed
in the lockfile at `3.3.18`; `npm audit --omit=dev` then reported zero
vulnerabilities. No major-version upgrades were taken. The security patch must
ship through the normal release path before it is considered deployed.

## Auth Regression

The permanent authority chain is:

```text
Clerk identity → BFG appUser → status → role → permission
```

Successful Clerk authentication never grants Admin access. The regression
matrix covers signed-out denial, Customer/Admin separation, suspension,
Owner-only actions, direct-route checks, server-side guards, and Customer A/B
ownership isolation. Current deterministic Convex auth, fulfillment, invoice,
payment, exception, batch, and product tests are green. Live signed-out
`/admin` confirms the outer boundary; authenticated role UAT remains a
controlled, data-limited check.

## Secret Catalog Review

The authoritative implementation stores keyed digests, not plaintext access
codes; it uses `BFG_CATALOG_CODE_PEPPER`, constant-time comparison, expiry,
revocation, scoped session digests, grants, and anonymous/member rate limits.
The Admin list returns status/timestamps rather than the code. Tests explicitly
assert that stored records and public views do not contain plaintext codes or
digests. Raw codes may exist only at the intended one-time presentation
boundary returned by generation/unlock.

The monthly review must check code generation, revoke, expiry, grant/revoke,
session scope, ownership, failure response, and rate-limit behavior. Never
weaken rate limits for convenience and never place codes in audit, analytics,
logs, or durable browser state outside the intended scoped session.

## Financial Invariant Review

The monthly regression preserves these rules:

- IDR is stored as an integer.
- Invoice snapshots remain historical records.
- Deposit credits, allocations, and refund-payout consequences are append-only
  transactions; old ledger history is not rewritten or deleted.
- Payment approval is idempotent and cannot create a duplicate consequence.
- Refund obligation and cash payout remain separate states.
- Invoice, payment, refund, reservation, and fulfillment transitions are
  server-guarded.
- Ready Stock availability remains `onHand - reserved`; reservation,
  cancellation release, and fulfillment are atomic/idempotent.
- Ready Stock does not create a supplier Batch PO.

The current invoice, payment, deposit, refund, Ready Stock, order-exception,
and batch test suites pass. No financial Production mutation was used for the
baseline.

## Business Flow Smoke

The monthly smoke covers Auth, Join, Books/Variants/Media, Secret Catalog,
Orders, Invoices, Payments, Batch roster/assignment/lock, and Activity. The
current local Playwright matrix is `264/264` across customer and Admin widths;
the Convex deterministic suite is `111/111`. Production smoke is read-only by
default and uses legitimate existing records only where safe. It never creates
dummy customers, orders, deposits, invoices, covers, or batches.

## Responsive Smoke

Customer widths: `375`, `390`, `430`, `768`, `1440`.
Admin widths: `768`, `834`, `1024`, `1280`, `1440`.

Representative surfaces include Homepage, How To Order, Ready Stock, Catalog,
Buku Saya, Tagihan, Akun, Activity, Dashboard, Books, Book Detail, Catalog,
Orders, Batch, Invoices, and Settings. The local suite passes the configured
responsive matrix with no unexpected body overflow. Intentional internal table
scroll is the only allowed scrolling region. Popovers, fixed navigation, safe
areas, button wrapping, and file-picker presentation remain part of the check.

## Error Review

Review Vercel runtime/build logs, Convex runtime errors, available client error
signals, and audit anomalies. The initial Vercel CLI query returned zero error
entries for the current Production deployment in the last hour. This is a
bounded observation, not a claim about unqueried history. Direct Convex health
queries were not verified because the canonical CLI check lacked selected
project access.

Do not invent telemetry or add an observability subsystem unless a real
operational need is identified.

## Audit Review

Monthly review focuses on Owner/Admin role changes, invitations, Secret Catalog
access changes, payment decisions, refund actions, deposit adjustments, and
sensitive Book/Catalog operations. Look for unexpected volume, unusual actors,
impossible transitions, and duplicate actions. Reports use minimal identifiers
and never copy private customer data, proof contents, access codes, or secrets.

## Backup / Recovery Readiness

Git protects source and configuration templates. Vercel provides web delivery
and deployment rollback evidence. Convex owns application tables, functions,
and Convex Storage assets for the canonical deployments. Exact platform backup,
point-in-time restore, Storage recovery, RPO, and RTO capabilities are
`NOT VERIFIED` in this baseline. No guarantee may be inferred from the platform
names or from a `READY` deployment.

The actionable recovery procedure is in
[`BFG-RECOVERY-PLAYBOOK.md`](BFG-RECOVERY-PLAYBOOK.md). It deliberately does
not create a Backup/Restore Admin UI or assume that database rollback is safe
after data has changed.

## Incident Response

Severity definitions, first actions, containment, evidence preservation,
rollback, verification, and incident records are canonical in
[`BFG-RECOVERY-PLAYBOOK.md`](BFG-RECOVERY-PLAYBOOK.md).

```text
Confirm impact → identify scope → stop further damage → preserve evidence
→ identify last known good state → fix or rollback safely → verify → document
```

Random patching is not an incident procedure. Financial and privacy incidents
freeze destructive follow-up actions until the root cause is understood.

## Release Procedure

Every maintenance release records: issue, severity, reproduction, source
contract/invariant, blast radius, fix, regression, rendered QA where visual,
full relevant tests, `main`, `origin/main`, Production deployment, live smoke,
and context update.

The current release path remains:

```text
local → tests → rendered QA → main → origin/main → Production → live QA → context
```

There is no mandatory Preview/Staging delivery gate. A risky release must name
the last known good commit and Vercel deployment and state whether Convex
functions/schema or data migrations are involved.

## Rollback Strategy

For a bad web deploy, use the last known good Vercel deployment or revert the
source change through Git and redeploy. For a Convex function/schema issue,
stop further mutations, identify the last known good function deployment, and
use a backward-safe source fix. Do not assume that rolling code back restores
already-written data. Any data correction needs a separate, explicit,
auditable operational decision.

## Maintenance Classification

| Priority | Meaning                                         |
| -------- | ----------------------------------------------- |
| P0       | Security/data exposure/auth bypass              |
| P1       | Financial/order corruption or Production outage |
| P2       | Critical business journey broken                |
| P3       | Operational UI or responsive defect             |
| P4       | Cosmetic defect                                 |
| P5       | Optional enhancement                            |

Technical-debt observations are classified separately as `OBSERVE`, `PLAN`,
`FIX NEXT MAINTENANCE`, or `REQUIRES NEW PROJECT`. An observation does not
automatically authorize refactoring.

## Technical Debt Register

See [`BFG-TECHNICAL-DEBT.md`](BFG-TECHNICAL-DEBT.md). The initial register is
evidence-based and contains no speculative redesign, dependency churn, or
parallel domain path.

## Optional Future Features

These remain separate from defects and maintenance debt:

- Advanced Analytics — `OPTIONAL_FUTURE`
- Backup / Restore Admin UI — `OPTIONAL_FUTURE`
- Cross-domain Admin Search — `OPTIONAL_FUTURE`

None is Phase 09 work.

## Monthly Checklist

- [ ] Record commit, `origin/main`, Vercel deployment, and canonical domain.
- [ ] Run `npm run check`, `npm run convex:test`, critical Playwright matrix,
      responsive smoke, and `git diff --check`.
- [ ] Run `npm audit --omit=dev` and classify each update.
- [ ] Review Clerk/RBAC, suspension, Owner-only guards, and ownership tests.
- [ ] Review Secret Catalog digests, pepper, expiry, revoke, grants, sessions,
      rate limits, and logs.
- [ ] Review uploads, MIME/type/size, ownership, storage, and URL schemes.
- [ ] Review invoice, payment, deposit, refund, reservation, and batch
      invariants.
- [ ] Review critical business flows, responsive surfaces, overflow, Activity,
      and file picker states.
- [ ] Review Vercel/Convex errors and sensitive audit events.
- [ ] Review recovery readiness and update the monthly report.
- [ ] Classify findings as Green, Watch, or Action Required; never infer Green
      from a route status or test-file existence alone.

## Quarterly Checklist

- [ ] Verify platform recovery and Storage capabilities directly; record
      `NOT VERIFIED` where access or evidence is absent.
- [ ] Reassess dependency major upgrades only with blast-radius analysis.
- [ ] Review security architecture, permission boundaries, MFA operations,
      media/storage, and actual client usage.
- [ ] Prioritize the technical-debt register without speculative refactoring.
- [ ] Reconfirm optional future features remain out of maintenance scope.
