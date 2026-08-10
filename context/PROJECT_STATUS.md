# BFG Project Status

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

**Objective:** deliver the Phase 05.1 manual payment verification workflow on
top of the Phase 04.1 Clerk identity, Convex authentication,
application RBAC, resource ownership, customer account data, and owner user
management implementation without touching `main` or Production.

**Source of truth:** the repository on
`feat/payment-verification-v0.1`, plus the current files listed in
`agent_rule.txt` and the context pack.

**Final decisions:** Clerk supplies identity; Convex validates the Clerk JWT
and enforces BFG roles, permissions, ownership, and suspension. Application
roles live only in `appUsers`. Restricted Mode keeps admission invite-only.

**Prototype assumptions:** local development may use the explicit local
adapter when enabled. `prototypeSessions` and Preview admin-code flows are
legacy-only and disabled for active Preview. No business seed data is created.

**Current priority:** finish local Phase 05.1 validation, commit and push the
feature branch, then integrate through `develop` before the stable staging
gate.

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
- [CONVEX VERIFIED] Convex Development codegen succeeds; the current
  `convex:test` suite passes 7 files / 32 tests. Development ownership
  preflight found zero records in the affected business tables.
- [LOCAL VERIFIED] `npm run format:check`, lint, typecheck, 59 Vitest tests,
  and Next.js build pass locally. The local browser run is not authentication
  evidence.
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
| Convex issuer config | [REPOSITORY] implemented; Dev codegen passes |
| `appUsers` provisioning | [REPOSITORY] implemented; synthetic Convex tests pass |
| Roles and centralized permissions | [REPOSITORY] implemented; synthetic tests pass |
| Suspension and owner protections | [REPOSITORY] implemented; synthetic tests pass |
| Ownership fields | [REPOSITORY] migrated to `appUsers` references; Dev is empty |
| Customer profiles and addresses | [REPOSITORY] implemented; ownership tests pass |
| Owner user management | [REPOSITORY] implemented; staging runtime QA pending |
| Active anonymous Preview identity | [REPOSITORY] disabled; legacy exports fail closed |
| Current branch Convex Preview | [SUPERSEDED] optional diagnostic; not a phase gate |
| Current branch Vercel Preview | [SUPERSEDED] optional diagnostic; not a phase gate |
| Staging integration environment | [REPOSITORY] plan defined; infrastructure not configured |
| Production | [CONFIRMED] untouched and not configured for this phase |
| `main` | [CONFIRMED] untouched |

## Constraints

- Never print or commit keys, issuer values, Clerk subjects, emails, tokens,
  invitation URLs, passwords, or auth storage.
- Never merge to `main`, force-push, deploy Production, use `--prod`, promote
  a Preview, or connect Production Clerk/Convex.
- Unknown non-empty staging business data requires a stop before migration.
- Existing Phase 03 operational invariants remain in force.
- Payment confirmation is manual metadata plus review state; no payment
  gateway, bank API, webhook, or automatic reconciliation is in scope.

## Validation plan

1. Run format, lint, typecheck, Vitest, Convex tests/codegen, and build for
   every implementation phase.
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

Commit and push the Phase 05.1 feature branch, then merge through the normal
`feat/*` → `develop` review path. Establish the stable staging gate only after
feature integration; no Production or `main` change is implied.

Historical Phase 03 context below this line is superseded by the Phase 04.1
identity model and retained only for product history.
