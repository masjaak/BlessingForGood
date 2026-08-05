# Prototype Assumptions

All entries below are `prototype-only`. They are reversible implementation choices, not final business decisions.

## PA-001 — Secret catalog access code

- Area: catalog access
- Reason: the production context pack is absent from the canonical repository.
- Temporary behavior: one access code unlocks one catalog; only a SHA-256 hash is stored in the prototype state.
- Trade-off: the local adapter is not a production identity or rate-limit system.
- Replacement trigger: Convex and approved access-code security rules are restored.
- Affected files: `src/domain/prototype/*`, `src/app/catalog/page.tsx`

## PA-002 — Local development adapter

- Area: persistence
- Reason: no Convex deployment credentials are present.
- Temporary behavior: browser local storage is used only when `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true`.
- Trade-off: data is local to one browser and is not production-safe.
- Replacement trigger: Convex development environment is configured.
- Affected files: `src/domain/prototype/store.tsx`

## PA-003 — Admin prototype identity

- Area: authentication
- Reason: Clerk credentials are unavailable.
- Temporary behavior: admin screens fail closed unless explicit prototype mode is enabled; no visitor is treated as authenticated outside that mode.
- Trade-off: this is a development boundary, not authentication.
- Replacement trigger: Clerk and backend authorization are configured.
- Affected files: `src/components/prototype-mode-guard.tsx`, `src/app/admin/*`

## PA-004 — Catalog creation form

- Area: vertical slice speed
- Reason: the first prototype slice needs one traceable path from catalog creation to ordering.
- Temporary behavior: the admin can create one catalog, one publisher, one title, and up to three format variants in one form; the same action creates it open for the prototype flow.
- Trade-off: richer catalog management is deferred.
- Replacement trigger: approved catalog-management context is restored.
- Affected files: `src/app/admin/catalogs/page.tsx`, `src/domain/prototype/logic.ts`

## PA-005 — Deposit requirement

- Area: invoices
- Reason: no approved universal deposit rule is available.
- Temporary behavior: invoice foundation supports fixed, percentage, or unset deposit requirements; new records default to unset.
- Trade-off: payment verification remains a foundation only.
- Replacement trigger: approved deposit and payment rules are restored.
- Affected files: `src/domain/prototype/types.ts`, `src/domain/prototype/logic.ts`

## PA-006 — Guarded Preview Demo Mode

- Area: Preview usability
- Reason: browser QA needs the existing local adapter, but Vercel Preview builds use production `NODE_ENV`.
- Temporary behavior: browser-local prototype persistence is enabled only when
  `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE=true` and the server marks the deployment as `VERCEL_ENV=preview`.
- Trade-off: this is a QA-only browser workspace, not authentication, shared persistence, or production access.
- Safety boundary: Production rejects the same public flag because the server Preview boundary is false there.
- Replacement trigger: Convex and Clerk development/test environments are restored.
- Affected files: `src/app/layout.tsx`, `src/domain/prototype/store.tsx`, `src/lib/environment.ts`.
