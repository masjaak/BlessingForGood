# BFG Convex Integration

## Canonical backend

The canonical Convex account is `palevvi@gmail.com`, team is `palevvi`, and
project is `blessingforgood`. The development reference is `dev/masjak`.

```text
BFG_CANONICAL_CONVEX_TEAM=palevvi
BFG_CANONICAL_CONVEX_PROJECT=blessingforgood
BFG_CANONICAL_DEV=content-snake-214
BFG_CANONICAL_PRODUCTION=clean-eel-522
```

These are identifiers, not secrets. Only this Convex project is authorized for
active BFG development. A separate similarly named BFG project under another
account/team is a duplicate and is `NON-CANONICAL`: do not use, deploy, or
configure it, and do not delete it automatically.

If configuration fails, fix the configuration instead of creating a new BFG
Convex project. Never use a similarly named BFG project, create a
Preview-looking deployment manually, or run any Convex environment operation
before verifying the team, project, and deployment.

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

This wrapper does not authorize a Preview or Production operation. Preview is
not an active BFG environment; never create or target a Preview-looking
deployment manually. Active development uses canonical Convex Development
`content-snake-214`; Production `clean-eel-522` remains untouched during
feature work. Missing or invalid canonical configuration is a blocker, not a
reason to create another project.

## Ownership

Convex functions derive the current user from `ctx.auth.getUserIdentity()` and
`appUsers`. Business references use `appUserId`, `customerUserId`, `userId`,
and authenticated actor fields. Client-supplied Clerk subjects, roles, and
ownership claims are ignored/rejected.

## Evidence

- [CONVEX VERIFIED] The local Phase 06.2 Convex suite passes 48 tests against
  the repository test environment, including admission authorization and
  transitions.
- [DEFERRED] Local CLI codegen currently lacks access to its selected project;
  no alternate project was selected and no Convex environment operation was
  performed.
- [SUPERSEDED] Historical branch Preview diagnostics are not a canonical BFG
  backend and are not an active development or deployment target.
