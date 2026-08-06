# Project Status

## Repository intake

[CONFIRMED] The canonical GitHub repository is readable at `design/visual-alignment-v0.1`, branched from `prototype/v0.1`.

[CONFIRMED] The official readable asset source was copied into `public/brand/` and `public/mockups/` with exact binary checksums. Asset roles and mockup mappings are documented in `context/brand/` and `context/mockups/`.

[LIMITATION] The remote repository still does not contain several product context folders listed in the original file manifest (`context/product`, `context/screens`, `context/features`, `src/features`, and `context/SOURCE_OF_TRUTH.md`). The visual pass uses the available implementation brief, audited physical references, and existing route/domain behavior without inventing missing product decisions.

## Current priority

[COMPLETED] Phase 03.1 Convex core persistence on `feat/convex-core-persistence-v0.1`. The secret-catalog-to-
preorder vertical slice is backed by an isolated Convex Preview deployment and verified through Vercel Preview.

## Active constraints

- No production authentication, payment, WhatsApp API, or deployment.
- No business records are seeded at runtime.
- Official logo, mascot, and mockup files are now committed; no replacement assets or mockup business data were generated.
- Prototype-only behavior is guarded by `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true` in development.
- The local adapter is an explicit local-development fallback; it is not production persistence and Preview fails closed without a valid Convex URL.
- Preview Demo Mode is configured only for Vercel/Convex Preview and remains guarded by the server-side Preview boundary.
- The existing Vercel project `blessing-for-good` is configured for Next.js Preview deployments; Production remains untouched by this repair.
- A separate Convex project `blessing-for-good` now has a personal cloud development deployment. A Convex Preview
  deploy key is configured only in the linked Vercel Preview environment; no Production Convex key is configured.
- Phase 03.1 Convex tests pass. Real dev and branch Preview deployments verified guarded sessions, keyed secret
  handling, zero-data startup, persistence, reload behavior, admin visibility, and customer isolation.

## Phase 03.1 Convex core persistence

[CONVEX VERIFIED] The schema, indexes, validators, Preview capability, expiring prototype sessions, catalog
access-code verification, catalog persistence, order snapshots, ownership checks, and edit/lock transitions are
deployed to the personal development deployment and the branch-scoped Convex Preview deployment.

[PREVIEW VERIFIED] Vercel Preview `dpl_4BxuvP1MvDzS9kktZyGfTmrmcAGk` is READY at
`https://blessing-for-good-1zm4ur6w9-masjaaks-projects.vercel.app`. The build deployed the Convex Preview
deployment `youthful-retriever-820`, generated all 14 App Router routes, and used the Preview-only deploy key.

[PREVIEW VERIFIED] All 56 Playwright tests passed against the new Preview across 375×812, 768×1024, 1024×768,
and 1440×900. The 12 implemented routes returned HTTP 200 through authenticated Vercel CLI requests. Convex
Preview business tables were empty before/after the test run; test records were explicitly cleaned.

[PREVIEW VERIFIED] Vercel runtime logs returned no entries. Convex history contained only expected negative-path
access-code/session errors from browser QA and teardown; no secret values were logged.

## Phase 02.1 visual alignment

[CONFIRMED] Brand assets were copied exactly and mapped. `Logo-4.png` is the runtime primary wordmark, `Logo-2.png` is the symbol/app-icon candidate, and Mascott-1/3/4 are used only for communication states.

[CONFIRMED] Centralized semantic color, typography, spacing, radius, border, shadow, focus, motion, and responsive tokens were added. A visual gap audit and QA report record the evidence and remaining gaps.

[CONFIRMED] Customer navigation, admin navigation, welcome/catalog/order surfaces, admin sidebar fallback, empty states, form controls, status badges, and tracking/invoice surfaces were refined without changing domain transitions.

[CONFIRMED] `npm run check` passes with 21 tests. `npx vercel@latest build` passes with the Preview target and all implemented routes statically generated.

[BROWSER VERIFIED] Playwright Chromium verifies the protected Preview through an in-memory Vercel automation bypass. The full 56-test matrix passes at 375×812, 768×1024, 1024×768, and 1440×900, including the zero-data customer/admin flow.

[BROWSER VERIFIED] Preview Demo Mode remains visibly labelled, starts with zero records, persists only in the test browser, and does not alter the Production boundary.

[CONFIRMED] Final Preview deployment `dpl_GrBVzaVHbcFLuKpxCCzWscutaDz2` is READY at `https://blessing-for-good-6h90y7tgw-masjaaks-projects.vercel.app`. The target is `preview`; authenticated CLI root verification returned HTTP 200 and the runtime error query returned no logs.

## Deployment diagnosis

[CONFIRMED] The failed deployment `dpl_sKtouPU4wmT1npv42vrPFLbwar2x` cloned `prototype/v0.1` at commit `cf1c5b7` and completed `next build` successfully.

[CONFIRMED] The first causal error was Vercel looking for an Output Directory named `dist` after the Next.js build completed. The existing project had Framework Preset `Other` and Output Directory `dist`.

[FIXED] The existing Vercel project now uses Framework Preset `Next.js` and Next.js automatic Output Directory detection. Local `vercel build` passes with the Preview target; no `vercel.json` override or application-code change was needed.

[CONFIRMED] Preview deployment `dpl_HwuopThbRTvjF2YrNZs3K8i3mRGr` is READY at `https://blessing-for-good-bxlsx6rog-masjaaks-projects.vercel.app`. All 12 implemented routes returned HTTP 200 through authenticated Vercel CLI requests, and the Preview runtime error query returned no logs.

[SUPERSEDED] The Phase 02.1 browser-tooling limitation is superseded by the Phase 02.2 Playwright setup; its historical note remains in the Phase 02.1 section.

## Status

`completed` — Phase 02.1, Phase 02.2, and Phase 03.1 are validated on their dedicated branches. No merge to
`main` or Production deployment has been performed.
