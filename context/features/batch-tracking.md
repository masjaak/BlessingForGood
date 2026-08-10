# Batch tracking

Status: Phase 06.3 roster operations implemented locally on
`feat/batch-roster-operations-v0.1`.

[REPOSITORY] Admins create batches, link catalogs, assign order-item
quantities, and advance the shipment timeline. The catalog link controls
eligibility; the assignment records actual fulfillment quantity and may split
one order item across batches.

Shipment stages are deliberately separate from order fulfillment:

```text
PO Ditutup → Dipesan ke Supplier → Dikirim dari Luar Negeri
→ Pemeriksaan Bea Cukai → Menuju Gudang Indonesia → Sampai di Toko
```

The current shipment stage is a batch projection. `batchStatusHistory` is the
customer-visible append-only timeline. The first stage is required, valid
forward moves are enforced server-side, and an explicit admin confirmation is
required to skip forward. Backward correction is deferred.

Customer queries start from an owned order and expose only the batches and
assignments reachable from that order. Admin queries expose operational batch
details. Archived batches remain readable for historical records but cannot
receive new operational changes.

Phase 06.3 adds the admin customer roster, purchase summary, bounded
unassigned queue, and quantity-safe assign/unassign/move controls. Assignment
changes are allowed only while the batch is editable. `po_closed` and later
shipment stages lock the roster; backward correction after lock remains
deferred.

The roster is a server-derived projection, not a second customer/order model.
Admin operations can create an assisted order only for an existing active
customer `appUsers` record. It is marked `admin_assisted` and follows the same
order, invoice, payment, and fulfillment pipeline as a self-service order.

The v0.1 unassigned queue is bounded to 200 submitted orders/items. Add a
dedicated index/projection when real BFG volume reaches that ceiling.

Financial, shipping-provider, customs-provider, estimated-date, and automatic
shipping calculations are out of scope.
