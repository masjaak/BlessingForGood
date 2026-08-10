# BFG Environment Matrix

## Canonical Convex backend

The canonical Convex account is `palevvi@gmail.com`. These identifiers are not
secrets:

```text
BFG_CANONICAL_CONVEX_TEAM=palevvi
BFG_CANONICAL_CONVEX_PROJECT=blessingforgood
BFG_CANONICAL_DEV=content-snake-214
BFG_CANONICAL_PRODUCTION=clean-eel-522
```

A separate similarly named BFG project under another Convex account/team is a
duplicate and is `NON-CANONICAL`: do not use, deploy, or configure it, and do
not delete it automatically.

Verify the Convex team, project, and deployment before every environment
operation. If configuration fails, fix it; never create a new BFG project or a
Preview-looking deployment manually.

| Environment | Identity | Data source | Active fallback | Status |
| --- | --- | --- | --- | --- |
| Local development | Clerk when explicitly configured; local adapter only when explicitly enabled | canonical Convex Development `content-snake-214` or local adapter | explicit local fallback | allowed |
| Feature Preview | Clerk Development only | none; do not create a Convex Preview deployment | none | prohibited active target |
| BFG Staging | Clerk configuration appropriate for staging | not configured; no separate BFG Convex target is authorized | none | future integration gate; not configured |
| Vercel Production | not configured | canonical Convex Production `clean-eel-522` | none | untouched |

## Branch model

```text
main
= release / Production line

develop
= BFG integration line

feat/*
= implementation branches
```

Feature branches merge into `develop`. `main` remains untouched during
product build. The eventual staging environment is sourced from approved
`develop` integration state. Production only comes from an approved release.

## Names only

Local/Preview/Staging application names:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CONVEX_URL
CONVEX_DEPLOYMENT
CONVEX_DEPLOY_KEY
CLERK_JWT_ISSUER_DOMAIN
BFG_OWNER_CLERK_USER_ID
BFG_CATALOG_CODE_PEPPER
```

`.env.example` contains names and placeholders only. `.env.local`, `.vercel/`,
cookies, Playwright storage, deploy keys, and service secrets remain ignored.

## Legacy names

`BFG_PREVIEW_ADMIN_ACCESS_CODE` is obsolete. `BFG_SESSION_TOKEN_PEPPER` and
server `BFG_PREVIEW_DEMO_MODE` are legacy-only. The public
`NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE` flag is temporary presentation/feature
configuration and is never identity or authorization.

## State boundary

Local development with a valid canonical Convex Development URL uses Clerk plus
Convex. If the canonical team, project, or deployment cannot be verified,
stop and fix configuration; do not select a similarly named project or create a
new one. Feature Preview is not an active BFG environment: never create a
Preview-looking deployment manually, and never use it as a fallback for local
development or Production.

Phase 05.1 follows the same boundary: local and Convex Development validation
use the canonical Development deployment; real Clerk payment-review, browser,
realtime, log, and cleanup evidence belongs to the one stable staging gate.
