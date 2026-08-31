# BFG ADMIN ↔ CUSTOMER SYNC MATRIX

Reconciled: 2026-08-31
Authority: canonical Convex records and server projections. Admin UI actions
never manually patch a customer surface.

## Admin System access correction — 2026-08-31

The System navigation and its routes were previously Owner-only, so an active
Admin could be authorized for the Admin workspace while receiving no System
section. `Pengguna`, `Pengaturan`, and `Log Aktivitas` now follow canonical
active-Admin role/capability authority. Users read/status operations and the
current operational settings are Admin-accessible; role/invitation/revocation,
Owner targets, and any genuinely ownership-critical action retain stronger
Owner guards. No email allowlist is used.

| Domain | Admin Action | Canonical Record | Customer Query | Customer Surface | Expected Consequence | Realtime? | Authorization | Notification? | Production Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Admin System / audit | inspect operational audit history | `auditEvents` | `auditEvents.list` | `/admin/audit` | active Admins see the intended read-only System surface; customers, inactive members, and non-Admins remain denied | yes | active Admin `audit.read`; Owner retains all permissions | no | local role matrix and route/permission regression PASS; code `845ead6`/`1697e97` deployed through Git-integrated Vercel Production; authenticated Production UAT pending | SYNCED_PENDING_UAT |
| Users/access | list users and suspend/reactivate eligible non-owner targets | `appUsers`, `auditEvents` | `users.list`, `listStaffInvitations` | `/admin/users` | active Admins can inspect and operate eligible status changes; self and Owner targets remain denied | yes | Admin `users.read`/`users.suspend`; role/invitation/revocation remains Owner-only | access event only | focused/full Convex auth tests PASS; authenticated Production UAT pending | SYNCED_PENDING_UAT |
| Settings | update current operational store/contact/payment instructions | `appSettings`, `auditEvents` | `settings.getForCustomer` | `/admin/settings` | active Admins and Owners can maintain the allowlisted operational settings; future owner-critical actions need separate guards | yes | Admin/Owner `settings.manage`; ownership-critical additions remain Owner-only | no | focused settings tests and build PASS; authenticated Production UAT pending | SYNCED_PENDING_UAT |

## Production UAT correction — 2026-08-30

The active global access-code row below now starts a session on the generated
code's eligible source Catalog. The eligible set remains global, but each
Customer read remains Catalog-specific through `catalogAccess.getUnlocked` and
`catalogView`. Copy confirmation is client-only feedback and is not a business
notification or Activity event. Scoped Catalog/Admin form alignment is
presentation-only; touched selects remain BFGSelect. Commit
`52a5cb7` is deployed to Vercel Production
and Convex `clean-eel-522`; authenticated business UAT remains pending.

| Domain | Admin Action | Canonical Record | Customer Query | Customer Surface | Expected Consequence | Realtime? | Authorization | Notification? | Production Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Admission | approve/reject/retry Join request | `joinRequests`, `appUsers`, `auditEvents` | `joinRequests.mine`, `users.current` | `/join`, gated customer shell | approval creates one onboarding handoff; only authenticated canonical reconciliation creates active membership; rejection/removed remain non-active | yes, query-backed | Admin/Owner review; current Clerk identity and verified email | yes where configured | authenticated Production UAT pending for this correction | SYNCED_PENDING_UAT |
| Product publication | create/edit/publish Book Master | `publishers`, `books`, `bookVariants` | `books`/catalog/Ready Stock safe projections | `/catalog`, `/ready-stock` | eligible product becomes visible only after publication rules | yes | Admin/Owner mutation; customer-safe query | event-backed where relevant | supplied real product/projection PASS | SYNCED |
| Cover | upload/attach/replace cover | `books`, Convex `_storage`, `auditEvents` | customer-safe cover URL | catalog and Ready Stock cards/detail | durable cover survives refresh and projects safely | yes | Admin/Owner upload; signed storage URL | no standalone fake notice | supplied real cover persistence/projection PASS | SYNCED |
| Ready Stock | set on-hand quantity | `readyStockInventory` | `readyStock.list/getBySlug` | `/ready-stock` | `available = onHand - reserved` | yes | Admin/Owner | no fake notice | supplied real product/stock baseline | SYNCED |
| Ready Stock order | create, cancel, fulfill | `orders`, `orderItems`, `readyStockReservations` | `orders.getMine`, fulfillment projections | `/account/orders/[orderId]` | reservation active, released, or fulfilled; order history updates | yes | active customer creates; Admin transitions | order/fulfillment events | supplied real order PASS | SYNCED |
| Catalog assignment | assign/remove Book variant | `catalogItems`, `secretCatalogs` | `catalogAccess.getUnlocked` | `/catalog` | scoped customer listing changes | yes | Admin/Owner; catalog state guard | no synthetic activity | supplied Secret Catalog flow PASS | SYNCED |
| Catalog discovery | search eligible Book Master records; search/filter current Catalog contents | `bookVariants`, `books`, `publishers`, `catalogItems` | `catalogAccess.getUnlocked` | `/catalog` | discovery changes only which existing records are visible in the Admin working set or Customer grid; add/remove/order mutations remain unchanged | yes | existing Admin/Owner eligibility and Customer access guards | no | local focused/full tests and read-only Production item trace PASS; authenticated UAT pending | SYNCED_PENDING_UAT |
| Catalog access code | generate/copy/revoke one current global code | `catalogAccessCodes`, `auditEvents` | session validation / `getUnlocked` / `listForSession` | `/catalog`, Admin Access Management | one-time plaintext display; current code opens all existing eligible open/unexpired Catalogs and starts on its eligible source Catalog; new redemption is blocked after revoke/rotation | yes | Admin/Owner; digest/pepper/rate limit server-side | no business notification; local copy toast only | local global-scope/security/projection/copy tests PASS; Vercel `dpl_CHkP7dRoSs4p2He6jUAWfPaZLviA` and Convex `clean-eel-522` deployed; authenticated UAT pending | SYNCED_PENDING_UAT |
| Catalog access period | deprecated historical data only; no active Admin operation | `catalogAccessPeriods`, optional `secretCatalogs.accessPeriodId`, legacy sessions/grants | legacy session guards only | historical compatibility path | not required for global-code access; existing valid period sessions remain subject to their current expiry/revoke/link/Catalog guards | yes | existing server-side period/session/Catalog guards | no plaintext notification | historical compatibility retained; authenticated UAT pending | DEPRECATED |
| Member catalog grant | grant/revoke customer | `catalogAccessGrants`, `auditEvents` | `listAccessible/getUnlocked` | customer catalog and Admin Access Management | active member access starts/stops; owned orders still server-guarded | yes | Admin/Owner; customer ownership | access event only if configured | supplied ownership/access baseline | SYNCED |
| Join/customer detail | inspect customer and link workflows | `appUsers`, profiles, addresses, orders/invoices/deposits | owned account queries | `/account`, `/account/profile`, `/account/addresses` | customer-safe detail remains isolated; Admin links do not bypass guards | yes | Admin/Owner for Admin views; customer owns own | no fake notification | supplied ownership isolation PASS | SYNCED |
| Order | create/edit/status | `orders`, `orderItems`, status history | `orders.listMine/getMine` | `/account/orders` | owned snapshots/history and downstream invoice/batch links | yes | active customer/Admin-assisted; server ownership | order events | supplied real order/Admin projection PASS | SYNCED |
| Batch roster | create/link/assign/move/archive | `batches`, assignments, histories | `batchTracking.listMine/getBatchMine` | `/account/batches` | customer batch list/detail reflects derived assignment | yes | Admin/Owner; stage locks edits | batch events | supplied customer/Admin projection baseline | SYNCED |
| Tracking | move shipment/fulfillment stage | batch/order fulfillment histories | customer tracking queries | `/account/orders/[id]`, `/account/batches/[id]` | six-stage shipment and five-stage fulfillment projection | yes | Admin/Owner; transition helper | tracking event | supplied tracking baseline | SYNCED |
| Invoice | create/issue/void | `invoices`, `invoiceItems`, `auditEvents` | `invoices.listMine/getMine` | `/account/invoices` | Tagihan reflects canonical integer-IDR snapshot and status | yes | Admin/Owner; customer ownership | issuance notification | supplied invoice issuance/Tagihan PASS | SYNCED |
| Payment | submit proof/approve/reject | `paymentConfirmations`, private storage, invoice fields | `paymentConfirmations.listMineForInvoice`, invoice query | invoice detail and Admin queue | verified payment changes invoice consequence without deleting history | yes | customer owns proof; Admin reviews | payment/invoice event | supplied payment baseline | SYNCED |
| Deposit top-up | submit/approve/reject | `depositTopUps`, `depositTransactions`, account | `depositAccounts.getMine`, transaction list | `/account/deposit` | approved credit and history projection | yes | customer own proof; Admin reviews | top-up event where configured | supplied deposit baseline | SYNCED |
| Deposit allocation | allocate/release/reverse | allocation and ledger tables | account/invoice queries | Tagihan and Deposit | available/reserved balance remains derived and append-only | yes | Admin financial permission, invoice ownership | financial event where configured | local policy/financial tests; supplied invoice baseline | SYNCED |
| Exception | open/review/resolve/reject | exception, events, financial adjustments | customer exception/order projections | order detail and Admin Exceptions | partial quantity, replacement, release, or refund obligation consequence | yes | customer request; Admin resolution | exception/invoice event | local full policy tests; supplied real order baseline | SYNCED |
| Refund | create/start/record payout | refund obligations/payouts and ledger holds | `refunds.listMine/getMine` | customer account/order projection | pending/processing/paid/failed/partial payout without overpayment | yes | Admin payout; customer own view | refund event | local partial-safe tests; supplied baseline | SYNCED |
| Notification | event writer/read/mark read | `notifications` | `notifications.listMine/unreadCount` | `/account/notifications`, Aktivitas | recipient-scoped unread/read attention | yes | recipient ownership; Admin permission | itself | supplied invoice/notification PASS | SYNCED |
| Inbox | write/read/mark read | `notifications` with `surface=inbox` | same query with surface scope | `/account/inbox`, `/admin/inbox` | persistent operational message, not social chat | yes | recipient/role scope | itself | local ownership tests; supplied activity baseline | SYNCED |
| Users/access | invite/role/suspend/reactivate | `appUsers`, `staffInvitations`, `auditEvents` | `users.current` and gated queries | customer/Admin shells | access changes are reflected on next query/session | yes | Admin read/status permissions; Owner-only invitation/revocation/role changes | access event only | local role/permission regression PASS; authenticated UAT pending | SYNCED_PENDING_UAT |
| Activity/audit | inspect safe event history | `auditEvents` | Admin audit query | `/admin/audit` | operational evidence; not fake customer feed | yes | audit permission | no | supplied baseline; local audit tests | SYNCED |
| Content | save draft/publish | `contentBlocks` | `contentBlocks.getPublished` | public content routes | published content only reaches customer surface | yes | Admin content permission | no | current local/content baseline | SYNCED |
| Settings | update store/contact/payment instructions | `appSettings` | `settings.getForCustomer` | customer-safe instructions | customers see current approved instruction projection | yes | Admin/Owner `settings.manage`; customer-safe read | no gateway/WA automation | current local/settings regression PASS; authenticated UAT pending | SYNCED_PENDING_UAT |
| Reports/export | query period/export | bounded report rows, export audit | none (Admin-only) | `/admin/reports` | operational visibility without customer data leakage | yes | Admin/Owner report permission | no | current local/report baseline | SYNCED |

## Contract

`Admin action → canonical record → customer query → customer surface` must be
traceable for every shared domain. A mutation that changes only an Admin local
component is not a product consequence. Realtime means Convex reactive query
projection where the active surface subscribes; it does not authorize writes
or replace state validation.
