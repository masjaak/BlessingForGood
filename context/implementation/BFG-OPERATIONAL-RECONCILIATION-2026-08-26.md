# BFG Operational Reconciliation — 2026-08-26

Status: IMPLEMENTED LOCALLY; release gates and deployment remain evidence
gates for this change.

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
