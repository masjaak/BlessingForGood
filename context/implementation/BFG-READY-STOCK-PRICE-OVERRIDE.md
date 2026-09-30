# BFG — Ready Stock Price Override Verification

Date: 2026-09-30. Status: **BLOCKED**. Branch: `fix/ready-stock-price-override`.
Baseline: `origin/main` at `3f2a4913a69919e4985f1976bcf5aac9241f14ca`.
Original checkout contained unrelated work; implementation uses an isolated worktree.
Mandatory rules loaded from `/Users/masjak/Downloads/kumpulan skills/agent_rule.txt`.

## Root cause and ownership

Public Ready Stock projections and the shared Ready Stock order resolver read
`bookVariants.priceAmount` directly. Admin had no Ready Stock price mutation.
Updating presentation alone would have left checkout and snapshots at Master price.

- Master: `bookVariants.priceAmount`.
- Ready Stock override: `readyStockInventory.priceOverrideAmount`.
- Resolver: `inventory.priceOverrideAmount ?? variant.priceAmount`.
- Order: resolved `unitPriceAmount` becomes `unitPriceAmountSnapshot` and subtotal.
- Invoice: existing `orderItems` snapshot copied to `invoiceItems`; no finance change.
- Secret Catalog: existing `catalogItems.priceOverrideAmount` remains independent.

State transitions are fallback → set, override → replace, override → clear.
Repeated values are no-ops. Permission denial, invalid money and missing references
reject atomically. Actual transitions patch only override/update metadata and audit.
Optional schema addition requires no migration.

## Repeatable checks

```sh
npm run typecheck
npm run lint
./node_modules/.bin/vitest run --project convex --maxWorkers 1 --testTimeout 180000
./node_modules/.bin/vitest run --project frontend --maxWorkers 1
./node_modules/.bin/vitest run --project frontend \
  tests/components/admin-ready-stock.test.tsx \
  tests/components/ready-stock-catalog.test.tsx \
  tests/components/ready-stock-detail.test.tsx
./node_modules/.bin/vitest run --project frontend \
  tests/components/admin-assisted-order.test.tsx -t 'shows the effective Ready Stock price'
npm run build
git diff --check
```

TDD red tests first demonstrated missing Admin projections/mutation and editor;
the implementation then made them green without deleting or weakening old coverage.

| Gate | Result |
| --- | --- |
| Typecheck | PASS |
| Lint | PASS; one existing warning in unchanged Admin Random PO page |
| Full backend | PASS: 48 files, 319 tests; timeout increased for existing Batch backfill |
| New override backend | PASS: 6 tests |
| Admin component | PASS: 5 tests |
| Public Catalog component | PASS: 1 test |
| Detail/auth component | PASS: 11 tests |
| New assisted price component | PASS: 1 test |
| Full frontend | FAIL: 505 pass, 5 fail across 3 files |
| Production build | PASS |
| Diff check and manual scope review | PASS |

The five frontend failures were also reproduced on unchanged baseline:

1. `admin-assisted-order.test.tsx`: existing Catalog discovery cannot find the expected Carry Me option.
2. Same file: existing skipped-query mock yields an undefined pagination page (`.map` error).
3. `admin-shell-loading.test.tsx`: bootstrap sidebar skeleton assertion fails.
4. `ui.test.tsx`: obsolete homepage WhatsApp CTA expectation.
5. Same file: removed `.home-journey` expectation.

These protected systems and existing assertions were left unchanged. The one-line
assisted-form consumer update is required by the explicit effective-price projection.

Full backend covers Ready Stock inventory/reservation release and fulfillment,
Customer and assisted checkout, Order projections, Invoice, Payment, Deposit,
Secret Catalog, Random PO, Batch and auth. The new tests additionally prove money
validation, Customer/anonymous denial, no arbitrary browser price, safe audit,
independent Master/Catalog prices, reset and immutable Order/Invoice history.

## Browser evidence and limits

Ego TaskSpace 4 uses isolated Convex-test data and real production components/CSS.
Only query/mutation transport, shell navigation and auth context are local harness
adapters. This proves rendered price and backend transaction behavior; it does not
prove Production Clerk/session or deployed Convex behavior.

The local harness is retained under ignored
`artifacts/browser-qa/ready-stock-price/`. `server.mjs`, `fixture.js`, `qa-admin.mjs`
and `qa-public.mjs` make the flow repeatable with the installed Vite and Ego tools.
`admin-geometry.json` and `transaction-evidence.json` store browser/database evidence.

| Browser check | Result |
| --- | --- |
| Admin save/reset, Master 175000 stays unchanged | PASS |
| Admin widths 1440, 1024, 768, 390 | PASS: DOM geometry, usable editor, internal table scroll |
| Catalog/detail widths 1440, 768, 390 | PASS: DOM geometry, no page overflow/cards outside viewport |
| Catalog effective price, search and price sorting | PASS |
| Detail price and Product JSON-LD | PASS: both 195000 |
| Customer quantity 2 checkout | PASS: unit 195000, subtotal/total 390000, reserved 2 |
| Invoice issued from that Order | PASS: total 390000 |
| Change price to 210000 and assisted Order | PASS: new snapshot 210000; original Invoice remains 390000 |
| Clear price | PASS: previous unit snapshots remain 195000 and 210000; stock/reservations unchanged |
| Existing cancellation release, public fallback | PASS: quantity 3, reserved 1, available 2, public 175000 |
| Master/Catalog independence | PASS: 175000 / 180000 throughout |
| Screenshot visual inspection | BLOCKED: CDP `Page.captureScreenshot` times out, including outside sandbox |
| Real Production authenticated transaction | BLOCKED: browser still shows sign-in; no authorized variant identified |

The harness creates no Production records. Visual screenshot QA and full real
authenticated runtime remain open gates. No screenshot-based PASS is claimed.

Local logs are retained at `/private/tmp/bfg-ready-stock-{convex-final,frontend-final,
components,final-backend,focused,build,lint-final}.log` and baseline comparison at
`/private/tmp/bfg-price-baseline-tests.log`.

## Release

PR: not created. Preview: not run. Merge: not performed. Production: not deployed.
The requested green gates are not satisfied, so release is deliberately blocked.
Resolve baseline frontend failures in their owning scope, restore browser capture,
then verify authenticated preview/Production with an authorized account and variant.
