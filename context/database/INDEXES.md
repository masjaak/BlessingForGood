# Phase 03.1 indexes

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
```
