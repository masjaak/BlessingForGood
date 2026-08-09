# BFG Authentication

## Model

Clerk Development provides identity. Convex validates the Clerk JWT using the
issuer in `CLERK_JWT_ISSUER_DOMAIN`; Convex then resolves the Clerk subject to
one `appUsers` document. Application authorization does not come from Clerk
roles or client state.

```text
ClerkProvider
└── ConvexProviderWithClerk
    └── BFG application
```

`src/providers/convex-provider.tsx` owns one memoized `ConvexReactClient`.
`src/app/layout.tsx` remains a server-renderable root layout.

## Admission and routes

- Restricted Mode keeps account admission invite-only.
- Signed-out public navigation exposes `Masuk`; generic signup is not a
  normal CTA.
- `/sign-up/[[...sign-up]]` remains available for valid Clerk invitation
  acceptance.
- `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` redirect an already
  signed-in user to `/catalog`.
- Clerk middleware and server route layouts protect resource families;
  Convex remains the authoritative data boundary.

## Explicit client states

| State | Behavior |
| --- | --- |
| Clerk loading | render a neutral loading state |
| signed out | render invite-only sign-in CTA; no protected query |
| Convex loading/refreshing | render a neutral confirmation state; no protected data |
| provisioning | call `users.ensureCurrentUser` once the Convex identity is ready |
| authenticated | mount only queries allowed by the resolved BFG role |
| suspended | show suspension state; keep sign-out available; skip business queries |
| permission denied | show a safe denial state; never expose internal permission names |
| configuration missing | fail closed without local or anonymous Preview fallback |
| network failure | show a retry-safe error state; do not switch identity systems |

## `appUsers` provisioning

`users.ensureCurrentUser` reads `ctx.auth.getUserIdentity()`, indexes by
`identity.subject`, and updates only safe profile snapshots and timestamps for
an existing record. A missing record becomes `owner` only when the verified
subject equals server-only `BFG_OWNER_CLERK_USER_ID`; every other new user is
`customer`.

The function is idempotent and never accepts a client role, status, Clerk ID,
email ownership claim, JWT, or session token. Suspended status is preserved on
re-login.

## Evidence

- [REPOSITORY] Clerk provider, middleware, auth routes, Convex provider, auth
  config, and provisioning code are present.
- [CONVEX VERIFIED] Synthetic `withIdentity` tests cover missing identity,
  owner bootstrap, customer default, idempotency, suspension, and legacy
  rejection.
- [BLOCKED] Real browser sign-in, invitation acceptance, and a runtime
  `ctx.auth.getUserIdentity()` proof against current Preview are not claimed
  until isolated Preview QA is run.
