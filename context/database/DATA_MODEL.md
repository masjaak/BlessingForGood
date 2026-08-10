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
    ↓ approved + manual Clerk handoff
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

## Operational actors

Creation and change fields reference `appUsers`:
`createdByUserId`, `changedByUserId`, and `assignedByUserId`. Audit rows use
`actorUserId`. These are actor relationships, not client-supplied ownership
claims.

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
