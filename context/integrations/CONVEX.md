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

## Phase 03.2 operations persistence

[REPOSITORY] The existing Convex project now includes persistent batches,
shipment and fulfillment histories, invoice snapshots, deposit accounts,
append-only transactions, and invoice allocations. The frontend uses reactive
queries for customer and admin operational screens.

[CONVEX VERIFIED] The isolated Development deployment accepted the current
schema and functions. The 27-test Convex suite covers transition guards,
financial calculations, ledger invariants, atomic allocation/release/reversal,
customer ownership, and zero-data behavior.

[REPOSITORY] The full browser matrix passes against real Convex Development:
60/60 tests across 375×812, 768×1024, 1024×768, and 1440×900. The final
[PREVIEW VERIFIED] The same 60/60 matrix passes against the branch-scoped
Preview deployment `charming-horse-40`. The four server-side Preview
environment names are configured on that deployment outside Git; no
Production Convex deployment or key is configured.

## Deferred

Clerk, Production authorization, payment settlement, uploads, email, and
WhatsApp API remain outside Phase 03.2. Final refund, tax, customs, shipping,
exchange-rate, and cancellation policies remain deferred.
