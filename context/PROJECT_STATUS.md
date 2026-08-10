# BFG Project Status

## Anchored summary

**Objective:** complete Phase 04.1 Clerk identity, Convex authentication,
application RBAC, resource ownership, customer account data, and owner user
management without touching `main` or Production.

**Source of truth:** the repository on
`feat/clerk-identity-authorization-v0.1`, plus the current files listed in
`agent_rule.txt` and the context pack.

**Final decisions:** Clerk supplies identity; Convex validates the Clerk JWT
and enforces BFG roles, permissions, ownership, and suspension. Application
roles live only in `appUsers`. Restricted Mode keeps admission invite-only.

**Prototype assumptions:** local development may use the explicit local
adapter when enabled. `prototypeSessions` and Preview admin-code flows are
legacy-only and disabled for active Preview. No business seed data is created.

**Current priority:** restore the missing auth environment name in the isolated
Convex Preview, then obtain real Clerk Development sign-in and authenticated
Playwright QA.

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
- [REPOSITORY] `npm run format:check`, lint, typecheck, 59 Vitest tests, and
  Next.js build pass locally. The local Chromium run is not authentication
  evidence.
- [CLERK VERIFIED] Read-only Development configuration inspection confirmed
  the configured Clerk environment is Development and the required local
  key names exist. Restricted Mode is recorded from the manual setup supplied
  for this phase; no Production Clerk configuration was changed.
- [BLOCKED] Real invitation acceptance, a signed-in Convex identity proof from
  the browser, and current branch Preview QA are not claimed until the
  isolated Preview deployment and non-secret QA identity setup are available.
- [PREVIEW BUILD] The pushed commit `c5fbe7a` reached Vercel Preview
  deployment `dpl_5up9f949qzn3m6qKKfarRyve6Y85` at
  `blessing-for-good-ntc8mkb20-masjaaks-projects.vercel.app`. The build
  selected isolated Convex Preview `robust-cheetah-853`, generated 18 static
  pages, and failed because `CLERK_JWT_ISSUER_DOMAIN` was unset there.
- [BLOCKED] The local Convex CLI account cannot inspect `robust-cheetah-853`;
  no environment value was printed or changed.

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
| Owner user management | [REPOSITORY] implemented; Preview runtime QA pending |
| Active anonymous Preview identity | [REPOSITORY] disabled; legacy exports fail closed |
| Current branch Convex Preview | [BLOCKED] branch build target exists; auth environment missing |
| Current branch Vercel Preview | [BLOCKED] latest deployment failed after the Next.js build |
| Production | [CONFIRMED] untouched and not configured for this phase |
| `main` | [CONFIRMED] untouched |

## Constraints

- Never print or commit keys, issuer values, Clerk subjects, emails, tokens,
  invitation URLs, passwords, or auth storage.
- Never merge to `main`, force-push, deploy Production, use `--prod`, promote
  a Preview, or connect Production Clerk/Convex.
- Unknown non-empty Preview business data requires a stop before migration.
- Existing Phase 03 operational invariants remain in force.

## Validation plan

1. Run format, lint, typecheck, Vitest, Convex tests/codegen, build, and local
   Vercel build.
2. Inspect Development and branch-isolated Preview record counts by name and
   count only.
3. Verify real Clerk sign-in, JWT delivery to Convex, provisioning, role
   behavior, suspension, invitation acceptance, and cross-customer isolation.
4. Inspect Vercel/Convex runtime logs for safe errors only.

## Rollback plan

The migration is source-controlled on the current feature branch. Convex
Development is empty for affected tables, so no data rewrite is required.
Preview rollout remains isolated; rollback is a branch deployment rollback,
not a Production change.

## Next action

Set or inherit `CLERK_JWT_ISSUER_DOMAIN` in the isolated current-branch Convex
Preview without touching Production, then rerun the Git-connected Preview and
the real invited-user QA matrix. Do not start Phase 04.2 until that proof
exists.

Historical Phase 03 context below this line is superseded by the Phase 04.1
identity model and retained only for product history.
