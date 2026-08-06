# Convex integration boundary

## Phase 03.1 status

The BFG Convex project is `blessing-for-good` in the authenticated personal
team. A personal cloud development deployment is selected locally. The
Vercel `CONVEX_DEPLOY_KEY` is Preview-only; no Production Convex key or
deployment has been configured.

Convex Preview deployments are branch-scoped and isolated from development
and Production. The Vercel Preview build will use:

```text
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"
```

No `--preview-run` seed function is used. A new Preview starts with zero
business records.

[CONVEX VERIFIED] The personal development deployment passed schema/codegen
checks and the Convex test suite. The branch Preview deployment
`youthful-retriever-820` deployed the same functions and indexes through the
Vercel build.

[PREVIEW VERIFIED] The Vercel Preview flow passed `56/56` Playwright tests,
including reload persistence, admin visibility from another browser context,
customer ownership isolation, and explicit zero-data cleanup. The business
tables were empty before and after the run.

## Security boundary

Phase 03.1 uses a server-side Preview capability and expiring prototype
sessions. This is Preview infrastructure, not Clerk identity or Production
authorization. Production remains fail-closed until Clerk and an approved
Production Convex deployment exist.

Environment variable names are documented in `.env.example`; values and deploy
keys stay in Convex/Vercel configuration and are never committed.

Preview-only server names are `BFG_PREVIEW_DEMO_MODE`,
`BFG_CATALOG_CODE_PEPPER`, `BFG_SESSION_TOKEN_PEPPER`, and
`BFG_PREVIEW_ADMIN_ACCESS_CODE`. The Vercel Preview-only name
`CONVEX_DEPLOY_KEY` is used only by the branch build. No Production key is
configured.

## Deferred

Clerk, Production authorization, batch/cargo tracking, invoices, deposits,
payments, uploads, and WhatsApp API remain outside Phase 03.1.
