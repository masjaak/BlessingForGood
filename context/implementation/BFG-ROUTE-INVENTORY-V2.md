# BFG Route Inventory V2

Generated from the successful Next production build on 2026-08-15 at
`45362dd6d0fa753ce5efad70fe9d04857ebf0c1c`.

The table contains 50 generated routes including `/_not-found` (49 App Router
page files plus the framework not-found surface).

The route tree below is the current App Router tree. Route existence is not
authorization or feature completeness; the source matrix must still trace the
route to UI, state, backend, consequence, tests, and Production evidence.

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

## Conceptual Route Adaptations

| Original conceptual route | Current canonical route/flow | Classification | Decision |
|---|---|---|---|
| `/login` | `/sign-in/[[...sign-in]]` | PUBLIC AUTH | adapted; keep one Clerk entry |
| `/catalogs` | `/catalog` gateway and inline catalog detail | SECRET_CATALOG_SESSION / CUSTOMER | adapted; keep scoped gateway |
| `/catalogs/[catalogId]/access` | `/admin/catalogs/[catalogId]/access` | ADMIN | implemented and naturally linked |
| `/books/[bookId]` | inline detail inside `/catalog`, Admin `/admin/books/[bookId]` | CUSTOMER / ADMIN | adapted to current product flow |
| `/orders/review` | inline review in `/catalog` | CUSTOMER | adapted; no duplicate route |
| `/orders/success/[orderId]` | submit success state and `/account/orders/[orderId]` | CUSTOMER | adapted; owned detail is canonical |
| `/my-books` | `/account/orders` | CUSTOMER | adapted; current Indonesian label is Buku Saya |
| `/my-books/[orderId]` | `/account/orders/[orderId]` | CUSTOMER | adapted |
| `/billing` | `/account/invoices` | CUSTOMER | adapted; current label is Tagihan |
| `/admin/secret-catalogs` | `/admin/catalogs` | ADMIN | adapted |
| `/admin/catalog` | `/admin/catalogs` and `/admin/books` | ADMIN | split by canonical domain boundary |
| `/admin/import` | no active route | DEPRECATED / DEFERRED | source-supported future candidate; no dead action |

## Classification Audit

- Public: current public/customer discovery and error surfaces listed above.
- Customer: `/account/*` is ownership-scoped by Convex; customer routes do not
  expose Admin payloads.
- Admin: `/admin/*` operational routes use Admin/Owner route guards and direct
  server authorization.
- Owner: `/admin/users`, `/admin/audit`, `/admin/settings` retain Owner-only
  mutations/queries where defined.
- Secret Catalog session: `/catalog` accepts the scoped anonymous session or
  active member grant; an order still requires an active customer.
- Deprecated: invitation-only `/sign-up`; it is not public self-registration.
- Internal: no user-facing internal route is present in the current App Router;
  Convex internal helpers are not routes.
- Unreachable: `0` required routes. Legacy `prototypeSessions` is isolated
  test support and is not a hidden product route.

Expected PRD routes missing: `0` after explicit route adaptations. Unreachable
required routes: `0`. `/sign-up` is explicitly invitation-only and classified
rather than silently treated as an active public registration flow.
