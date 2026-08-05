# Phase 03.1 data model

Publishers own books. Books own BB/PB/HB variants. Catalog items link variants
to a secret catalog and may carry a catalog-specific price override.

Customers receive a catalog access grant after server-side code verification.
Orders belong to the customer prototype session and catalog. Order items copy
book, publisher, format, ISBN, currency, unit price, quantity, and subtotal at
submission time so later catalog edits cannot change historical totals.

`prototypeSessions` is an expiring Preview-only boundary, not a user account.
Only token digests are stored. Raw access codes and raw session tokens never
enter Convex documents.
