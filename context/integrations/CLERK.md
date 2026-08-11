# BFG Clerk Integration

## Environment status

Local deterministic QA currently uses Clerk Development. Production must use a
matching pair from one Clerk Production instance with the actual owned BFG
domain; those Production credentials are not available in this worktree.

Required names in both environments are:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

Values are kept outside Git and are never printed. Never use the local
`pk_test_…`/`sk_test_…` pair for Production, and never mix instances.

## Admission

Restricted Mode is enabled in the supplied Clerk Development setup. Email
authentication is available, Convex integration is activated, and invitation
acceptance is the only normal account-admission path. `/sign-up` remains for
valid invitation acceptance but is not linked as public signup UX.

## Application integration

- `src/proxy.ts` uses `clerkMiddleware()` and the Clerk matcher.
- The root layout has one `ClerkProvider`.
- The shell uses `Show`, `SignInButton`, and `UserButton`.
- Auth routes use current Clerk App Router components and redirect signed-in
  users to `/catalog`.
- `ConvexProviderWithClerk` passes Clerk auth to Convex.

Clerk identity is not the BFG role system. Convex owns role/status/permission
resolution in `appUsers`.

## QA policy

Use Development identities only for local deterministic QA. Authorized real
Production QA identities may be used only after the Production instance,
domain, and Convex issuer are configured. Never commit testing tokens,
passwords, cookies, storage state, session tokens, invitation URLs, emails, or
Clerk IDs.

[CLERK VERIFIED] Development configuration names and environment type were
checked without exposing values. [BLOCKED] Real Production sign-in,
invitation acceptance, and authenticated browser QA require the matching
Production instance/domain and canonical Convex configuration.
