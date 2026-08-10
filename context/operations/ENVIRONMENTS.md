# BFG Environment Matrix

| Environment | Identity | Data source | Active fallback | Status |
| --- | --- | --- | --- | --- |
| Local development | Clerk when explicitly configured; local adapter only when explicitly enabled | Convex Development or local adapter | explicit local fallback | allowed |
| Feature Preview | Clerk Development only | isolated branch Convex Preview | none; fail closed if URL/config is missing | optional diagnostic only |
| BFG Staging | Clerk configuration appropriate for staging | one stable Convex staging backend | none | future integration gate; not configured |
| Vercel Production | not configured | not configured | none | untouched |

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

Feature Preview with a valid Convex URL uses Clerk plus Convex. Preview without
that URL returns a configuration-missing state and never falls back to
anonymous sessions or browser-local business data. Feature Preview is not the
Phase 04.1 runtime acceptance gate; stable staging is.

Phase 05.1 follows the same boundary: local and Convex Development validation
are required for the feature branch; real Clerk payment-review, browser,
realtime, log, and cleanup evidence belongs to the one stable staging gate.
