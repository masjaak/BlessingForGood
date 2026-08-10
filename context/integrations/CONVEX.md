# BFG Convex Integration

## Runtime

The client hierarchy is:

```text
ClerkProvider
└── ConvexProviderWithClerk
    └── PrototypeProvider / BFG application
```

`ConvexProviderWithClerk` owns one memoized `ConvexReactClient`. `useConvexAuth`
is checked separately from Clerk loading and sign-in state. The app provisions
`users.ensureCurrentUser` only after Convex reports an authenticated identity.

## Server configuration

`convex/auth.config.ts` uses the server-side name
`CLERK_JWT_ISSUER_DOMAIN` and application ID `convex`. The issuer is never
hard-coded or returned to the client. `BFG_OWNER_CLERK_USER_ID` is server-only
and controls the single owner bootstrap match.

## Preview boundary

The Vercel build wrapper is:

```text
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"
```

It is allowed only for the current branch's isolated Convex Preview. No
Production Convex deploy key, deployment, or `--prod` operation is in scope.
Preview without a valid Convex URL fails closed; it cannot select the local
adapter or an anonymous session.

## Ownership

Convex functions derive the current user from `ctx.auth.getUserIdentity()` and
`appUsers`. Business references use `appUserId`, `customerUserId`, `userId`,
and authenticated actor fields. Client-supplied Clerk subjects, roles, and
ownership claims are ignored/rejected.

## Evidence

- [CONVEX VERIFIED] Codegen succeeds and 32 Convex tests pass against the
  configured Development deployment.
- [CONVEX VERIFIED] Development preflight found zero affected business rows.
- [BLOCKED] Current branch Preview JWT identity proof and runtime logs remain
  pending isolated Preview deployment.
- [PREVIEW BUILD] The Git-connected build selected isolated Preview
  `robust-cheetah-853` and completed the Next.js build, but Convex rejected the
  deploy because `CLERK_JWT_ISSUER_DOMAIN` was unset in that deployment.
