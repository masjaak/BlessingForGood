# BFG Auth Session Recovery V3

## Status

`BFG_AUTH_SESSION_V3_CODE_READY_PRODUCTION_AUTH_PENDING`

This is a P0 Clerk → Convex authentication recovery. Phase 08 remains
unstarted. The V2 terminal error state is preserved as a failure state, not
counted as successful authenticated acceptance.

## Evidence and first broken boundary

The affected routes share `ProductAccessGuard` and the `ConvexProviderWithClerk`
boundary. Production showed Clerk UI active while `/account`, `/account/orders`,
`/account/invoices`, and `/admin` rendered `Sesi BFG belum siap.`.

Public Production evidence confirms:

- Clerk uses the live BFG client and issuer `https://clerk.blessingforgood.com`.
- The client uses canonical Convex Production `https://clean-eel-522.convex.cloud`.
- `useConvexAuth()` is the first application boundary that fails; `appUser`,
  RBAC, ownership, and private queries are not reached.
- The previous `convex-error` branch correctly prevents false data/empty states,
  but it cannot repair a missing or invalid Convex issuer configuration.

## State machine

```text
CLERK_LOADING
  -- CLERK_LOADED --> SIGNED_OUT | CLERK_SIGNED_IN
CLERK_SIGNED_IN
  -- CONVEX_AUTH_STARTED --> CONVEX_AUTH_SYNCING
CONVEX_AUTH_SYNCING
  -- CONVEX_AUTH_SUCCESS --> CONVEX_AUTHENTICATED
  -- CONVEX_AUTH_FAILURE --> CONVEX_AUTH_FAILED
CONVEX_AUTHENTICATED
  -- APPUSER_FOUND --> APPUSER_ACTIVE | APPUSER_SUSPENDED
  -- APPUSER_MISSING --> APPUSER_MISSING
APPUSER_ACTIVE
  -- ROLE_CONFIRMED --> CUSTOMER_AUTHORIZED | ADMIN_AUTHORIZED
CUSTOMER_AUTHORIZED | ADMIN_AUTHORIZED
  -- QUERY_STARTED --> PRIVATE_DATA_LOADING
PRIVATE_DATA_LOADING
  -- QUERY_EMPTY --> READY_EMPTY
  -- QUERY_SUCCESS --> READY_POPULATED
  -- QUERY_FAILURE --> PRIVATE_DATA_ERROR
```

Invalid transitions are covered: Convex failure cannot enter private-data
loading, unresolved appUser cannot authorize, and role checks remain separate
from Clerk identity.

## Configuration correction

`convex/auth.config.ts` previously used a TypeScript non-null assertion for
`CLERK_JWT_ISSUER_DOMAIN`; a missing value could therefore reach deployment
without an actionable configuration failure. The new validator requires a real
HTTPS issuer.

The Production Vercel environment now contains the verified public issuer. The
existing Production build command synchronizes it into canonical Convex
Production before deploying functions, so the Convex auth provider validates the
same issuer that signs the live Clerk session.

No Clerk token, secret, deploy key, appUser, business record, or financial data
is printed or created by this change.

## TDD record

- Red: issuer-config regression failed because `convex/lib/auth-config` did not
  exist.
- Green: missing/invalid issuer, HTTPS issuer, release-command synchronization,
  auth state, and guard tests pass.
- Refactor: validation remains one small server-side helper; no second auth
  store or route-specific retry was introduced.

## Blast radius

Changed boundary:

```text
Convex auth configuration
Production build configuration
auth-state regression tests
documentation
```

Preserved:

```text
Homepage V4.1.3
Phase 07 Admin presentation
Secret Catalog security
appUser admission policy
RBAC and ownership
orders, invoices, payments, deposits, refunds, exceptions
schema and Convex business functions
```

## Acceptance gate

Local and signed-out route gates do not close this incident. Final status may
only become `BFG_AUTHENTICATED_SESSION_RECOVERY_V3_PRODUCTION_VERIFIED` after a
real Chrome customer and owner/admin session reaches usable protected UI without
refresh. Until then, the honest status remains code-ready/auth-pending or
production-blocked.
