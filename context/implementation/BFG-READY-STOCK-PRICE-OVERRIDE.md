# BFG — Ready Stock Price Override Verification

Date: 2026-09-30. Status: **Preview verified; Production pending**.
Branch: `fix/ready-stock-price-override`.
Baseline: `origin/main` at `3f2a4913a69919e4985f1976bcf5aac9241f14ca`.
Original checkout contained unrelated work; implementation uses an isolated worktree.
Mandatory rules loaded from `/Users/masjak/Downloads/kumpulan skills/agent_rule.txt`.

## Closure evidence

Implementation reference remains `6eaefe5954f60c945a5b7db422c0ccd9b5645ba4`.
No feature source, existing assertion, dependency or protected system changed
during closure. The five frontend failures listed below are **accepted inherited
baseline failures**, as instructed by the client. New branch-specific failures: 0.

- Remote branch verified at the implementation SHA.
- [PR #22](https://github.com/masjaak/BlessingForGood/pull/22):
  `Add independent Ready Stock price override` → `main`.
- [Vercel Preview](https://blessing-for-good-ecsiwrxpj-masjaaks-projects.vercel.app):
  READY / Vercel check SUCCESS for implementation SHA; deployment
  `dpl_8FatCoq9tS7QZHfJxQFweF3mn6QG`.
- Build credential gate confirms Clerk Development and canonical Convex
  Development `content-snake-214`. Preview's wrapper disables automatic backend
  deploy; the frozen backend was deployed to verified `palevvi/blessingforgood`
  Development before smoke. Production `clean-eel-522` was not mutated.
- Existing active Development Owner and Customer establish real Clerk sessions.
  Protected operations use their real Clerk-issued Convex JWTs. Vercel CLI's
  supported automation cookie provides deployment access; BFG authorization
  remains active. Customer/anonymous price edits are rejected at runtime.
- Dedicated Development fixture starts at Master 175000 and quantity 3. Admin
  editor sets 195000; listing, detail and rendered Product Offer match. Customer
  quantity 2 stores unit 195000/subtotal 390000; issued Invoice stores 390000.
  Changing to 210000 preserves that Order/Invoice and a new Customer Order
  snapshots 210000. Existing release restores availability, reset falls back to
  175000, assisted Order snapshots 195000, and Catalog override remains 180000.
- Last-unit checkout removes the zero-stock public detail, as before this change.
  The harness verifies its successfully created Order from server records rather
  than relying on a transient message in an unmounted detail component.
- Real Preview screenshots: Admin 1440/1024/768/390; Public and Detail
  1440/768/390. Editor, success and invalid-input state were captured. Desktop
  and mobile amounts/actions are readable; horizontal scrolling stays inside
  the Admin table. Mobile viewport captures scroll prices into view and use the
  existing Blessy dismiss control. No product CSS or Blessy code changed.
- Closure rerun: Ready Stock components 17/17; commerce regressions 41/41.
  Original full backend 319/319, typecheck/lint/build PASS remain valid for the
  unchanged feature source. Browser page errors: 0.

Representative authenticated Preview artifacts:

- [Admin mobile editor / Master and Ready prices](evidence/ready-stock-price-override/admin-390.png)
- [Public mobile effective price](evidence/ready-stock-price-override/public-390.png)
- [Detail mobile effective price and Customer checkout](evidence/ready-stock-price-override/detail-390.png)

All 16 Preview captures and transactional record evidence remain under ignored
`artifacts/browser-qa/ready-stock-price/preview-visual/` and `preview-smoke.json`.
The earlier local verification and screenshot timeout below are implementation
history, superseded by this authenticated Preview evidence.

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

PR #22 is open and Preview/visual/authenticated transaction gates pass.
Inherited baseline frontend failures are accepted and stay outside this PR.
Merge and Production deployment/smoke remain pending. Previous Production target:
`blessing-for-good-crzi1s9sw-masjaaks-projects.vercel.app`; previous main SHA is
the baseline above. No Production test business records were created.
