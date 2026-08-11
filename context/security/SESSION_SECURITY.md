# BFG Session Security

## Active identity

The active Preview identity is Clerk only. `ConvexProviderWithClerk` supplies
the Clerk token to Convex; no token is copied into application state or the
database. The browser may remember an unlocked catalog ID for convenience,
but that value is not an authentication or ownership claim.

The application never stores passwords, JWTs, Clerk session tokens, Clerk
secrets, MFA recovery data, or invitation URLs.

## Legacy isolation

`prototypeSessions`, `convex/lib/sessions.ts`, and the old Preview admin code
are retained only because earlier tests and historical context reference them.
Their public mutation/query entry points return `LEGACY_IDENTITY_DISABLED`.
No active Preview function calls `requireSession`; active records use
`appUsers` references.

Allowed legacy use is limited to explicit local fallback and isolated legacy
unit tests. It is not an active Preview identity, admin bypass, ownership
source, or Production fallback.

## Environment classification

| Name | Classification |
| --- | --- |
| `BFG_PREVIEW_ADMIN_ACCESS_CODE` | obsolete for active Preview |
| `BFG_SESSION_TOKEN_PEPPER` | legacy test-only; not used by active functions |
| `BFG_PREVIEW_DEMO_MODE` | legacy server capability only; not an active identity gate |
| `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` | temporary Preview presentation/feature flag; never auth |

The active catalog code path uses configured server-side secret material and
Clerk authorization; it no longer requires the legacy Preview flag.
