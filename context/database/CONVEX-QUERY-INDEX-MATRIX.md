# Phase 03.1 Convex query/index matrix

| Query               | Table               | Filter              | Index                       | Pagination/bound |
| ------------------- | ------------------- | ------------------- | --------------------------- | ---------------- |
| active publishers   | publishers          | `isActive`          | `by_active`                 | paginated        |
| active books        | books               | `isActive`          | `by_active`                 | paginated        |
| variants for book   | bookVariants        | `bookId`            | `by_book`                   | bounded list     |
| admin catalogs      | secretCatalogs      | creation order      | `by_created_at`             | paginated        |
| catalog items       | catalogItems        | `catalogId`         | `by_catalog`                | max 200          |
| access code lookup  | catalogAccessCodes  | keyed lookup digest | `by_lookup_digest`          | one active match |
| customer grant      | catalogAccessGrants | session + catalog   | `by_session_and_catalog`    | one              |
| test cleanup grants | catalogAccessGrants | catalog             | `by_catalog`                | max 500          |
| customer orders     | orders              | session + creation  | `by_session_and_created_at` | paginated        |
| admin orders        | orders              | creation order      | `by_created_at`             | paginated        |
| order items         | orderItems          | `orderId`           | `by_order`                  | max 200          |
| order history       | orderStatusHistory  | order + time        | `by_order_and_changed_at`   | max 100          |
| admin batches       | batches              | archived + creation | `by_archived`, `by_created_at` | paginated      |
| batch catalogs      | catalogBatchLinks    | batch or catalog    | `by_batch`, `by_catalog`       | max 200        |
| order assignments   | orderItemBatchAssignments | order item/batch | `by_order_item`, `by_batch` | max 200       |
| shipment history    | batchStatusHistory   | batch + time       | `by_batch_and_changed_at`     | max 100        |
| fulfillment history | orderFulfillmentHistory | order + time    | `by_order_and_changed_at`     | max 100        |
| customer invoices   | invoices             | customer + creation | `by_customer_and_created_at` | paginated     |
| admin invoices      | invoices             | creation order     | `by_created_at`                | paginated      |
| invoice items       | invoiceItems         | invoice            | `by_invoice`                   | max 200        |
| customer deposit account | depositAccounts  | customer + currency | `by_customer_and_currency`  | one            |
| deposit ledger      | depositTransactions  | account + time     | `by_account_and_created_at`   | paginated      |
| invoice allocations | invoiceDepositAllocations | invoice + status | `by_invoice_and_status` | max 200       |

The bounded ceilings are the current prototype ceiling. Pagination is the
upgrade path for catalog items and nested order history when those surfaces
become independently managed.
