# BFG Interactive UX QA Issues

## Context Engineering

```text
Objective: browser-verify the prototype and remove Phase 02.2 P0/P1 usability friction.
Current state: [BROWSER VERIFIED] final Preview routes and zero-data prototype flows pass browser QA.
Approved decisions: preserve zero-data startup and fail-closed production boundaries.
Prototype assumptions: local browser adapter is temporary and only runs behind explicit prototype mode.
Constraints: Preview only; no Production, main, Convex, Clerk, payment, or seeded business data.
Open questions: final identity, backend, access-code policy, and book-image persistence remain deferred.
Blockers: none for Phase 02.2 Preview QA; production auth and shared persistence remain deferred.
Current priority: visual review of the final Preview, then hand off to Phase 03 planning.
Files in scope: Playwright setup, navigation, state feedback, presentation components, context documentation.
Files out of scope: domain transitions, production auth, backend schema, payment, and messaging integrations.
Validation plan: Vitest, npm run check, Vercel build, Playwright at four viewports, Preview runtime logs.
Next action: review the final Preview URL without changing Production or `main`.
```

## Evidence

- [BROWSER VERIFIED] `56/56` Playwright tests passed against the final Preview at 375×812, 768×1024,
  1024×768, and 1440×900 when the Vercel automation bypass was supplied in memory.
- [BROWSER VERIFIED] The route smoke captured no browser console errors, page errors, or horizontal overflow.
- [BROWSER VERIFIED] The direct protected Preview redirects an unauthenticated browser to Vercel sign-in;
  authenticated CLI access remains available without changing Deployment Protection.
- [BROWSER VERIFIED] The final Preview shows the explicit `Prototype Preview` label, starts with zero records,
  and completes the customer/admin flow in isolated browser storage.
- [BROWSER VERIFIED] The final Preview route set includes no dead customer anchors; unavailable admin entries are
  visible non-links labelled `Unavailable`.
- [REPOSITORY] Production still requires the existing fail-closed boundary; Preview Demo Mode is not authentication.

## Issues

### UX-001 — Preview core flow was unavailable

- Route: `/catalog`, `/account/orders`, `/account/invoices`, `/admin/*`
- Viewport: all required viewports
- Severity: P1
- Evidence: [BROWSER VERIFIED] the final Preview flow passes in all four Playwright projects.
- Current behavior: Preview Demo Mode enables the browser-local zero-data flow only when the Preview environment
  boundary and the explicitly configured Preview flag both apply.
- Expected behavior: an explicitly enabled Preview Demo Mode should allow zero-data browser QA.
- Root cause: [REPOSITORY] the local adapter was guarded by development-only checks, and the first implementation
  passed the entire `process.env` object through a client bundle instead of statically reading public keys.
- Recommended fix: implemented a Preview-only public flag and visible prototype marker; Production remains disabled.
- Status: fixed and [BROWSER VERIFIED] on the final Preview.
- Affected files: `src/lib/environment.ts`, `src/domain/prototype/store.tsx`, `src/app/layout.tsx`, guard UI.
- Verification: customer/admin flow passed in all four Playwright projects on the final Preview.

### UX-002 — Admin entry was mixed into customer primary navigation

- Route: `/`
- Viewport: 1440×900
- Severity: P2
- Evidence: [BROWSER VERIFIED] desktop and mobile headers expose only customer destinations.
- Current behavior: customer navigation contains only Home, Catalog, Ready Stock, Orders, and Account.
- Expected behavior: customer navigation should contain only customer destinations; admin navigation belongs inside
  the admin workspace.
- Root cause: [REPOSITORY] `SiteShell` renders the admin link in the shared customer navigation.
- Recommended fix: removed the shared customer-nav admin link; direct `/admin` access remains available for prototype QA.
- Status: fixed and [BROWSER VERIFIED].
- Affected files: `src/components/site-shell.tsx`, E2E navigation assertions.
- Verification: browser navigation matrix has exactly five customer destinations at all four viewports.

### UX-003 — Book imagery was absent from the catalog presentation

- Route: `/catalog` unlocked state
- Viewport: 375×812 and 768×1024 priority
- Severity: P2
- Evidence: [REPOSITORY] current `Book` type has no image field; [BROWSER VERIFIED] the fallback renders during
  the unlocked Preview flow.
- Current behavior: catalog book cards use a stable 2:3 `BookCover` area with a typographic fallback when no
  approved image source exists.
- Expected behavior: an intentional cover ratio and neutral typographic fallback should preserve hierarchy without
  inventing imagery.
- Root cause: approved book-cover sources and persistence are deferred.
- Recommended fix: implemented a presentation-only `BookCover` with optional local source and title/publisher fallback.
- Status: fixed and [BROWSER VERIFIED].
- Affected files: `src/components/book-cover.tsx`, catalog presentation styles/tests.
- Verification: component tests, full Preview flow, and responsive screenshots.

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
- Verification: [BROWSER VERIFIED] no unavailable item is an anchor in the final Preview.

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
- P1: none remaining. UX-001 is fixed and verified.
- P2: UX-002 and UX-003 are fixed; footer and Preview mode polish are also verified.
- P3: UX-004 and UX-005 remain documented without speculative feature work.
