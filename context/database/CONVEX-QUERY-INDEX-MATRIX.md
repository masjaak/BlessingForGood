# Convex Query / Index Matrix

| Query family | Ownership/filter | Index used | Bound |
| --- | --- | --- | --- |
| current user | Clerk subject → app user | `appUsers.by_clerk_user_id` | unique |
| owner user list | role/status/created-at filter | `by_role_and_status`, `by_role`, `by_status`, `by_created_at` | paginated |
| customer profile | current app user | `customerProfiles.by_user_id` | unique |
| customer addresses | current app user | `by_user_id_and_created_at` | 100 |
| default addresses | current app user + default flag | `by_user_id_and_default` | bounded |
| catalog grants | current app user + catalog | `catalogAccessGrants.by_app_user_id_and_catalog_id` | one |
| accessible catalogs | current app user | `catalogAccessGrants.by_app_user_id` | paginated |
| customer orders | `customerUserId` | `orders.by_customer_user_id_and_created_at` | paginated |
| order items/history | parent order | `orderItems.by_order`, `orderStatusHistory.by_order_and_changed_at` | bounded |
| admin orders | created-at operations list | `orders.by_created_at` | paginated |
| customer invoices | `customerUserId` | `invoices.by_customer_user_id_and_created_at` | paginated |
| invoice items | parent invoice | `invoiceItems.by_invoice` | bounded |
| customer deposit account | current app user + IDR | `depositAccounts.by_user_id_and_currency` | unique |
| customer deposit history | current account | `depositTransactions.by_account_and_created_at` | paginated |
| invoice allocations | parent invoice | `invoiceDepositAllocations.by_invoice` | 100 |
| batches | operational created/archived | `batches.by_created_at`, `by_archived` | paginated/bounded |
| batch links | catalog + batch | `catalogBatchLinks.by_catalog_and_batch` | unique |
| assignments | order item or batch | `orderItemBatchAssignments.by_order_item`, `by_batch` | bounded |
| shipment history | parent batch + timestamp | `batchStatusHistory.by_batch_and_changed_at` | 100 |
| fulfillment history | parent order + timestamp | `orderFulfillmentHistory.by_order_and_changed_at` | 100 |
| audit events | actor, target, or time | `auditEvents.by_actor_user_id`, `by_target`, `by_created_at` | query-specific |

[CONVEX VERIFIED] Codegen and Convex tests pass against the configured
Development deployment. No client-side full-table ownership filtering is
used by active customer queries.
