# Project Status

## Repository intake

[CONFIRMED] The canonical GitHub repository is readable at `design/visual-alignment-v0.1`, branched from `prototype/v0.1`.

[CONFIRMED] The official readable asset source was copied into `public/brand/` and `public/mockups/` with exact binary checksums. Asset roles and mockup mappings are documented in `context/brand/` and `context/mockups/`.

[LIMITATION] The remote repository still does not contain several product context folders listed in the original file manifest (`context/product`, `context/screens`, `context/features`, `src/features`, and `context/SOURCE_OF_TRUTH.md`). The visual pass uses the available implementation brief, audited physical references, and existing route/domain behavior without inventing missing product decisions.

## Current priority

[IN_PROGRESS] Phase 02.2 browser QA, UX refinement, and Preview usability on `qa/ux-refinement-v0.1`. Production remains untouched.

## Active constraints

- No production authentication, payment, WhatsApp API, or deployment.
- No business records are seeded at runtime.
- Official logo, mascot, and mockup files are now committed; no replacement assets or mockup business data were generated.
- Prototype-only behavior is guarded by `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true` in development.
- The local adapter persists only in the browser that enabled prototype mode; it is not production persistence.
- The existing Vercel project `blessing-for-good` is configured for Next.js Preview deployments; Production remains untouched by this repair.

## Phase 02.1 visual alignment

[CONFIRMED] Brand assets were copied exactly and mapped. `Logo-4.png` is the runtime primary wordmark, `Logo-2.png` is the symbol/app-icon candidate, and Mascott-1/3/4 are used only for communication states.

[CONFIRMED] Centralized semantic color, typography, spacing, radius, border, shadow, focus, motion, and responsive tokens were added. A visual gap audit and QA report record the evidence and remaining gaps.

[CONFIRMED] Customer navigation, admin navigation, welcome/catalog/order surfaces, admin sidebar fallback, empty states, form controls, status badges, and tracking/invoice surfaces were refined without changing domain transitions.

[CONFIRMED] `npm run check` passes with 15 tests. `npx vercel@latest build` passes with the Preview target and all implemented routes statically generated.

[BROWSER VERIFIED] Playwright Chromium now verifies the protected Preview through an in-memory Vercel automation bypass. Public route smoke, responsive overflow, logo rendering, and browser error checks pass at all four required viewports.

[LIMITATION] The Preview currently fails closed for catalog, account, and admin prototype actions because the local adapter is development-only. A guarded Preview Demo Mode is required for full customer/admin flow QA; Production must remain disabled.

[CONFIRMED] Preview deployment `dpl_F1aiDK2SSsFL4NNV931uQqaXHmCj` is READY at `https://blessing-for-good-akpj94htk-masjaaks-projects.vercel.app`. All 12 implemented routes returned HTTP 200 through authenticated Vercel CLI HEAD requests, the five runtime logo/mascot assets returned HTTP 200 with `image/png`, and the Preview runtime error query returned no logs.

## Deployment diagnosis

[CONFIRMED] The failed deployment `dpl_sKtouPU4wmT1npv42vrPFLbwar2x` cloned `prototype/v0.1` at commit `cf1c5b7` and completed `next build` successfully.

[CONFIRMED] The first causal error was Vercel looking for an Output Directory named `dist` after the Next.js build completed. The existing project had Framework Preset `Other` and Output Directory `dist`.

[FIXED] The existing Vercel project now uses Framework Preset `Next.js` and Next.js automatic Output Directory detection. Local `vercel build` passes with the Preview target; no `vercel.json` override or application-code change was needed.

[CONFIRMED] Preview deployment `dpl_HwuopThbRTvjF2YrNZs3K8i3mRGr` is READY at `https://blessing-for-good-bxlsx6rog-masjaaks-projects.vercel.app`. All 12 implemented routes returned HTTP 200 through authenticated Vercel CLI requests, and the Preview runtime error query returned no logs.

[SUPERSEDED] The Phase 02.1 browser-tooling limitation is superseded by the Phase 02.2 Playwright setup; its historical note remains in the Phase 02.1 section.

## Status

`in_progress` — Phase 02.1 foundation is validated. Phase 02.2 browser smoke is green, while Preview Demo Mode and full customer/admin flow QA remain active. No merge to `main` has been performed.
