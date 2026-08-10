# BFG Project Status

## Phase 06.2 status

**Phase 06.2:** IMPLEMENTATION COMPLETE

**Local validation:** GREEN — 75 Vitest tests, 48 Convex tests, lint with zero
warnings, typecheck, Next.js build, and `git diff --check` pass.

**Runtime integration QA:** DEFERRED TO STAGING

**Production readiness:** NOT READY

Phase 06.2 adds the pre-account admission bridge: public request access at
`/join`, durable Convex `joinRequests`, admin/owner review at
`/admin/join-requests`, forward-only approval/rejection, duplicate protection,
audit events, and a manual Clerk invitation handoff state. Approval does not
create an account, role, or catalog access.

Current implementation evidence is tracked in
`context/implementation/PHASE-06-2-JOIN-ACCESS-APPROVAL.md` and
`context/implementation/PRD-COVERAGE-MATRIX.md`.

## Phase 06.1 status

**Phase 06.1:** IMPLEMENTATION COMPLETE

**Local validation:** GREEN — 71 Vitest tests, 44 Convex tests, lint with zero
warnings, typecheck, Next.js build, and `git diff --check` pass.

**Runtime integration QA:** DEFERRED TO STAGING

**Production readiness:** NOT READY

Phase 06.1 completes the reusable Book Master, explicit publication states,
per-variant Ready Stock inventory, public browse/search/filter/detail experience,
and admin book/variant/stock operations. Public queries are anonymous but expose
only published books with positive stock. Secret Catalog remains an authenticated
curation/access layer and is not merged into Ready Stock.

`READY_STOCK_ORDER_RECORDING` remains blocked by business decision. The public
detail uses a contact/help CTA and does not create checkout, reservation, or sale
records. No staging, Vercel Preview, Production, or `main` work is part of this phase.

Current implementation evidence and backlog are tracked in
`context/implementation/PHASE-06-1-CATALOG-READY-STOCK.md` and
`context/implementation/PRD-COVERAGE-MATRIX.md`.

## Phase 05.1 status

**Phase 05.1:** IMPLEMENTATION COMPLETE

**Local validation:** GREEN — `npm run check` passes with 65 Vitest tests,
`npm run convex:test` passes with 38 Convex tests, and `git diff --check`
passes.

**Runtime integration QA:** DEFERRED TO STAGING

**Production readiness:** NOT READY

Phase 05.1 adds manual customer payment confirmation, admin/owner review,
atomic invoice settlement projection, payment audit events, customer invoice
feedback, and the `/admin/payments` operational queue. It does not add a
payment gateway or alter Production.

The stable staging gate must still verify real Clerk sign-in/JWT identity,
customer and admin payment flows, rejection/resubmission, suspension,
cross-customer isolation, deposit-plus-transfer settlement, realtime/browser
behavior, runtime logs, and guarded data cleanup.

## Phase 04.1 status transition

**Phase 04.1:** IMPLEMENTED

**Local validation:** GREEN

**Runtime integration QA:** DEFERRED TO STAGING

**Production readiness:** NOT READY

## Anchored summary

**Objective:** complete the pre-account Blessfriends admission bridge without
enabling public signup, creating fake accounts, touching `main`, staging, or
Production.

**Source of truth:** the repository on
`feat/join-access-approval-v0.1`, the Phase 06.2 brief, surviving approved
repository documents, and `context/implementation/PRD-COVERAGE-MATRIX.md`.

**Final decisions:** Clerk supplies identity; Convex validates the Clerk JWT
and enforces BFG roles, permissions, ownership, and suspension. Application
roles live only in `appUsers`. Restricted Mode keeps admission invite-only.
Join requests remain separate from accounts, roles, ownership, and catalog
grants; approval only makes manual invitation handoff eligible.

**Prototype assumptions:** local development may use the explicit local
adapter when enabled. `prototypeSessions` and Preview admin-code flows are
legacy-only and fail closed. No business seed data is created.

**Current priority:** review and integrate Phase 06.2 through `develop`, then
continue Phase 06.3 Batch PO + Roster + Manual Customer Operations. Stable
staging follows feature-complete beta.

## Canonical Convex backend

The canonical Convex account is `palevvi@gmail.com`. These identifiers are not
secrets:

```text
BFG_CANONICAL_CONVEX_TEAM=palevvi
BFG_CANONICAL_CONVEX_PROJECT=blessingforgood
BFG_CANONICAL_DEV=content-snake-214
BFG_CANONICAL_PRODUCTION=clean-eel-522
```

Only this Convex project is authorized for active BFG development. A separate
similarly named BFG project under another Convex account/team is
`NON-CANONICAL`: do not use, deploy, or configure it, and do not delete it
automatically.

If Convex configuration fails, fix the configuration instead of creating a new
BFG project. Never use a similarly named BFG project, create a Preview-looking
deployment manually, or run an environment operation before verifying the
Convex team, project, and deployment.

## Evidence

- [REPOSITORY] The Clerk foundation is present: `clerkMiddleware()` in
  `src/proxy.ts`, one `ClerkProvider` in the root layout, and Clerk controls
  in the site shell. Public signed-out UX exposes `Masuk`, not a signup CTA.
- [REPOSITORY] `ConvexProviderWithClerk` wraps the BFG provider with one
  memoized `ConvexReactClient`.
- [REPOSITORY] `convex/auth.config.ts` reads `CLERK_JWT_ISSUER_DOMAIN` and
  uses the `convex` application ID. It contains no issuer value.
- [REPOSITORY] Active Convex functions resolve identity through
  `ctx.auth.getUserIdentity()`, then `appUsers`, never through a client role,
  Clerk subject, email, or prototype session token.
- [REPOSITORY] `joinRequests` is the pre-account admission source of truth;
  public submissions never create `appUsers`, Clerk accounts, or catalog
  grants.
- [CONVEX VERIFIED] The Phase 06.2 Convex suite passes 48 tests, including
  anonymous submission, validation, duplicate normalization, privacy,
  admin/owner review, rejection/resubmit, approval handoff state, suspension
  denial, audit, and stale-state protection.
- [LOCAL VERIFIED] Phase 06.2 local validation passes format, lint with zero
  warnings, typecheck, 75 Vitest tests, and Next.js build. The local browser
  run is not authentication evidence.
- [DEFERRED] `npm run convex:codegen` was not completed because the local CLI
  selected-project access is unavailable; no alternate project was selected
  and no Convex environment operation was performed.
- [REPOSITORY] Clerk Development configuration, Restricted Mode, and the
  fail-closed identity boundary are documented; runtime proof is deferred.
- [SUPERSEDED] The former requirement that a transient branch Preview reach
  `READY` before Phase 04.1 could proceed is retired.
- Runtime Clerk, ownership, browser, operational, and cleanup evidence is
  tracked in `context/implementation/STAGING-QA-PLAN.md`.
- [SUPERSEDED] The transient branch Preview attempts remain historical
  diagnostics only and are not Phase 04.1 acceptance evidence.

## Identity and migration status

| Area | Status |
| --- | --- |
| Clerk middleware/provider/auth routes | [REPOSITORY] implemented |
| Clerk ↔ Convex provider | [REPOSITORY] implemented; runtime proof pending |
| Convex issuer config | [REPOSITORY] implemented; codegen awaits canonical CLI access |
| `appUsers` provisioning | [REPOSITORY] implemented; synthetic Convex tests pass |
| Roles and centralized permissions | [REPOSITORY] implemented; synthetic tests pass |
| Suspension and owner protections | [REPOSITORY] implemented; synthetic tests pass |
| Ownership fields | [REPOSITORY] migrated to `appUsers` references; Dev is empty |
| Customer profiles and addresses | [REPOSITORY] implemented; ownership tests pass |
| Owner user management | [REPOSITORY] implemented; staging runtime QA pending |
| Join request admission | [REPOSITORY] implemented; `/join` and `/admin/join-requests` |
| Manual invitation handoff | [REPOSITORY] approved requests become invitation-ready; Clerk execution remains manual |
| Active anonymous Preview identity | [REPOSITORY] disabled; legacy exports fail closed |
| Convex Preview-looking deployment | [PROHIBITED] not an active BFG target |
| Current branch Vercel Preview | [PROHIBITED] not an active BFG target |
| Staging integration environment | [REPOSITORY] plan defined; infrastructure not configured |
| Production | [CONFIRMED] untouched and not configured for this phase |
| `main` | [CONFIRMED] untouched |

## Constraints

- Never print or commit keys, issuer values, Clerk subjects, emails, tokens,
  invitation URLs, passwords, or auth storage.
- Never merge to `main`, force-push, deploy Production, use `--prod`, promote
  a Preview, or connect Production Clerk/Convex.
- Verify the canonical Convex team, project, and deployment before every
  Convex environment operation.
- Never create a new BFG Convex project when configuration fails, use a
  similarly named BFG project from another account, or create a
  Preview-looking deployment manually.
- Unknown non-empty staging business data requires a stop before migration.
- Existing Phase 03 operational invariants remain in force.
- Payment confirmation is manual metadata plus review state; no payment
  gateway, bank API, webhook, or automatic reconciliation is in scope.
- Join request PII is preserved for v0.1 review history; `JOIN_REQUEST_RETENTION_POLICY`
  and authenticated account-linking policy remain open.

## Validation plan

1. Run format, lint, typecheck, Vitest, Convex tests, and build for every
   implementation phase. Run codegen only after canonical CLI project access
   is verified.
2. Validate relevant negative authorization and financial invariant tests.
3. Run full real integration QA only in the stable staging gate described by
   `context/implementation/STAGING-QA-PLAN.md`.
4. Inspect staging runtime logs and clean guarded staging data before release
   handoff.

## Rollback plan

The migration is source-controlled on the current feature branch. Convex
Development is empty for affected tables, so no data rewrite is required.
Staging rollout and rollback will use one stable staging deployment; no
Production change is implied.

## Next action

Review and merge `feat/join-access-approval-v0.1` through the normal
`feat/*` → `develop` path. Continue Phase 06.3 product work before the stable
staging gate; no Production or `main` change is implied.

Historical Phase 03 context below this line is superseded by the Phase 04.1
identity model and retained only for product history.
