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
acceptance is the only normal account-admission path. BFG-created invitations
land on the invite-only `/sign-up` route with Clerk's ticket parameter; it is
not linked as public signup UX. A pre-existing Clerk session cannot be silently
used for a different invitation.

## Application integration

- `src/proxy.ts` uses `clerkMiddleware()` and the Clerk matcher.
- The root layout has one `ClerkProvider`.
- The shell uses `Show`, `SignInButton`, and `UserButton`.
- Auth routes use current Clerk App Router components. Invitation tickets are
  handled before signed-in redirects, with explicit sign-out/restart recovery
  for a possible account mismatch.
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
checked without exposing values. [PRODUCTION RETEST REQUIRED] Real ticket
acceptance, identity correlation, and authenticated browser QA require the
matching Production instance/domain and an authorized legitimate Customer
session; deterministic tests do not replace that proof.
