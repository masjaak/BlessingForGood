# BFG Convex Schema

[REPOSITORY] `convex/schema.ts` is the schema source of truth. All timestamps
are epoch milliseconds; money is safe integer IDR; relationships use Convex
document IDs.

## Identity and security tables

| Table | Purpose | Required identity fields |
| --- | --- | --- |
| `appUsers` | one BFG authorization record per Clerk subject | `clerkUserId`, `role`, `status`, safe snapshots, lifecycle timestamps |
| `customerProfiles` | customer-owned profile | `userId`, display name, optional phone/WhatsApp, timestamps |
| `customerAddresses` | customer-owned fulfillment addresses | `userId`, recipient/contact/address fields, default flag, timestamps |
| `auditEvents` | privileged actor history | actor, action, target, timestamp, safe metadata |
| `prototypeSessions` | retained legacy test/local table | token digest and expiry only; active Preview never reads/writes |

`appUsers` roles are `owner`, `admin`, `customer`; statuses are `active` and
`suspended`. Its indexes are `by_clerk_user_id`, `by_role`, `by_status`,
`by_role_and_status`, and `by_created_at`.

## Catalog and order tables

```text
publishers
books
bookVariants
secretCatalogs
catalogAccessCodes
catalogItems
catalogAccessGrants
orders
orderItems
orderStatusHistory
```

`books` additionally owns optional author, bounded categories, optional cover
reference, globally unique slug, and publication state
(`draft`, `published`, `special`, `archived`). `readyStockInventory` is a
separate table keyed by `bookVariantId` with non-negative quantity and audited
updater/timestamps.

`orders.source` is optional for legacy documents and records the minimal
channel distinction `customer_self_service` or `admin_assisted`. Assisted
orders still use the canonical order and order-item records and require an
existing active customer `appUsers` row.

Catalog grants use `appUserId` and catalog ID. Orders use `customerUserId`;
order items retain immutable product and price snapshots. Access codes remain
keyed digests and are never stored as plaintext.

## Operations and finance tables

```text
batches
catalogBatchLinks
orderItemBatchAssignments
batchStatusHistory
orderFulfillmentHistory
invoices
invoiceItems
paymentConfirmations
depositAccounts
depositTransactions
invoiceDepositAllocations
```

Operational actors use `createdByUserId`, `changedByUserId`, or
`assignedByUserId`. Invoices use `customerUserId` and `createdByUserId`.
Deposits use `userId` for the customer account and `createdByUserId` for the
ledger actor.

Batch roster data is derived from `orderItemBatchAssignments` and parent
orders/items. The batch shipment stage remains separate from order fulfillment
and financial state.

Invoices also keep `verifiedPaymentAmount` and `paymentStatus` separate from
the invoice lifecycle. `paymentConfirmations` stores manual payment attempts,
review state, safe metadata references, and reviewer audit fields. It never
stores binary proof content.

## Migration boundary

[CONVEX VERIFIED] Development preflight found zero records in the affected
business tables, so no unknown record was assigned, deleted, or rewritten.
Current active code has no session ownership fields. A future non-empty
Preview preflight must classify data before any migration.
