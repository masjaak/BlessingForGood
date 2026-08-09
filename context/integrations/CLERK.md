# BFG Clerk Integration

## Development only

Clerk Development is the identity provider for this phase. The repository
expects these local/Preview names only:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

Values are kept outside Git and are never printed. Production Clerk is not
configured.

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

Use Development test identities only. Never commit testing tokens, passwords,
cookies, storage state, session tokens, invitation URLs, emails, or Clerk IDs.

[CLERK VERIFIED] Development configuration names and environment type were
checked without exposing values. [BLOCKED] Real invitation acceptance and
authenticated browser QA require an isolated Preview run.
