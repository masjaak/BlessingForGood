# Convex indexes (Phase 03.1 + 03.2)

Indexes are defined in `convex/schema.ts` and used by the corresponding
functions. Relationship/status lists use indexed pagination or bounded reads;
the client never fetches an entire table to filter ownership.

```text
prototypeSessions: by_token_digest, by_expiration
publishers: by_slug, by_active, by_created_at
books: by_publisher, by_publisher_and_slug, by_active, by_created_at
bookVariants: by_book, by_isbn, by_book_and_format
secretCatalogs: by_slug, by_status, by_closes_at, by_created_at
catalogAccessCodes: by_catalog, by_catalog_and_active, by_lookup_digest, by_expiration
catalogItems: by_catalog, by_variant, by_catalog_and_variant
catalogAccessGrants: by_session, by_session_and_catalog, by_catalog, by_expiration
orders: by_session, by_catalog, by_status, by_catalog_and_status, by_session_and_created_at, by_created_at
orderItems: by_order, by_book, by_variant
orderStatusHistory: by_order, by_order_and_changed_at
batches: by_reference_code, by_current_stage, by_created_at, by_archived
catalogBatchLinks: by_catalog, by_batch, by_catalog_and_batch
orderItemBatchAssignments: by_order_item, by_batch, by_order_item_and_batch
batchStatusHistory: by_batch, by_batch_and_changed_at, by_stage
orderFulfillmentHistory: by_order, by_order_and_changed_at, by_stage
invoices: by_order, by_customer, by_status, by_invoice_number, by_customer_and_created_at, by_created_at
invoiceItems: by_invoice, by_order_item
depositAccounts: by_customer, by_customer_and_currency
depositTransactions: by_account, by_account_and_created_at, by_invoice, by_reference_transaction
invoiceDepositAllocations: by_invoice, by_account, by_reservation_transaction, by_invoice_and_status
```

Phase 03.2 uses the relationship indexes for server-side ownership and
eligibility checks. Customer reads start from `by_session_and_created_at`,
`by_customer_and_created_at`, `by_customer_and_currency`, or
`by_account_and_created_at`; they do not collect a full table and filter in
React. Operational history is read through the parent relationship plus the
timestamp index.
