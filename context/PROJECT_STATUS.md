# Project Status

## Repository intake

[REPOSITORY] The canonical GitHub repository is readable at `prototype/v0.1`.

[BLOCKED] The remote repository does not contain the product context pack listed in `FILE_MANIFEST.md`, nor the expected `public/`, `src/`, `tests/`, or `convex/` implementation tree. The prototype therefore uses the current implementation brief as its highest available product input and does not claim missing documents are approved.

## Current priority

[REPOSITORY] Deliver the zero-data functional prototype on `prototype/v0.1`: public guidance, secret-catalog-to-order, tracking, and invoice/deposit foundation.

## Active constraints

- No production authentication, payment, WhatsApp API, or deployment.
- No business records are seeded at runtime.
- Missing logo, mascot, and mockup files are recorded; no replacement assets are generated.
- Prototype-only behavior is guarded by `NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true` in development.
- The local adapter persists only in the browser that enabled prototype mode; it is not production persistence.

## Status

`in-progress` — core prototype slices implemented; final handoff validation and repository commit remain.
