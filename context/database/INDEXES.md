# BFG Convex Indexes

[REPOSITORY] Indexes are defined in `convex/schema.ts` and used by server
queries. Ownership reads start at an app-user or parent relationship index.

```text
prototypeSessions: by_token_digest, by_expiration
appUsers: by_clerk_user_id, by_role, by_status, by_role_and_status, by_created_at
customerProfiles: by_user_id
customerAddresses: by_user_id, by_user_id_and_default, by_user_id_and_created_at
joinRequests: by_status_and_submitted_at, by_submitted_at, by_normalized_email,
              by_normalized_contact
auditEvents: by_actor_user_id, by_target, by_created_at
publishers: by_slug, by_active, by_created_at
books: by_slug, by_publication_status, by_created_at
bookVariants: by_book, by_isbn, by_book_and_format
readyStockInventory: by_book_variant_id
secretCatalogs: by_slug, by_status, by_closes_at, by_created_at
catalogAccessCodes: by_catalog, by_catalog_and_active, by_lookup_digest, by_expiration
catalogItems: by_catalog, by_variant, by_catalog_and_variant
catalogAccessGrants: by_app_user_id, by_app_user_id_and_catalog_id, by_catalog, by_expiration
orders: by_customer_user_id, by_catalog, by_status, by_catalog_and_status,
        by_customer_user_id_and_created_at, by_assisted_submission_key,
        by_created_at
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

Phase 06.3 uses `appUsers.by_role_and_status` for the active customer selector,
`orders.by_assisted_submission_key` for assisted-order idempotency,
`orders.by_status` for the bounded submitted-order scan, and
`orderItemBatchAssignments.by_order_item_and_batch` for duplicate-safe
assignment/move checks. No source index was added because the assisted-order
view remains an admin operations projection. The unassigned scan is bounded
to 200 orders/items; add a dedicated roster projection/index at the documented
scale trigger.

Phase 06.4 exception access patterns use:

```text
orderExceptions: by_status_and_created_at, by_customer_user_id_and_created_at,
                 by_order, by_order_item, by_type_and_created_at, by_created_at
orderExceptionEvents: by_exception_and_created_at, by_order, by_order_item
orderExceptionFinancialAdjustments: by_exception, by_order, by_invoice,
                                    by_order_item
```

The admin queue uses status/time or created-time order. Customer history uses
customer/time and order ownership checks. Order detail uses `by_order`; item
quantity and active-conflict checks use `by_order_item`. Financial review uses
the exception, order, invoice, or item indexes. No reporting projection or
speculative index was added.
