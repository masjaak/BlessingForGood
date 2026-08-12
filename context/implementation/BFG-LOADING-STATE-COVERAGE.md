# BFG Phase 06.6 — Loading State Coverage

This document records the operational loading contract added in Phase 06.6.
It preserves the V4.1 customer visual system and only adds state presentation.
Convex queries remain reactive; no polling, fake delay, or duplicate state is
introduced.

## State contract

- Initial query loading uses a shaped `LoadingRegion` and reusable skeletons.
- Refetching keeps useful content mounted. Convex invalidation does not replace
  an already useful screen with a page-wide loader.
- Empty, error, and success are separate states. A zero-result query never
  remains a skeleton.
- Mutations keep the current page visible, disable the relevant control, and
  replace its label while pending.
- Skeletons are non-focusable and `aria-hidden`; the containing region is
  `aria-busy`. Reduced-motion users receive a static skeleton.

## Coverage matrix

| Route / component | Data source | Initial loading | Refetching | Empty | Error | Mutation pending | Skeleton / reason | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Static homepage sections | N/A | N/A | N/A | Route boundary | N/A | N/A; no async business content | PASS |
| `/catalog` gateway | `catalogAccess.unlock`, persisted catalog session | Session-backed browse uses book skeletons; bare gateway stays actionable | Existing catalog stays visible | Empty private catalog has explicit BFG empty state | Unlock error is inline; route errors use retry boundary | Unlock and preorder buttons disable with progress labels | `SkeletonCard(book)` preserves cover/title/metadata rhythm | PASS |
| `/ready-stock` | `readyStock.list` | Filter shell plus book skeletons | Query controls retain the current result while arguments settle | Intentional zero-data / no-filter-match state | Route retry boundary | N/A (filters are query controls) | Control skeleton plus two book cards | PASS |
| `/ready-stock/[slug]` | `readyStock.getBySlug` | Book/detail skeletons | Current detail remains mounted when available | Unpublished or zero-stock book state | Route retry boundary | N/A | Book card plus detail panel skeleton | PASS |
| `/account` | Orders, invoices, deposit, transactions, exceptions | Account header plus three summary skeletons | Existing dashboard remains visible once populated | Existing V4.1 empty cards | Route retry boundary | N/A | Account-shaped cards preserve dashboard layout | PASS |
| `/account/orders` | `customerOrders` | Order-card skeletons | Existing cards remain visible | “Belum ada pesanan” | Route retry boundary | Edit order disables its button | `SkeletonCard(order)` mirrors status/item/meta blocks | PASS |
| `/account/orders/[orderId]` | Order, tracking, fulfillment, exceptions | Order/detail skeletons | Existing detail remains visible | Ownership-safe not-found state | Route retry boundary | Cancellation and other current mutations disable their controls | Order plus content cards | PASS |
| `/account/invoices` | `invoices.listMine` | Invoice-card skeletons | Current invoice list remains visible | “Belum ada invoice” | Route retry boundary | N/A | `SkeletonCard(invoice)` mirrors amount/status/date | PASS |
| `/account/invoices/[invoiceId]` | Invoice, payment, deposit, ledger projections | Invoice/detail skeletons; inline sub-query skeletons | Useful invoice remains mounted | Ownership-safe not-found state | Route retry boundary; payment error is inline | Payment confirmation disables its submit button | Invoice + detail + ledger shapes | PASS |
| `/account/profile` | `customerProfiles.getMine` | Profile skeleton | Existing profile remains visible | Safe profile empty state | Route retry boundary | Save button disables with progress label | Form-shaped card | PASS |
| `/account/addresses` | `customerAddresses.listMine` | Address/form skeletons | Existing addresses remain visible | “Belum ada alamat” | Route retry boundary; save/delete errors are inline | Add and delete controls disable independently | Form and content cards | PASS |
| `/join` | `joinRequests.submit` mutation | N/A (public form is immediately useful) | N/A | N/A | Inline safe error | Submit disables and reports progress | N/A; mutation is not page content loading | PASS |
| Customer access guard | Clerk + app-user provisioning | BFG shell-level account skeleton while provisioning | Current shell remains | Signed-out/suspended/config states are explicit | Safe configuration/error state | Auth provider owns its own pending UI | One account skeleton, no competing Clerk loader | PASS |
| Admin dashboard | Orders, catalogs, batches, invoices, payments, joins, exceptions | Summary skeletons | Existing summary stays visible | Existing zero-queue states | Route retry boundary | Destination forms own pending labels | Account-shaped summary cards | PASS |
| `/admin/books` | Book Master queries | Table skeleton | Existing table remains | Existing empty table state | Route retry boundary | Publisher/book create buttons disable | `SkeletonTable` preserves columns | PASS |
| `/admin/books/[bookId]` | Book + variants | Detail skeletons | Existing detail remains | Safe not-found state | Route retry boundary | Book/variant save controls disable | Detail/content cards | PASS |
| `/admin/catalogs` | Admin catalog query | Catalog-card skeletons | Existing cards remain | Existing empty state | Route retry boundary | Create code/form controls use pending state; catalog operations retain current feedback | Content cards | PASS |
| `/admin/join-requests` | Admin join queue | Queue skeletons | Existing queue remains | Existing empty queue | Route retry boundary | Review controls disable per request | Content cards | PASS |
| `/admin/orders` | Admin order query + eligible customers | Table skeleton; eligible-customer loading remains local | Existing table remains | Existing empty queue | Route retry boundary | Assisted-order form and status controls preserve current mutation feedback | `SkeletonTable` | PASS |
| `/admin/orders/[orderId]` | Order, tracking, fulfillment, batch, exceptions | Operational detail skeletons | Existing detail remains | Ownership-safe not-found state | Route retry boundary | Fulfillment and assignment controls disable per action | Order/content cards | PASS |
| `/admin/batches` | Batch list | Batch-card skeletons | Existing list remains | Existing empty state | Route retry boundary | Create form disables while creating | Content cards | PASS |
| `/admin/batches/[batchId]` | Batch, roster, unassigned queue | Batch operation skeletons | Existing detail remains | Safe not-found state | Route retry boundary | Shipment/roster controls retain current action feedback | Content cards | PASS |
| `/admin/invoices` | Invoice list + requirement form | Invoice-card skeletons | Existing list remains | Existing empty state | Route retry boundary | Invoice requirement form disables while saving | Invoice cards | PASS |
| `/admin/invoices/[invoiceId]` | Invoice, account, allocations, ledger | Invoice/detail skeletons | Current invoice remains visible | Safe not-found state | Route retry boundary | Invoice, deposit, allocation, and ledger actions use local pending feedback | Invoice/content cards | PASS |
| `/admin/payments` | Payment queue/history | Invoice-card skeletons | Existing queue remains | Existing empty queue | Route retry boundary | Review controls disable per confirmation | Invoice cards | PASS |
| `/admin/exceptions` | Exception queue + order projections | Queue skeletons | Existing queue remains | Existing empty queue | Route retry boundary | Open/review/resolve/reject controls disable per exception | Content cards | PASS |
| `/admin/users`, `/admin/customers` | User/customer queries | Cards/table skeletons | Existing results remain | Existing empty state | Route retry boundary | Role/suspension actions disable per user | Cards/table | PASS |

## Rejected loading patterns

- No artificial `setTimeout`, `sleep`, or delayed request was added.
- No skeleton is used for a mutation that can keep the current screen useful.
- No production fixture or dummy business record was added to make a loading
  state visible.

