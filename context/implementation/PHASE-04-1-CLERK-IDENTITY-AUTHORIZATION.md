# Phase 04.1 — Clerk Identity and Authorization

## Status transition

| Area | Status |
| --- | --- |
| Phase 04.1 implementation | IMPLEMENTED |
| Local validation | GREEN |
| Runtime integration QA | DEFERRED TO STAGING |
| Production readiness | NOT READY |

## Decision

Clerk Development provides BFG identity. Convex provides BFG business
authorization. Application roles live in Convex. Restricted Mode keeps account
admission invite-only. Prototype sessions are deprecated for active Preview.
Production authentication is not configured.

## Delivered in the repository

- Reused Clerk middleware, provider, and shell; removed public signup CTA.
- Added current Clerk sign-in/sign-up route components and invite-only copy.
- Added `ConvexProviderWithClerk`, auth state handling, and fail-closed Preview
  provider selection.
- Added `convex/auth.config.ts`, `appUsers`, owner bootstrap, role/status
  validation, centralized permissions, authorization helpers, and audit rows.
- Migrated active business ownership and actor references from prototype
  sessions to app users.
- Added secret catalog grant isolation, customer profile/address ownership,
  atomic default-address handling, route guards, and owner user management.
- Disabled legacy anonymous session exports for active functions.
- Added synthetic identity/authorization tests and Clerk-aware Playwright
  configuration with no committed auth storage.

## Evidence and handoff

[CONVEX VERIFIED] Development codegen, zero-data ownership preflight, and 32
Convex tests pass. [REPOSITORY] Web checks, 59 Vitest tests, and Next.js build
pass locally. [SUPERSEDED] The former branch-specific Preview `READY` gate is
retired as a Phase 04.1 completion requirement. Real Development invitation,
authenticated Convex identity, ownership, operational, browser, runtime-log,
and cleanup QA are deferred to the stable staging gate.

## Next milestone

Stable staging QA for Phase 04.1, followed by the approved next phase.
