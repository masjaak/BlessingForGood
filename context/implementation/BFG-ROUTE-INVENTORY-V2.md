# BFG Route Inventory V2

Generated from the successful Next production build on 2026-08-14.

| Route | Classification | Natural entry / requirement |
| --- | --- | --- |
| `/` | PUBLIC | brand landing/header navigation |
| `/_not-found` | PUBLIC | framework error boundary |
| `/community` | PUBLIC | primary navigation/footer |
| `/how-to-order` | PUBLIC | primary navigation/home CTA |
| `/help` | PUBLIC | footer/account/catalog help |
| `/join` | PUBLIC | primary navigation/account CTA |
| `/ready-stock` | PUBLIC | primary navigation/home CTA |
| `/ready-stock/[slug]` | PUBLIC | Ready Stock product row |
| `/catalog` | SECRET_CATALOG_SESSION / CUSTOMER | primary navigation/account; code or grant |
| `/sign-in/[[...sign-in]]` | PUBLIC AUTH | header/account redirect |
| `/sign-up/[[...sign-up]]` | DEPRECATED_PUBLIC_SIGNUP | invitation-only; public request redirects home |
| `/account` | CUSTOMER | mobile/header account navigation |
| `/account/profile` | CUSTOMER | account card |
| `/account/addresses` | CUSTOMER | account card |
| `/account/orders` | CUSTOMER | mobile/header/account navigation |
| `/account/orders/[orderId]` | CUSTOMER | owned order row |
| `/account/invoices` | CUSTOMER | mobile/header/account navigation |
| `/account/invoices/[invoiceId]` | CUSTOMER | owned invoice row |
| `/account/batches` | CUSTOMER | account batch card/order tracking |
| `/account/batches/[batchId]` | CUSTOMER | participating batch row/notification |
| `/account/deposit` | CUSTOMER | account balance card/invoice |
| `/account/notifications` | CUSTOMER | authenticated header bell |
| `/account/inbox` | CUSTOMER | authenticated header Inbox |
| `/admin` | ADMIN | workspace switch |
| `/admin/books` | ADMIN | sidebar/dashboard quick action |
| `/admin/books/[bookId]` | ADMIN | book row/create result |
| `/admin/catalogs` | ADMIN | sidebar/dashboard |
| `/admin/catalogs/[catalogId]` | ADMIN | catalog row/create result |
| `/admin/catalogs/[catalogId]/access` | ADMIN | catalog list/detail Access Management CTA |
| `/admin/ready-stock` | ADMIN | sidebar |
| `/admin/join-requests` | ADMIN | sidebar badge/dashboard/notification |
| `/admin/orders` | ADMIN | sidebar/dashboard/notification |
| `/admin/orders/[orderId]` | ADMIN | order row |
| `/admin/batches` | ADMIN | sidebar/dashboard |
| `/admin/batches/[batchId]` | ADMIN | batch row |
| `/admin/customers` | ADMIN | sidebar |
| `/admin/customers/[customerId]` | ADMIN | customer row |
| `/admin/invoices` | ADMIN | sidebar/dashboard |
| `/admin/invoices/[invoiceId]` | ADMIN | invoice row |
| `/admin/payments` | ADMIN | sidebar/notification |
| `/admin/deposits` | ADMIN | sidebar/notification |
| `/admin/exceptions` | ADMIN | sidebar/dashboard |
| `/admin/refunds` | ADMIN | sidebar/dashboard |
| `/admin/reports` | ADMIN | sidebar/export/analytics |
| `/admin/content` | ADMIN | sidebar |
| `/admin/notifications` | ADMIN | authenticated header bell |
| `/admin/inbox` | ADMIN | authenticated header Inbox |
| `/admin/users` | OWNER | Owner sidebar |
| `/admin/audit` | OWNER | Owner sidebar/dashboard activity link |
| `/admin/settings` | OWNER | Owner sidebar |

Expected PRD routes missing: `0`. Unreachable implemented routes: `0`. `/sign-up` is explicitly invitation-only and
classified rather than silently treated as an active public registration flow.
