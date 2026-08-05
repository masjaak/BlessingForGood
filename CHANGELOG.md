---
title: Project Changelog
status: approved
owner: MasJak
last_updated: 2026-08-04
source: conversation
---

# Changelog

## [phase-02.1] — 2026-08-05

### Added

- Copied and checksum-mapped four logo candidates, four mascot candidates, eight mobile mockups, and ten admin mockups into the canonical repository.
- Added the BFG asset registry, asset manifest, mockup manifest, visual gap audit, and visual QA report.

### Changed

- Established warm ivory, forest green, sage, peach, gold, and pale-blue visual tokens with editorial heading and compact UI typography fallbacks.
- Integrated reusable `BrandLogo` and `BrandMascot` components, favicon metadata, customer navigation, admin navigation, responsive sidebar fallback, empty states, and anchor screen hierarchy.
- Preserved zero-data startup and existing catalog, order, tracking, invoice, and deposit logic.

### Validated

- `npm run check`: 15 tests passed, lint/typecheck/build green.
- `npx vercel@latest build`: Preview-target Build Output passed.
- Preview `dpl_F1aiDK2SSsFL4NNV931uQqaXHmCj` is READY; 12 routes and five runtime brand assets returned HTTP 200, with no Preview runtime error logs.

### Deferred

- Browser screenshot, hydration, and console checks remain blocked because browser automation is not installed and local server binding is denied by the sandbox.
- Approved book-cover data and unimplemented admin destinations remain out of scope; no mockup sample records were seeded.

## [prototype-v0.1] — 2026-08-05

### Added

- Reconstructed the missing local application tree from the approved implementation brief on branch `prototype/v0.1`.
- Added zero-data catalog unlock, format selection, preorder, status timeline, invoice, and append-only deposit prototype flows.
- Added public community, how-to-order, help, ready-stock empty, customer account, and desktop admin foundations.
- Added prototype assumptions, asset audit, route matrix, open questions, and known limitations.

### Fixed

- Corrected the existing Vercel project from the `Other` preset with `dist` output to the Next.js preset with automatic output detection. The remote build had already completed `next build`; only Vercel's post-build output lookup failed.
- Added `.vercel/` to Git ignore rules so local Vercel metadata and environment files cannot be committed.
- Verified Preview deployment `dpl_HwuopThbRTvjF2YrNZs3K8i3mRGr` and all implemented route responses; Production and `main` were not changed.

### Deferred

- Official brand assets and mockups are absent from the canonical GitHub snapshot; no replacement assets were generated.
- Clerk production authentication, Convex persistence/schema, payment processing, WhatsApp API, and deployment remain deferred.

## [phase-01] — 2026-08-04

### Added

- Local Git baseline and canonical repository guardrails.
- Minimal Next.js App Router foundation with strict TypeScript, ESLint, and Prettier.
- Vitest/React Testing Library foundation, environment validation, test-only fixture guards, and zero-data startup state.
- Fail-closed Clerk/Convex provider boundary using official dependencies without live service connections.

### Changed

- Synchronized source-of-truth precedence with the approved Phase 01 hierarchy.
- Recorded asset, mockup availability, duplicate prompt, and mockup naming status.
- Updated repository status, implementation phase status, and file manifest.

### Deferred

- Phase 02 visual implementation, final styling, production auth wiring, Convex schema, business features, and deployment.

## [1.0.0-docs] — 2026-08-04

### Added

- Product, brand, community, catalog, data, database, security, integration, and operation documentation.
- Feature and screen specifications.
- Zero-data trial policy.
- Convex, Clerk, Cloudflare, and R2 architecture direction.
- Codex phase prompts and implementation gates.

### Known gaps

- Final logo assets are pending.
- Mascot files and official character information are pending.
- Final community copy and order rules require client approval.
- Cancellation, refund, and deposit adjustment policies require confirmation.
- Exact secret-catalog-to-batch relationship requires confirmation.
- Several new screens do not yet have final mockups.
