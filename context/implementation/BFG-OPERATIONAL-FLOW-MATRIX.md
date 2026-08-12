# BFG Phase 06.6 — Operational Flow Matrix

The operational source of truth is the existing Convex deployment and its
customer-safe/admin-authorized projections. Customer and Admin do not copy
records between stores. Convex reactive queries deliver consequences from the
same canonical records; no polling or sync bridge is used.

## Lifecycle matrix

| Flow | Customer trigger | Canonical records | Admin consequence | Admin action | Customer consequence | Authorization | Current status | Blocker / classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Join → Admission | Public Join form | `joinRequests` | Request enters review queue | Start review, approve, or reject | Safe submitted status and configured WhatsApp continuation | Public submit; admin/owner review | PASS through approval handoff | Clerk invitation acceptance remains a manual operational handoff; `ENVIRONMENT_CONFIG_GAP` for automated acceptance proof |
| Book → Catalog | Admin publishes a real title/variant and adds it to a catalog | `publishers`, `books`, `bookVariants`, `secretCatalogs`, catalog links | Catalog projection includes the selected published variants | Book Master/catalog management | Authorized customer sees real cover, title, format, price, and availability | Public safe projection; admin/owner management | PASS | None in current tested contract |
| Secret Catalog access | Customer submits an access code | `catalogAccessGrants`, `catalogAccessSessions` | Generated/revoked code state controls access | Generate, revoke, close, or expire code/session | Valid scoped session opens private catalog; invalid/expired/revoked states stay closed | Token validation server-side; catalog session scoped | PASS | Security is frozen; no frontend bypass |
| Catalog → Order | Customer selects variant/quantity and submits preorder | `orders`, `orderItems` | Canonical customer order appears in admin queue | Review order and operate it | Owned order, status history, and source are visible | Customer owns created order; admin/owner sees operational queue | PASS | None |
| Ready Stock policy | Customer opens a published positive-stock title | `readyStockInventory`, book/variant records | Admin remains the contact/confirmation endpoint | Confirm directly with customer under current policy | UI explains “Pesan melalui BFG”; no fake checkout/order | Public safe projection | BLOCKED_BY_POLICY | `READY_STOCK_ORDER_RECORDING` / `BUSINESS_POLICY_BLOCKER` |
| Order → Admin | Customer order mutation succeeds | `orders`, `orderItems` | Admin queue and detail read the same record | Review status/source/items/customer snapshot | Customer retains ownership-safe status view | Customer ownership; admin/owner operations | PASS | None |
| Assisted order | Admin selects an existing active customer and real catalog variant | `orders`, `orderItems` with `admin_assisted` source | Order enters the same canonical queue | Create assisted order | Customer projection includes only the owned result | Admin/owner plus active customer validation | PASS | No manual fake customer identity |
| Order → Batch | Admin assigns an order item quantity to a compatible batch | `batchOrderItems`, `batches`, roster projections | Batch roster and purchase summary update | Assign/unassign/move, close PO, lock roster | Customer sees batch-derived status/tracking context | Admin/owner; locked batch guards | PASS | Post-PO cancellation eligibility remains policy-controlled |
| Batch → Tracking | Admin advances shipment stage | `batchShipmentEvents`, batch/order tracking projections | Batch history and order assignment stage update | Advance/correct shipment stage | Customer tracking reacts to the canonical stage mapping | Admin/owner; customer-safe tracking query | PASS | None in current stage machine |
| Order → Invoice | Admin issues invoice from an order/customer snapshot | `invoices`, `invoiceItems` | Invoice appears in admin financial queue | Create/issue/void according to invoice state | Customer Tagihan shows reference, snapshot totals, deposit, and outstanding | Admin/owner issue; customer-owned read | PASS | Financial formulas remain backend-authoritative |
| Invoice → Payment | Customer submits payment confirmation | `paymentConfirmations` | Confirmation appears in admin review queue | Start review, approve, or reject | Payment status and outstanding projection update reactively | Customer owns submit; admin/owner reviews | PASS | No payment gateway or automatic settlement added |
| Deposit → Invoice | Admin records credit or allocates an existing deposit | Append-only `depositTransactions`, `invoiceDepositAllocations`, invoice projections | Ledger/account and invoice reservation update | Append credit, allocate, release, reverse | Customer sees deposit and invoice effects from projections | Admin/owner mutation; customer-owned read | PASS | No editable balance shortcut |
| Order → Fulfillment | Fulfillment prerequisites are satisfied and admin advances stage | `orderFulfillmentEvents` | Fulfillment timeline updates | Advance fulfillment stage | Customer sees what is next, including address/payment/shipping context | Admin/owner; customer-safe projection | PASS | None |
| Order → Exception | Customer/admin opens OOS, defect, or cancellation issue | `orderExceptions`, financial adjustments, refund obligations | Queue item enters lifecycle | Review, select resolution, resolve, or reject | Customer sees issue, affected item/quantity, resolution, and financial consequence | Customer-owned order or admin/owner operation | PASS | Refund disbursement/replacement remain policy boundaries, not automatic cash actions |

## Authorization and isolation gates

- Customer queries scope orders, invoices, deposits, exceptions, addresses,
  and history to the authenticated app user.
- Admin queries and mutations require the existing admin/owner authorization
  path; UI hiding is not used as security.
- Suspended users are rejected by the existing server-side guards.
- Customer A/B isolation, admin authorization, and financial state transitions
  remain covered by the existing Convex suite. Phase 06.6 adds customer-side
  invoice/payment and exception/refund projection assertions.

## Deliberately unresolved policies

The following are recorded rather than invented: Ready Stock order recording,
cancellation eligibility/post-PO cancellation, refund disbursement, deposit
refund policy, defect replacement, manual non-account customers, and join
request retention. None is implemented through dummy records or a new state
machine in this phase.

