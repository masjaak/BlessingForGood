# Authenticated Session Hydration V2

## Scope

This hotfix covers the shared Clerk → Convex → `appUsers` → role/status boundary.
It does not change Convex functions, schema, admission policy, ownership rules,
financial behavior, Homepage V4.1.3, or Phase 07 Admin presentation.

## State boundary

1. Clerk loading or signed out remains distinct from an authenticated session.
2. Clerk signed in with Convex auth still syncing shows a lightweight session transition.
3. Convex finishing unauthenticated is a terminal recoverable auth error, not an infinite loading state.
4. `users.current` starts only after Convex reports authenticated.
5. `appUsers` provisioning resolves to active, suspended, or admission-required.
6. Customer/Admin queries start only after the active appUser role is authoritative.
7. Query `undefined` is reserved for a query that actually started; empty arrays/records render their existing empty states.

## Production failure superseded

The previous state machine mapped both Convex auth synchronization and a completed
but unauthenticated Convex session to `convex-loading`. Protected guards therefore
kept rendering skeletons while every private query remained skipped.

The provider now performs one bounded automatic Convex re-sync after a signed-in
session reports unauthenticated, and exposes retry for a terminal failure. The
existing invite-only `ensureCurrentUser` flow remains the only membership
provisioning path; missing admission resolves to an explicit account-not-active
state.

## Verification contract

Authenticated customer and Admin E2E coverage asserts usable route content with
no page reload and no remaining `.loading-region`. Unit coverage covers Clerk,
Convex, appUser, suspension, admission, and provisioning error transitions.
