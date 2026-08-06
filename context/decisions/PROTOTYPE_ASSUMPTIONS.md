# Prototype Assumptions

All entries below are `prototype-only`. They are reversible implementation choices, not final business decisions.

## PA-001 — Secret catalog access code

Status: local-adapter assumption retained for fallback; the active Convex path is governed by PA-007.

- Area: catalog access
- Reason: the production context pack is absent from the canonical repository.
- Temporary behavior: one access code unlocks one catalog; the local adapter stores its existing hash, while Convex
  uses a server-keyed catalog-specific digest and never returns plaintext.
- Trade-off: the local adapter is not a production identity or rate-limit system.
- Replacement trigger: Convex and approved access-code security rules are restored.
- Affected files: `src/domain/prototype/*`, `src/app/catalog/page.tsx`

## PA-002 — Local development adapter

Status: fallback retained; Convex is now primary whenever a valid development or Preview URL is configured.

- Area: persistence
- Reason: the local fallback remains useful for isolated UI work even though Convex development and Preview are configured.
- Temporary behavior: browser local storage is used only when `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true`.
- Trade-off: data is local to one browser and is not production-safe.
- Replacement status: satisfied for the active Convex development/Preview path; fallback remains explicit and local only.
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

Status: superseded for active Vercel Preview persistence by PA-007; the public flag remains the Preview capability
indicator and local fallback guard.

- Area: Preview usability
- Reason: browser QA needs the existing local adapter, but Vercel Preview builds use production `NODE_ENV`.
- Temporary behavior: browser-local prototype persistence is enabled only when
  `NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE=true` and the server marks the deployment as `VERCEL_ENV=preview`.
- Trade-off: this is a QA-only capability, not authentication or production access. With Convex configured, Preview
  data is shared by the isolated Convex Preview deployment rather than browser-local.
- Safety boundary: Production rejects the same public flag because the server Preview boundary is false there.
- Validation: [SUPERSEDED] the browser-local flow passed before Convex migration; the active shared Preview flow is
  validated under PA-007.
- Replacement trigger: Convex and Clerk development/test environments are restored.
- Affected files: `src/app/layout.tsx`, `src/domain/prototype/store.tsx`, `src/lib/environment.ts`.

## PA-007 — Convex Preview prototype persistence

- Area: Phase 03.1 persistence and identity boundary
- Reason: the approved vertical slice needs shared Preview data before Clerk is available.
- Temporary behavior: Convex Preview stores catalog and preorder records; anonymous browser sessions are represented by
  expiring server-side token digests, and admin access requires a server-verified Preview code.
- Safety boundary: this capability is enabled only by Convex Preview configuration. It is not authentication,
  Production authorization, or a substitute for Clerk.
- Migration behavior: existing browser-local records are never uploaded or merged automatically; Convex deployments
  start empty.
- Validation: [PREVIEW VERIFIED] `56/56` Playwright tests passed, including reload persistence, cross-browser admin
  visibility, second-customer isolation, and zero-data cleanup.
- Replacement trigger: Clerk and approved Production authorization are implemented.
- Affected files: `convex/`, `src/domain/prototype/`, and the Convex/Vercel Preview configuration.
