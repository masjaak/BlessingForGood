# Project Status

## Repository intake

[REPOSITORY] The canonical GitHub repository is readable at `prototype/v0.1`.

[BLOCKED] The remote repository does not contain the product context pack listed in `FILE_MANIFEST.md`, nor the expected `public/`, `src/`, `tests/`, or `convex/` implementation tree. The prototype therefore uses the current implementation brief as its highest available product input and does not claim missing documents are approved.

## Current priority

[REPOSITORY] Preview deployment verification for the zero-data functional prototype on `prototype/v0.1`. No next milestone has started.

## Active constraints

- No production authentication, payment, WhatsApp API, or deployment.
- No business records are seeded at runtime.
- Missing logo, mascot, and mockup files are recorded; no replacement assets are generated.
- Prototype-only behavior is guarded by `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true` in development.
- The local adapter persists only in the browser that enabled prototype mode; it is not production persistence.
- The existing Vercel project `blessing-for-good` is configured for Next.js Preview deployments; Production remains untouched by this repair.

## Deployment diagnosis

[CONFIRMED] The failed deployment `dpl_sKtouPU4wmT1npv42vrPFLbwar2x` cloned `prototype/v0.1` at commit `cf1c5b7` and completed `next build` successfully.

[CONFIRMED] The first causal error was Vercel looking for an Output Directory named `dist` after the Next.js build completed. The existing project had Framework Preset `Other` and Output Directory `dist`.

[FIXED] The existing Vercel project now uses Framework Preset `Next.js` and Next.js automatic Output Directory detection. Local `vercel build` passes with the Preview target; no `vercel.json` override or application-code change was needed.

[PENDING] A new Preview deployment and deployed-route verification must be completed from the pushed fix.

## Status

`validated` — Prototype v0.1 passes the local and Vercel build gates; the deployment repair is ready for a Preview deployment. No merge to `main` was performed.
