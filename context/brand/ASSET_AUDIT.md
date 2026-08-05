# Asset Audit

## Result

[CONFIRMED] The readable source asset folders were found at:

`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/public/`

Twenty-six physical files were copied to the canonical repository without README files, old Git metadata, or documentation. Source and destination bytes were compared with `cmp`; all 26 files match exactly. The complete checksum inventory is in `ASSET_MANIFEST.md`.

The mockups remain reference material. Their sample catalog, customer, order, invoice, and dashboard records are not product data and were not seeded into the prototype.

## Logo audit

| File | Evidence | Recommended role | Limitations |
| --- | --- | --- | --- |
| `Logo-1` | 4000×4000 RGBA PNG; full multicolor wordmark with book, sprout, and stars | Primary brand reference; candidate for future color-led campaigns | Extensionless filename is preserved from intake; not used as a runtime `next/image` source until a safe filename decision is approved |
| `Logo-2.png` | 4000×4000 RGBA PNG; peach symbol-only mark | Symbol, compact header, favicon/app-icon candidate | Symbol only; not a replacement for the full wordmark |
| `Logo-3.png` | 4000×4000 RGBA PNG; pale-blue monochrome full wordmark | Light-background alternate candidate | Lower contrast on pale surfaces; not selected as the default |
| `Logo-4.png` | 4000×4000 RGBA PNG; sage/green monochrome full wordmark | Confirmed default primary logo on warm light surfaces | Square transparent canvas needs contained sizing |

Runtime uses only the actual `Logo-4.png` full wordmark and `Logo-2.png` symbol. No color is applied through CSS and no logo variant is invented.

## Mascot audit

| File | Evidence | Recommended usage | Limitations |
| --- | --- | --- | --- |
| `Mascott-1.png` | 5000×5000 RGBA PNG; front-facing neutral/happy expression | Welcome, catalog access, empty states | Reuse intentionally; no pose variants are fabricated |
| `Mascott-2.png` | 5000×5000 RGBA PNG; visually close to Mascott-1 with distinct checksum | Candidate alternate neutral pose | No confirmed product role yet |
| `Mascott-3.png` | 5000×5000 RGBA PNG; joyful open-mouth expression | Success and selected completion states | Do not use for formal financial or audit surfaces |
| `Mascott-4.png` | 5000×5000 RGBA PNG; closed-eye/blushing expression with hearts | Community guide, how-to-order, help | Warm communication state; not for dense operational tables |

Mascot usage is limited to communication states: welcome, community guide, how-to-order, secret catalog access, empty state, success, and help. It is intentionally absent from invoices, deposit ledgers, audit logs, and dense admin tables.

## Missing or unresolved

- No separate approved light/dark wordmark pair was supplied.
- No confirmed Mascott-2 role was supplied.
- No official favicon-specific export was supplied; the symbol mark is the documented candidate.
