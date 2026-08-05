# BFG Interactive UX QA Issues

## Context Engineering

```text
Objective: browser-verify the prototype and remove Phase 02.2 P0/P1 usability friction.
Current state: [BROWSER VERIFIED] public Preview routes render; protected prototype flows fail closed.
Approved decisions: preserve zero-data startup and fail-closed production boundaries.
Prototype assumptions: local browser adapter is temporary and only runs behind explicit prototype mode.
Constraints: Preview only; no Production, main, Convex, Clerk, payment, or seeded business data.
Open questions: final identity, backend, access-code policy, and book-image persistence remain deferred.
Blockers: Preview Demo Mode is required for browser-testing customer/admin core flows.
Current priority: add a guarded Preview-only path, then rerun the same browser flow.
Files in scope: Playwright setup, navigation, state feedback, presentation components, context documentation.
Files out of scope: domain transitions, production auth, backend schema, payment, and messaging integrations.
Validation plan: Vitest, npm run check, Vercel build, Playwright at four viewports, Preview runtime logs.
Next action: implement and test Preview Demo Mode without weakening Production fail-closed behavior.
```

## Evidence

- [BROWSER VERIFIED] `52/52` Playwright smoke tests passed against the approved Preview at 375×812,
  768×1024, 1024×768, and 1440×900 when the Vercel automation bypass was supplied in memory.
- [BROWSER VERIFIED] The route smoke captured no browser console errors, page errors, or horizontal overflow.
- [BROWSER VERIFIED] The direct protected Preview redirects an unauthenticated browser to Vercel sign-in;
  authenticated CLI access remains available without changing Deployment Protection.
- [BROWSER VERIFIED] `/catalog`, account prototype routes, and admin prototype routes render the explicit
  `Prototype mode is off` guard on the current Preview.
- [REPOSITORY] `isPrototypeMode` only enables the browser-local adapter for development with the explicit
  `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true` flag.

## Issues

### UX-001 — Preview core flow is unavailable

- Route: `/catalog`, `/account/orders`, `/account/invoices`, `/admin/*`
- Viewport: all required viewports
- Severity: P1
- Evidence: [BROWSER VERIFIED] protected prototype routes show the fail-closed guard on Preview.
- Current behavior: public routes render, but catalog creation, unlock, preorder, and admin status flows cannot
  be exercised in a production-mode Preview.
- Expected behavior: an explicitly enabled Preview Demo Mode should allow zero-data browser QA.
- Root cause: [REPOSITORY] the local adapter is guarded by development-only environment checks.
- Recommended fix: add a Preview-only public flag and visible prototype marker; keep Production disabled.
- Status: confirmed; fix in progress.
- Affected files: `src/lib/environment.ts`, `src/domain/prototype/store.tsx`, `src/app/layout.tsx`, guard UI.
- Verification: rerun customer and admin Playwright flows on the new Preview.

### UX-002 — Admin entry is mixed into customer primary navigation

- Route: `/`
- Viewport: 1440×900
- Severity: P2
- Evidence: [BROWSER VERIFIED] desktop header exposes `Admin prototype` beside customer destinations.
- Current behavior: customer navigation contains Home, Catalog, Ready Stock, Orders, Account, and Admin prototype.
- Expected behavior: customer navigation should contain only customer destinations; admin navigation belongs inside
  the admin workspace.
- Root cause: [REPOSITORY] `SiteShell` renders the admin link in the shared customer navigation.
- Recommended fix: remove the shared customer-nav admin link; retain direct `/admin` access for prototype QA.
- Status: confirmed; fix in progress.
- Affected files: `src/components/site-shell.tsx`, E2E navigation assertions.
- Verification: browser navigation matrix has exactly five customer destinations.

### UX-003 — Book imagery is absent from the catalog presentation

- Route: `/catalog` unlocked state
- Viewport: 375×812 and 768×1024 priority
- Severity: P2
- Evidence: [REPOSITORY] current `Book` type has no image field; [BROWSER VERIFIED] the Preview cannot reach an
  unlocked catalog because UX-001 is active.
- Current behavior: catalog book cards have no cover area.
- Expected behavior: an intentional cover ratio and neutral typographic fallback should preserve hierarchy without
  inventing imagery.
- Root cause: approved book-cover sources and persistence are deferred.
- Recommended fix: add a presentation-only `BookCover` with optional local source and title/publisher fallback.
- Status: confirmed; fix in progress.
- Affected files: `src/components/book-cover.tsx`, catalog presentation styles/tests.
- Verification: component tests and unlocked Preview flow screenshot.

### UX-004 — Unimplemented admin destinations need explicit classification

- Route: admin workspace
- Viewport: 1024×768 and 1440×900
- Severity: P3
- Evidence: [REPOSITORY] Books, Customers, Tracking, Content, and Settings are rendered as non-links labelled
  `Unavailable`.
- Current behavior: no dead anchor is created; unavailable areas remain visible as foundation-only context.
- Expected behavior: unavailable destinations must be hidden or clearly marked.
- Root cause: richer admin modules are outside the prototype slice.
- Recommended fix: retain the explicit non-link state and record it in the navigation matrix.
- Status: accepted; no code change required.
- Affected files: `src/components/admin-nav.tsx`, navigation documentation.
- Verification: Playwright must assert no unavailable item is an anchor.

### UX-005 — Vercel toolbar overlay appears in Preview captures

- Route: all Preview routes
- Viewport: all required viewports
- Severity: P3
- Evidence: [BROWSER VERIFIED] the floating Vercel toolbar is visible in screenshots.
- Current behavior: the platform overlay sits above the application at the right edge.
- Expected behavior: application layout itself remains usable; review captures may hide the platform overlay.
- Root cause: Preview tooling, not application code.
- Recommended fix: do not change product code; omit the platform overlay from visual interpretation.
- Status: accepted; platform-owned.
- Affected files: none.
- Verification: route and overflow assertions remain green.

## Priority Summary

- P0: none observed.
- P1: UX-001 must be fixed before core customer/admin Preview flow can be claimed.
- P2: UX-002 and UX-003 are in scope for this phase.
- P3: UX-004 and UX-005 remain documented without speculative feature work.
