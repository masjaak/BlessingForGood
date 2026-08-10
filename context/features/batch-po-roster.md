# Batch PO and Roster Feature

Status: Phase 06.3 implemented locally; integrated runtime QA is deferred to
stable staging.

## Boundaries

```text
Order → order item → batch assignment → Batch PO roster
                         ↘ batch shipment tracking
Order → invoice/payment lifecycle
Order → customer fulfillment lifecycle
```

Orders remain customer purchase intent. Assignments remain operational
quantity records. Batch shipment and customer fulfillment use separate
timelines. Invoice and payment functions remain authoritative for finance.

## Batch state and locking

The existing `batches.currentShipmentStage` remains the only batch state
machine. An unset stage is an editable roster; `po_closed` and every later
shipment stage lock catalog links and assignment changes. `isArchived` keeps
historical batches readable and blocks operational mutations.

## Roster

`batchTracking.getForAdmin` derives the operational roster from canonical
orders, order items, assignments, and catalog references. It returns:

- assignment detail with customer, order, catalog, book, variant, ISBN, price
  snapshot, ordered quantity, and assigned quantity;
- customer-grouped roster;
- variant-grouped purchase summary using assigned quantity and customer price
  snapshots only;
- shipment history.

The unassigned queue derives submitted order items for catalogs linked to the
batch and reports remaining quantity. It is bounded to 200 orders/items for
v0.1; a dedicated roster index is the scale upgrade.

## Assignment operations

Active admins/owners can assign, unassign, or move submitted order items while
the roster is editable. Server validation requires a linked catalog, one
assignment row per item/batch, and total assigned quantity no greater than the
ordered quantity. Moves are atomic and cannot target an existing assignment.

## Manual customer operations

Admin-assisted orders are supported only for existing active customer
`appUsers`. They use `orders.source=admin_assisted`, derive customer identity
and price server-side, require a caller idempotency key, and enter the same
order → item → roster → tracking → invoice pipeline as self-service orders.

Creating a non-account customer or fake `appUser` is not implemented. The
`MANUAL_NON_ACCOUNT_CUSTOMER_POLICY` remains an open business decision.

## Privacy and authority

Full rosters are admin-only. Customer tracking remains rooted at the owned
order and exposes only that customer's assignments. Secret Catalog codes and
grants are not copied into roster or audit data.
