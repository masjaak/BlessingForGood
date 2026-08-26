# BFG Data Model

## Identity graph

```text
Clerk subject
    ↓ verified by Convex JWT
appUsers._id
    ↓ referenced by business records
catalogAccessGrants / orders / invoices / payments / deposits / profiles / addresses
```

The pre-account admission path is separate from identity ownership:

```text
public visitor
    ↓ validated anonymous submission
joinRequests
    ↓ approved + server-side Clerk invitation reconciliation
Clerk invitation → appUsers
```

`joinRequests` has no `appUserId`. It preserves the admission/review record and
does not establish account ownership, role, or Secret Catalog access.

Email, display name, and image are safe snapshots only. They do not establish
identity or ownership. One `appUsers` document exists per Clerk subject.

## Customer ownership

- `catalogAccessGrants.appUserId` binds a secret catalog grant to one user.
- `orders.customerUserId` is derived on the server during submit.
- Tracking, invoices, deposit accounts, deposit history, and allocations
  resolve through the order/invoice/account customer relationship.
- `customerProfiles.userId` and `customerAddresses.userId` are derived from
  the current authenticated app user for customer CRUD.
- `paymentConfirmations.customerUserId` is derived from the owned invoice;
  external payment attempts never use a client-supplied customer ID.

Customer reads use indexed server queries; React does not fetch all rows and
filter ownership locally.

Activity is one presentation over Notification and Inbox records. Each notice
has an optional `audience` projection (`admin` or `customer`); older rows infer
the audience from their safe destination. Customer Activity queries enforce
that projection server-side even when an elevated Admin is viewing the
customer shell.

## Operational actors

Creation and change fields reference `appUsers`:
`createdByUserId`, `changedByUserId`, and `assignedByUserId`. Audit rows use
`actorUserId`. These are actor relationships, not client-supplied ownership
claims.

## Batch PO and roster graph

```text
appUser customer → order → orderItem → orderItemBatchAssignment → batch
                                      ↘ catalogItem / bookVariant snapshots
batch → catalogBatchLink → secretCatalog
batch → batchStatusHistory → shipment stage
order → orderFulfillmentHistory
order → invoice → payment/deposit records
```

`Batch PO` is the purchasing/operational unit. The roster is derived from
canonical order items and assignment rows; it does not duplicate customer,
book, or order ownership data. Customer-facing tracking starts at the owned
order, while admin roster queries may cross customers.

Admin-assisted orders use the same `orders` and `orderItems` tables as
self-service orders and carry the optional `orders.source` value
`admin_assisted`. They require an existing active customer `appUsers` record;
non-account manual customers are not represented in this model.

## Existing business model retained

Publishers own books; books own variants; catalogs expose catalog items.
Orders copy product and price snapshots. Batches and fulfillment histories
remain separate. Invoices are immutable snapshots with draft/issued/void
lifecycle plus a separate payment projection. `paymentConfirmations` preserves
submitted, under-review, approved, and rejected manual attempts. Deposit
accounts are balance projections over an append-only ledger, and allocations
are reservation-backed.

## Book Master and Ready Stock

```text
publisher → book → bookVariant → readyStockInventory
                    ↘ catalogItem → secretCatalog
```

Book Master metadata is shared. Variants own format, unique ISBN, and integer
IDR price. `readyStockInventory` owns current public availability quantity per
variant; Secret Catalog items continue to own private curation/access context.
Books are not duplicated per catalog.

Ready Stock order ownership is still account-bound. A signed-in active BFG
customer creates a canonical order with `source = ready_stock`; its item keeps
the variant and price snapshot but has no Secret Catalog item. A
`readyStockReservations` row links that item to inventory. Its active quantity
is included in `reservedQuantity`, so `available = onHand - reserved`.
Ready Stock orders use the existing invoice, payment, deposit, fulfillment, and
exception records and never join the supplier Batch PO graph.

## Refund graph

```text
order/invoice/exception/deposit account
  → refundObligation
    → refundPayout(s)
```

Refund obligations record what BFG owes; payouts record attempted or completed
disbursement. Deposit refunds reserve only unallocated available balance and
settle it through append-only ledger consequences. Payment and invoice history
remain unchanged.
