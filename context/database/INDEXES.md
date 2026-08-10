# BFG Convex Indexes

[REPOSITORY] Indexes are defined in `convex/schema.ts` and used by server
queries. Ownership reads start at an app-user or parent relationship index.

```text
prototypeSessions: by_token_digest, by_expiration
appUsers: by_clerk_user_id, by_role, by_status, by_role_and_status, by_created_at
customerProfiles: by_user_id
customerAddresses: by_user_id, by_user_id_and_default, by_user_id_and_created_at
auditEvents: by_actor_user_id, by_target, by_created_at
publishers: by_slug, by_active, by_created_at
books: by_publisher, by_publisher_and_slug, by_active, by_created_at
bookVariants: by_book, by_isbn, by_book_and_format
secretCatalogs: by_slug, by_status, by_closes_at, by_created_at
catalogAccessCodes: by_catalog, by_catalog_and_active, by_lookup_digest, by_expiration
catalogItems: by_catalog, by_variant, by_catalog_and_variant
catalogAccessGrants: by_app_user_id, by_app_user_id_and_catalog_id, by_catalog, by_expiration
orders: by_customer_user_id, by_catalog, by_status, by_catalog_and_status,
        by_customer_user_id_and_created_at, by_created_at
orderItems: by_order, by_book, by_variant
orderStatusHistory: by_order, by_order_and_changed_at
batches: by_reference_code, by_current_stage, by_created_at, by_archived
catalogBatchLinks: by_catalog, by_batch, by_catalog_and_batch
orderItemBatchAssignments: by_order_item, by_batch, by_order_item_and_batch
batchStatusHistory: by_batch, by_batch_and_changed_at, by_stage
orderFulfillmentHistory: by_order, by_order_and_changed_at, by_stage
invoices: by_order, by_customer_user_id, by_status, by_invoice_number,
          by_customer_user_id_and_created_at, by_created_at
invoiceItems: by_invoice, by_order_item
paymentConfirmations: by_invoice, by_customer_user_id_and_created_at,
                      by_status_and_created_at, by_created_at
depositAccounts: by_user_id, by_user_id_and_currency
depositTransactions: by_account, by_account_and_created_at, by_invoice, by_reference_transaction
invoiceDepositAllocations: by_invoice, by_account, by_reservation_transaction, by_invoice_and_status
```
