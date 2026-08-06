# Batch tracking

Status: implemented on `feat/convex-operations-persistence-v0.1`.

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

The first UI supports the schema’s multi-batch assignment capability through
repeated assignment rows; assignment edits/reassignment history beyond the
current quantity-safe write is deferred.

Financial, shipping-provider, customs-provider, estimated-date, and automatic
shipping calculations are out of scope.
