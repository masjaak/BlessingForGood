# Order fulfillment

Status: implemented on `feat/convex-operations-persistence-v0.1`.

Fulfillment is an order-level process after imported goods reach the store;
it is not the batch shipment status and does not replace preorder order status.

```text
Menunggu Pelunasan → Menunggu Alamat → Sedang Dikemas
→ Sudah Dikirim → Selesai
```

`orders.currentFulfillmentStage` is the current projection and
`orderFulfillmentHistory` stores the timeline. Admin-only mutations validate
forward transitions and write both records atomically. Customers may read the
history for owned orders only. There are no estimated delivery dates,
shipping-provider calls, payment settlement checks, or final cancellation and
refund policy in this phase.

## Phase 06.4 exception interaction

An unresolved exception blocks advancement to `Selesai`/`completed`. Resolved
affected quantities are excluded from remaining batch assignment and normal
fulfillment calculations; unrelated item quantities continue normally. The
forward-only fulfillment history is not rewound to represent a defect or OOS
case. The exception history is the operational record.
