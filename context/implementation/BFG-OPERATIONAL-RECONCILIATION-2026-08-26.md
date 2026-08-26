# BFG Operational Reconciliation — 2026-08-26

Status: SUPERSEDED BY FINAL YELLOW / UNKNOWN CLOSURE; authenticated Production
Customer UAT remains account-gated when no legitimate Production Customer
session is available.

## Final closure override — 2026-08-26

Commit `43f444c` adds automatic BFG-side Clerk invitation reconciliation,
trusted invitation acceptance, active Customer `/join` gating, and the proper
coverPresentation Playwright contract. Full Vitest is `60 files / 315 tests`
and full current Playwright is `284/284`. Vercel Production deployment
`dpl_459z5nNtK56GBrn8whG793oHP9VT` is `READY` at the canonical domain.

The previous cover failures were stale raw-image containment assertions; the
current test verifies the intentional transformed artwork inside an overflow-
hidden cover frame, preserving object-fit and document-overflow guarantees.

The previous Ready Stock Production failure remains correctly classified as an
Admin/Owner call to a Customer-only mutation. No legitimate authenticated
Production Customer session was available here, and no Production business
data was fabricated; the isolated active-Customer reservation/order/projection
journey is covered and green.

## Locked product boundaries

- `orders:createReadyStock` remains Customer-only: the server requires an
  active `appUsers` record with `role=customer`. Admin and Owner use the
  existing Admin-assisted order mutation, which targets an existing active
  Customer and shares the canonical order, invoice, activity, and inventory
  path.
- Ready Stock remains direct inventory-backed ordering. It does not enter a
  Batch. Reservation remains atomic and `available = onHand - reserved`.
- Secret Catalog remains private and catalog-scoped. The new Book Detail route
  renders only the authorized `getUnlocked` projection and reuses Book Master
  cover, gallery, description, preview, and eligible selling variants. Supplier
  cost and Admin-only fields are excluded.
- Catalog `closesAt` is presented as `Batas pemesanan`. Reopen is allowed only
  for a closed catalog whose linked Batches have no locked shipment stage.
- Batch remains the single PO/cargo state machine. Linking exposes derived
  eligible-order counts; Roster and Assignment remain the source for the
  derived Purchase Summary. `po_closed` requires at least one assignment.

## Safety reconciliation

- Batch stage failures are mapped to product-safe Indonesian messages; raw
  Convex function/error text is not rendered by the affected Admin surfaces.
- Destructive mutations fail closed at the server boundary. Draft/pristine
  Book, Variant, Catalog, and Batch records may be removed only when no
  business reference exists. Operational, financial, customer-history, and
  audit records use archive, deactivate, suspend, revoke, cancel, or void
  semantics.
- Irreversible catalog, Book, Variant, media, address, Batch, invoice, and
  refund actions use the shared BFG confirmation dialog. `window.confirm()` is
  not used.
- Shared Button and ActionGroup primitives remain the only interactive action
  family; text buttons keep nowrap/content-aware geometry and touch height.

## Deterministic coverage added

- Active Customer Ready Stock checkout and Admin-assisted checkout continue to
  prove the canonical reservation/order/projection path.
- Guarded Catalog reopen, locked-procurement denial, empty-roster PO lock
  denial, linked Catalog roster summary, authorized Secret Catalog media/detail
  projection, and unused-versus-referenced destructive actions are covered by
  Convex tests.
- Admin/Owner customer-facing checkout guards and catalog role guidance are
  covered by component tests.

No Production business data or fake identity was created for this work.

## Release evidence

- Commit `5904bbb0ffd1d31792a6f1d4f1f84eb328fcae85` is on `main` and
  `origin/main`.
- Full Vitest: 59 files, 306 tests passed. TypeScript, ESLint, format, Next
  production build, Convex Development check, `npm audit --omit=dev` (0
  vulnerabilities), and `git diff --check` passed.
- Convex Production deployed to `clean-eel-522`; Vercel Production deployment
  `dpl_BW8uYMyoKLWyPqXM7chQv2JwMtKK` is `READY` at
  `https://www.blessingforgood.com`.
- Public Playwright regression: 276/284 passed. The 8 failures are the known
  preserved `coverPresentation` geometry assertion at
  `tests/e2e/phase071-surface.spec.ts:130`; the new text-button geometry test
  passed 8/8 at 375, 390, 430, 768, 834, 1024, 1280, and 1440.
- Production HTTP smoke returned `200`. No authenticated Production Customer
  account or business record was fabricated.
