# BFG Navigation Matrix

## Public

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Brand, Ready Stock, Secret Catalog, community and join entry | implemented |
| `/community` | Blessfriends community introduction | implemented |
| `/how-to-order` | Actual current order flow | implemented |
| `/help` | Customer help paths | implemented |
| `/join` | Join request and success/status guidance | implemented |
| `/ready-stock`, `/ready-stock/[slug]` | Public stock browse/detail | implemented |
| `/sign-in`, `/sign-up` | Clerk sign-in/invitation acceptance | implemented |

## Customer

| Route | Purpose | Status |
| --- | --- | --- |
| `/catalog` | Secure Secret Catalog access and preorder | implemented |
| `/account` | Needs-attention dashboard and unified activity | implemented in Production V1 convergence |
| `/account/orders`, `/account/orders/[orderId]` | Owned orders, tracking, fulfillment, exceptions | implemented |
| `/account/invoices`, `/account/invoices/[invoiceId]` | Invoice, payment, deposit and ledger | implemented |
| `/account/profile` | Customer profile | implemented |
| `/account/addresses` | Customer shipping addresses | implemented |

## Admin

| Route | Purpose | Status |
| --- | --- | --- |
| `/admin` | Operational queue home | implemented |
| `/admin/books`, `/admin/books/[bookId]` | Book Master and Ready Stock | implemented |
| `/admin/catalogs` | Secret Catalog management | implemented |
| `/admin/join-requests` | Blessfriends admission queue | implemented |
| `/admin/orders`, `/admin/orders/[orderId]` | Order operations and assisted orders | implemented |
| `/admin/batches`, `/admin/batches/[batchId]` | Batch PO, roster, purchasing summary and tracking | implemented |
| `/admin/invoices`, `/admin/invoices/[invoiceId]` | Invoice and deposit operations | implemented |
| `/admin/payments` | Manual payment review | implemented |
| `/admin/exceptions` | OOS, defect and cancellation queue | implemented |
| `/admin/customers`, `/admin/customers/[customerId]` | Customer operational context | implemented in Production V1 convergence |
| `/admin/users` | Admin user/status operations; Owner-only role and invitation management | implemented |

Reporting, Content, Settings and Excel routes are not linked because their
product scope is not implemented. Navigation is never the authorization
boundary; every protected data call remains server-authorized.
