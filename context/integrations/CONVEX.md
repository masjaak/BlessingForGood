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

## Security boundary

Phase 03.1 uses a server-side Preview capability and expiring prototype
sessions. This is Preview infrastructure, not Clerk identity or Production
authorization. Production remains fail-closed until Clerk and an approved
Production Convex deployment exist.

Environment variable names are documented in `.env.example`; values and deploy
keys stay in Convex/Vercel configuration and are never committed.

## Deferred

Clerk, Production authorization, batch/cargo tracking, invoices, deposits,
payments, uploads, and WhatsApp API remain outside Phase 03.1.
