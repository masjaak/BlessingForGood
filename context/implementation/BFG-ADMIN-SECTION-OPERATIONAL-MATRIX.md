# BFG Admin Section Operational Matrix

Reconciled: 2026-08-14

This is the page-by-page Phase 07.1 operational contract. `ACTIVE_VERIFIED`
means the source-defined control is reachable locally, calls the canonical
query/mutation, has server authorization, and is covered by deterministic QA.
`Production Verified` is intentionally separate and remains `NO` until the
canonical Convex/Vercel and authorized-user gates pass.

## Dashboard

| Field | Contract |
| --- | --- |
| Route | `/admin` |
| Mockup | A-01 |
| Purpose | Prioritize operational queues and expose reachable next actions. |
| Required Data | Orders, batches, invoices, payments, Join requests, exceptions, refunds. |
| Primary Action | Open the queue requiring action. |
| Secondary Actions | Book Master, Secret Catalog, Batch PO, Invoice & Deposit, Users for Owner. |
| Allowed Create | None; dashboard is a projection. |
| Allowed Edit | None; use the owning section. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Fake KPI/data, direct financial settlement, destructive shortcuts. |
| Filters | None; queue links own their filters. |
| Search | None; global search is not approved. |
| Upload | None. |
| Detail View | Queue destination and audit destination. |
| State Machine | Projection of each owning domain state. |
| Query | `orders.listForAdmin`, `batches.listForAdmin`, `invoices.listForAdmin`, `paymentConfirmations.listPendingForAdmin`, `joinRequests.listForAdmin`, `orderExceptions.listForAdmin`, `refunds.listForAdmin`. |
| Mutation | None. |
| Authorization | Admin/Owner; each linked operation rechecks its own permission. |
| Loading | Operational loading region with skeleton cards. |
| Empty State | Zero-safe “clean” queue cards. |
| Error State | Guard/query error state; no fabricated counts. |
| Success State | Reactive queue counts after canonical mutation. |
| Customer Consequence | None directly; linked domain action owns it. |
| Notification Consequence | None directly; linked domain event owns it. |
| Production Verified | NO — deployment and authenticated Owner/Admin UAT pending. |

## Join Requests

| Field | Contract |
| --- | --- |
| Route | `/admin/join-requests` |
| Mockup | A-01; latest admission flow |
| Purpose | Review admission requests without deleting history. |
| Required Data | Applicant snapshot, status, review actor/time, admission handoff. |
| Primary Action | Start review, then approve or reject. |
| Secondary Actions | Retry valid admission handoff; search and status filter. |
| Allowed Create | Public applicant submission only at `/join`. |
| Allowed Edit | Forward-only review transition. |
| Allowed Delete/Archive/Void | None; retention is canonical. |
| Forbidden Actions | Delete applicant history, create Clerk identity from public submit, bypass admission. |
| Filters | Status. |
| Search | Name, email, contact. |
| Upload | None. |
| Detail View | Applicant row and review context. |
| State Machine | `submitted → under_review → approved_pending_admission → admitted`; reject branch retained. |
| Query | `joinRequests.listForAdmin`, `joinRequests.pendingCount`. |
| Mutation | `startReview`, `approve`, `reject`, `retryAdmission`. |
| Authorization | Admin/Owner review; server derives actor and admission state. |
| Loading | Queue skeleton. |
| Empty State | No pending/history-safe empty queue. |
| Error State | Invalid transition or admission handoff error. |
| Success State | Row/status/badge reactively update; Inbox/notification when recipient exists. |
| Customer Consequence | Applicant sees owned Join status. |
| Notification Consequence | Safe admission operational message where a canonical recipient exists. |
| Production Verified | NO — real applicant journey not authorized/provided. |

## Customers

| Field | Contract |
| --- | --- |
| Route | `/admin/customers`, `/admin/customers/[customerId]` |
| Mockup | A-06 |
| Purpose | View active customer profile and linked operational history. |
| Required Data | Profile, addresses, orders, invoices, exceptions, deposit route. |
| Primary Action | Open customer detail; issue invoice from a linked order. |
| Secondary Actions | Manage deposit from the preselected customer route; open order/invoice detail. |
| Allowed Create | No customer record; only existing admitted customers and linked domain records. |
| Allowed Edit | None on profile from this surface; owner-controlled access remains in its owning flow. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Delete customer, create name/phone-only customer, mutate payment/history from profile view. |
| Filters | None currently; route-level customer list is canonical. |
| Search | Not present; source contract only requires customer list/detail in this phase. |
| Upload | None. |
| Detail View | Profile, addresses, orders, invoices, exceptions. |
| State Machine | Owned domain states; no customer-profile state machine. |
| Query | `orders.listEligibleCustomers`, `customerProfiles.getForAdmin`, `customerAddresses.listForAdmin`, `invoices.listForAdmin`, `orderExceptions.listForAdmin`. |
| Mutation | None directly; links to `invoices.create/issue` and `depositTransactions.adjust` surfaces. |
| Authorization | Admin/Owner read; server-side customer ownership and permission checks remain canonical. |
| Loading | Profile/history skeleton cards. |
| Empty State | No active customer, no orders, no invoices, no exceptions. |
| Error State | Not found or protected resource error. |
| Success State | Detail reflects reactive canonical projections. |
| Customer Consequence | None from viewing; linked invoice/deposit actions have owned consequences. |
| Notification Consequence | Invoice issue notification is created by `invoices.issue`. |
| Production Verified | NO — authenticated Customer/Admin data QA pending. |

## Books

| Field | Contract |
| --- | --- |
| Route | `/admin/books`, `/admin/books/[bookId]` |
| Mockup | A-02/A-03; A-03 upload concept |
| Purpose | Maintain Publisher, Book Master, variants, pricing, publication, cover, and stock entry point. |
| Required Data | Publisher, title/slug, author/description/categories, cover, variants, ISBN, integer IDR price, publication status, stock. |
| Primary Action | Create/edit Book Master and publish valid product data. |
| Secondary Actions | Publisher maintenance, cover preview/upload/replace, variant add/edit, stock edit, search/filter. |
| Allowed Create | Publisher, Book Master draft, Book variant. |
| Allowed Edit | Metadata, variant ISBN/price/availability, Ready Stock quantity through canonical mutation. |
| Allowed Delete/Archive/Void | Archive publication where canonical; no hard delete. Cover replacement deletes prior storage only after successful reference update. |
| Forbidden Actions | Raw URL-only cover workflow, client price/stock authority, duplicate ISBN/format, executable upload. |
| Filters | Publication status, availability. |
| Search | Title, author, publisher, category, ISBN. |
| Upload | Native JPG/PNG/WebP cover picker, local preview, guarded Convex storage upload. |
| Detail View | Book metadata, cover, variants, ISBN, price, Ready Stock. |
| State Machine | `draft → published/special → archived`; published/special may switch where allowed. |
| Query | `publishers.list/listForAdmin`, `books.listForAdmin/getForAdmin`. |
| Mutation | `publishers.create/update`, `books.create/update/generateCoverUploadUrl/attachCover`, `bookVariants.create/update`, `readyStock.setQuantity`. |
| Authorization | `books.manage`; storage MIME/size is validated server-side. |
| Loading | List/detail skeleton. |
| Empty State | No publishers/books/variants; actionable Book Master entry. |
| Error State | Duplicate slug/ISBN, invalid file, unavailable publisher, rejected state. |
| Success State | Canonical book/variant/cover/stock projection updates without refresh workaround. |
| Customer Consequence | Eligible publication and availability appear in Ready Stock/Secret Catalog; cover URL projects safely. |
| Notification Consequence | No notification for routine metadata; domain events may audit. |
| Production Verified | NO — intentional real product pilot pending. |

## Catalogs

| Field | Contract |
| --- | --- |
| Route | `/admin/catalogs`, `/admin/catalogs/[catalogId]`, `/admin/catalogs/[catalogId]/access` |
| Mockup | A-02/A-03; latest Access Management decision |
| Purpose | Curate existing products and manage open/close plus hybrid customer access. |
| Required Data | Catalog metadata/status/deadline, existing variants, access-code metadata, member grants. |
| Primary Action | Create/edit/open/close catalog and assign/remove products. |
| Secondary Actions | Generate/copy/revoke expiring code; grant/revoke member access; view history metadata. |
| Allowed Create | Catalog, access code, member grant. |
| Allowed Edit | Draft metadata, deadline, item membership before lock/close where policy permits. |
| Allowed Delete/Archive/Void | Remove catalog item; revoke code/grant; no destructive catalog history delete. |
| Forbidden Actions | Store plaintext digest/code, unlock closed/draft catalog, recreate Book Master per catalog, arbitrary customer access. |
| Filters | Catalog status and assignable product set through owning queries. |
| Search | None global; assignable product selector is route-local. |
| Upload | None; product media belongs to Books. |
| Detail View | Catalog metadata/items and Access Management. |
| State Machine | `draft → open → closed`; code/session/grant active→revoked/expired. |
| Query | `secretCatalogs.list/getForAdmin`, `catalogItems.listForCatalog/listAssignable`, `catalogAccess.listForAdmin`, eligible customers. |
| Mutation | `secretCatalogs.create/update/open/close`, `catalogItems.add/remove`, `catalogAccess.generateCode/revokeCode/grantMember/revokeGrant`. |
| Authorization | `catalog.manage`; exact catalog/customer scope and expiry checks server-side. |
| Loading | Catalog/item/access skeletons. |
| Empty State | No catalog, no assigned product, no member grant, no code history. |
| Error State | Invalid deadline/state/scope, expired or closed access, duplicate item. |
| Success State | Customer unlock/grant projection reacts; plaintext code shown once only. |
| Customer Consequence | Scoped catalog opens/closes; assigned product set and order eligibility change. |
| Notification Consequence | Member grant/relevant workflow may create owned Inbox/notification; secrets never appear. |
| Production Verified | NO — real code/grant/cross-browser UAT pending. |

## Ready Stock

| Field | Contract |
| --- | --- |
| Route | `/admin/ready-stock` |
| Mockup | A-02 Ready Stock tab/A-01 operational context |
| Purpose | Maintain on-hand inventory and inspect reserved/available projection. |
| Required Data | Published product/variant, on-hand, reserved, available, customer-safe metadata. |
| Primary Action | Set on-hand quantity through the canonical inventory mutation. |
| Secondary Actions | Search/filter, open Book Master, inspect stock columns. |
| Allowed Create | Inventory row is created by canonical quantity mutation when product exists. |
| Allowed Edit | On-hand quantity only above active reservations. |
| Allowed Delete/Archive/Void | None; product archive belongs to Books and reservation history remains. |
| Forbidden Actions | Edit available/reserved directly, negative stock, release reservation manually, delete inventory history. |
| Filters | Availability/search in Admin projection. |
| Search | Product/variant search through Admin projection. |
| Upload | None. |
| Detail View | Product/variant, On Hand, Reserved, Available. |
| State Machine | `available = onHand - reserved`; order/reservation lifecycle is canonical. |
| Query | `readyStock.listForAdmin`. |
| Mutation | `readyStock.setQuantity`; order/reservation mutations own reserved changes. |
| Authorization | `ready_stock.manage`/Admin permission; server checks reservation floor. |
| Loading | Operational loading grammar. |
| Empty State | No listed inventory with Book Master action. |
| Error State | Quantity below reserved, invalid variant, unauthorized. |
| Success State | Admin and customer-safe projections update reactively. |
| Customer Consequence | Ready Stock visibility/availability changes; order reservation remains server-controlled. |
| Notification Consequence | Order/reservation events own notification behavior. |
| Production Verified | NO — real product inventory consequence pending. |

## Orders

| Field | Contract |
| --- | --- |
| Route | `/admin/orders`, `/admin/orders/[orderId]` |
| Mockup | A-05/A-06 |
| Purpose | Operate canonical orders, fulfillment, status, customer relation, batch relation, and invoice entry. |
| Required Data | Order/item snapshots, customer, source, status, batch/fulfillment context, invoice relation. |
| Primary Action | View order and advance only valid canonical stage. |
| Secondary Actions | Search/filter, assisted order for existing customer, batch assignment, invoice open/create. |
| Allowed Create | Customer self-service or Admin-assisted order for existing active customer. |
| Allowed Edit | Valid status/fulfillment/roster operations; snapshots remain immutable. |
| Allowed Delete/Archive/Void | No hard delete; cancellation uses Exception policy. |
| Forbidden Actions | Arbitrary status, price rewrite, fake customer, direct reservation/settlement shortcut. |
| Filters | Status; batch/publisher can be added only with canonical query support. |
| Search | Customer, order ID, book. |
| Upload | None; bulk Excel import is intentionally deferred. |
| Detail View | Customer, snapshots, progress/timeline, batch, exceptions, invoice. |
| State Machine | Order status plus fulfillment and batch stages; valid transitions only. |
| Query | `orders.listForAdmin/getForAdmin`, batch/fulfillment/exceptions/invoice projections. |
| Mutation | `orders.createAssisted/updateStatus`, `orderFulfillment.updateStage`, batch tracking mutations. |
| Authorization | Admin/Owner operations; existing-customer ownership and financial guards. |
| Loading | Table/detail skeleton. |
| Empty State | No orders or no search match. |
| Error State | Invalid transition, locked batch, ownership/permission failure. |
| Success State | Admin and owned customer order/tracking projections update. |
| Customer Consequence | Customer sees owned order, fulfillment, batch, invoice, and exception consequences. |
| Notification Consequence | Domain events may create owned notification/Inbox messages. |
| Production Verified | NO — real authenticated order UAT pending; no dummy order allowed. |

## Batch PO

| Field | Contract |
| --- | --- |
| Route | `/admin/batches`, `/admin/batches/[batchId]` |
| Mockup | A-04/A-09 |
| Purpose | Manage supplier batch deadline, catalog relation, roster, lock, and shipment stage. |
| Required Data | Name/reference, deadline, linked catalog, order-item assignments, quantities, shipment history. |
| Primary Action | Create editable batch and advance valid operational state. |
| Secondary Actions | Link/unlink catalog before lock; assign/unassign/move roster items; update shipment stage; archive where canonical. |
| Allowed Create | Batch; roster assignments through canonical operation. |
| Allowed Edit | Editable metadata/roster; valid forward shipment stage. |
| Allowed Delete/Archive/Void | Archive batch where canonical; no hard delete/history rewrite. |
| Forbidden Actions | Assign after lock, backward transition, arbitrary skip without explicit guard, delete shipment evidence. |
| Filters | Batch list filters/search as implemented. |
| Search | Batch name/reference. |
| Upload | None; export belongs Reports. |
| Detail View | Deadline, linked catalog, roster, totals, timeline. |
| State Machine | `editable → po_closed → ordered_to_supplier → shipped_internationally → customs → to_indonesia_warehouse → at_store`. |
| Query | `batches.listForAdmin/getForAdmin`, `batchTracking.getForAdmin/listUnassignedForAdmin`. |
| Mutation | `batches.create/linkCatalog/unlinkCatalog/archive`, batch tracking assign/unassign/move/updateShipmentStage. |
| Authorization | Batch manage permission; lock and transition guards server-side. |
| Loading | Batch/detail skeleton. |
| Empty State | No batches/no unassigned items. |
| Error State | Past deadline, locked roster, invalid transition. |
| Success State | Customer batch/tracking projection and event-backed notices update. |
| Customer Consequence | Participating customers see batch membership and tracking. |
| Notification Consequence | Batch open/status event may notify the owned customer. |
| Production Verified | NO — real roster/tracking UAT pending. |

## Exceptions

| Field | Contract |
| --- | --- |
| Route | `/admin/exceptions` |
| Mockup | A-05/A-06 operational interpretation |
| Purpose | Review and resolve OOS, defect, and cancellation cases without deleting history. |
| Required Data | Customer/order/item, type, status, reason, resolution, recovery/refund/replacement reference. |
| Primary Action | Start review, select resolution, resolve or reject. |
| Secondary Actions | Queue filter/detail, bounded resolution fields. |
| Allowed Create | Customer request or Admin opening canonical exception. |
| Allowed Edit | Forward-only review/resolution fields before resolve. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Delete item/order, silently refund, rewrite invoice/payment, promise full post-PO refund. |
| Filters | Exception status/type in queue. |
| Search | None beyond queue projection. |
| Upload | None. |
| Detail View | Item, customer, order, resolution and financial consequence. |
| State Machine | `opened → under_review → resolution_selected → resolved/rejected`. |
| Query | `orderExceptions.listForAdmin/listForOrderAdmin/getForAdmin`. |
| Mutation | `open/requestCancellation/startReview/selectResolution/reject/resolve`. |
| Authorization | Customer owns request; Admin/Owner reviews/resolves; financial guards server-side. |
| Loading | Operational loading grammar. |
| Empty State | No active exceptions. |
| Error State | Invalid resolution, amount, state, or policy. |
| Success State | Exception history, invoice adjustment/refund obligation, and customer view update. |
| Customer Consequence | Owned issue status and safe financial/refund/replacement projection. |
| Notification Consequence | Domain resolution may notify recipient; internal notes stay private. |
| Production Verified | NO — no dummy financial exception may be created for QA. |

## Invoices & Deposit

| Field | Contract |
| --- | --- |
| Route | `/admin/invoices`, `/admin/invoices/[invoiceId]`, `/admin/deposits` |
| Mockup | A-07/A-08 |
| Purpose | Create order-derived invoice snapshots, explicitly issue/void safely, and operate append-only deposit consequences. |
| Required Data | Canonical order/customer/item snapshots, integer IDR totals, requirement, allocation, payment projection, ledger. |
| Primary Action | Select relevant order, create draft or Issue invoice from the same queue; open operations detail. |
| Secondary Actions | Deposit credit/allocation/release/reversal; safe void; customer-context links. |
| Allowed Create | Invoice draft from existing order; append-only deposit credit/allocation records. |
| Allowed Edit | Draft requirement before issue only through policy-supported creation; no issued snapshot edits. |
| Allowed Delete/Archive/Void | Void only when settlement/confirmation guards allow; no hard delete. |
| Forbidden Actions | Manual total/price settlement, invoice deletion, rewriting snapshots, deleting ledger/payment history. |
| Filters | Order/customer context via route query; queue projection. |
| Search | Order list uses existing route-level search; no global search. |
| Upload | None on invoice page; payment proof belongs Customer/Payments. |
| Detail View | Invoice lines, requirement, outstanding/payment, allocation and ledger history. |
| State Machine | Invoice `draft → issued → void`; payment `unpaid/payment_submitted/partially_paid/paid`. |
| Query | `invoices.listForAdmin/getForAdmin`, `depositAccounts.getForInvoice`, `depositTransactions.listForInvoice`, allocation queries. |
| Mutation | `invoices.create/issue/voidInvoice`, deposit credit/adjust/reverse, allocation allocate/release/reverse. |
| Authorization | Finance/Admin permission plus customer ownership on customer projection. |
| Loading | Invoice/detail/ledger skeletons. |
| Empty State | No invoices or no deposit history. |
| Error State | Duplicate invoice, invalid transition, settlement guard, integer/amount validation. |
| Success State | Issued invoice appears in customer Tagihan; notification and audit persist. |
| Customer Consequence | Owned invoice snapshot/outstanding/deposit projection updates reactively. |
| Notification Consequence | `invoices.issue` creates owned notification with safe destination. |
| Production Verified | NO — real invoice flow is blocked by external validation/identity/product gates. |

## Payments

| Field | Contract |
| --- | --- |
| Route | `/admin/payments` |
| Mockup | A-08 |
| Purpose | Review customer manual payment confirmations and preserve proof/history. |
| Required Data | Owned invoice, integer amount, payment method/date, private proof, review state/actor. |
| Primary Action | Start review, approve, or reject with reason. |
| Secondary Actions | Filter/history, inspect private proof, open invoice. |
| Allowed Create | Customer submits one pending confirmation per issued invoice. |
| Allowed Edit | Forward review state only. |
| Allowed Delete/Archive/Void | None; rejected/approved history retained. |
| Forbidden Actions | Gateway settlement, approve over outstanding, delete proof/history, edit approved amount. |
| Filters | Review status. |
| Search | None beyond queue projection. |
| Upload | Admin only inspects private proof; customer upload is guarded. |
| Detail View | Confirmation, invoice, amount, proof, review history. |
| State Machine | `submitted → under_review → approved/rejected`. |
| Query | `paymentConfirmations.listPendingForAdmin/listForAdmin/getForAdmin`. |
| Mutation | `startReview/approve/reject`; customer `submit/generateProofUploadUrl`. |
| Authorization | `invoices.read.all/manage`; private proof URL only own/Admin. |
| Loading | Queue skeleton. |
| Empty State | No pending confirmations. |
| Error State | Invalid state, overpayment, unauthorized/private proof error. |
| Success State | Invoice payment projection and customer notification-safe state update. |
| Customer Consequence | Owned payment/outstanding state changes only after approval. |
| Notification Consequence | Payment domain may notify owner; proof URLs/secrets excluded. |
| Production Verified | NO — financial Production mutation is intentionally not fabricated. |

## Refunds

| Field | Contract |
| --- | --- |
| Route | `/admin/refunds` |
| Mockup | A-07/A-08 financial operations interpretation |
| Purpose | Process refund obligations and payout attempts without rewriting payment history. |
| Required Data | Obligation, remaining amount, payout attempts, channel/reference, status. |
| Primary Action | Create payout, start processing, record paid or failed. |
| Secondary Actions | Retry failed/partial payout; inspect source obligation. |
| Allowed Create | Payout attempt within remaining obligation. |
| Allowed Edit | Only valid state transition/reference at processing boundary. |
| Allowed Delete/Archive/Void | None; failed attempts remain retryable history. |
| Forbidden Actions | Customer marks paid, payout above obligation, delete payout/payment history, cash shortcut. |
| Filters | Status summary; queue projection. |
| Search | None beyond queue projection. |
| Upload | None. |
| Detail View | Obligation and payout attempts. |
| State Machine | `pending → processing → paid` or `processing → failed → retry`; partial-safe remaining amount. |
| Query | `refunds.listForAdmin/getForAdmin`. |
| Mutation | `refunds.createPayout/startPayout/recordPayout`. |
| Authorization | Financially authorized Admin/Owner; customer read is owned. |
| Loading | Operational loading grammar. |
| Empty State | No refund obligations. |
| Error State | Over-capacity, invalid transition, failure reason missing. |
| Success State | Remaining/held/paid projection updates atomically and audit remains. |
| Customer Consequence | Owned refund-safe status, never bank credentials. |
| Notification Consequence | Refund domain may notify safe status. |
| Production Verified | NO — no dummy financial obligation/payout is allowed. |

## Users / Access

| Field | Contract |
| --- | --- |
| Route | `/admin/users`, `/admin/catalogs/[catalogId]/access` |
| Mockup | A-01 system controls; latest Secret Catalog Access Management |
| Purpose | Owner-managed staff access and Admin-managed catalog access. |
| Required Data | App user role/status/invitation; catalog code/grant metadata and expiry. |
| Primary Action | Owner invites/claims staff; Admin generates/revokes code or grants/revokes member. |
| Secondary Actions | Filter users, change role, suspend/reactivate, copy one-time code, inspect metadata. |
| Allowed Create | Staff invitation, access code, member grant. |
| Allowed Edit | Role/status only Owner; access metadata through state-safe mutations. |
| Allowed Delete/Archive/Void | Revoke invitation/code/grant; no user/customer delete. |
| Forbidden Actions | Email whitelist authority, client role authority, plaintext secret persistence, arbitrary access. |
| Filters | User role/status; catalog access status in projection. |
| Search | Email/name selectors are route-local. |
| Upload | None. |
| Detail View | User status/invitation and catalog access management. |
| State Machine | Staff pending→claimed/revoked; user active↔suspended; code/grant active→revoked/expired. |
| Query | `users.list/listStaffInvitations`, `catalogAccess.listForAdmin`, eligible customer query. |
| Mutation | `users.inviteStaff/revokeStaffInvitation/updateRole/suspend/reactivate`, access generate/revoke/grant/revoke. |
| Authorization | Owner-only role/status/invitation; `catalog.manage` for catalog access. |
| Loading | User/access skeletons. |
| Empty State | No invitations/grants/codes. |
| Error State | Duplicate email, protected owner, invalid expiry/state. |
| Success State | Next authenticated session/access query reflects change; audit/Inbox where canonical. |
| Customer Consequence | Grant/revoke changes scoped catalog eligibility; staff role changes workspace access. |
| Notification Consequence | Access messages never disclose raw code/digest. |
| Production Verified | NO — Owner/Admin/customer identities and real cross-browser access pending. |

## Activity / Audit

| Field | Contract |
| --- | --- |
| Route | `/admin/audit` |
| Mockup | A-01 latest operational audit decision |
| Purpose | View immutable privileged activity. |
| Required Data | Actor, action, target, timestamp, safe metadata. |
| Primary Action | Read/filter when canonical query supports it. |
| Secondary Actions | Pagination through query cursor. |
| Allowed Create | Only domain mutations append events. |
| Allowed Edit | None. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Redact via UI, edit/delete audit, expose unsafe metadata. |
| Filters | None currently; query-owned pagination. |
| Search | None. |
| Upload | None. |
| Detail View | Immutable table. |
| State Machine | Append-only event history. |
| Query | `auditEvents.list`. |
| Mutation | None from UI; domain mutations call `recordAudit`. |
| Authorization | Owner-only. |
| Loading | Table skeleton. |
| Empty State | No activity yet. |
| Error State | Owner denial/query error. |
| Success State | New audited event appears after reactive mutation. |
| Customer Consequence | None directly. |
| Notification Consequence | None directly; event-backed notices are separate records. |
| Production Verified | NO — authenticated Owner render pending. |

## Reports / Analytics

| Field | Contract |
| --- | --- |
| Route | `/admin/reports` |
| Mockup | A-09 |
| Purpose | Provide minimum real sales, order, batch, and period reporting with export. |
| Required Data | Canonical bounded order/invoice/batch rows and period window. |
| Primary Action | Select period and inspect real recap. |
| Secondary Actions | Search report rows; download Excel-compatible CSV. |
| Allowed Create | Export audit record only; no synthetic analytics rows. |
| Allowed Edit | None. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Fake metrics, unbounded hidden scan, editable report data. |
| Filters | Period filter; report-local row/status search. |
| Search | Customer/order search within loaded report. |
| Upload | None. |
| Detail View | Sales overview, batch performance, recap rows. |
| State Machine | Bounded period query → export snapshot. |
| Query | `reports.get`. |
| Mutation | `reports.recordExport`. |
| Authorization | Admin/Owner report permission. |
| Loading | Report skeleton/empty-safe state. |
| Empty State | Zero-safe metrics and empty tables. |
| Error State | Invalid period/permission/query failure. |
| Success State | Filtered metrics and CSV match the canonical result. |
| Customer Consequence | None directly. |
| Notification Consequence | None. |
| Production Verified | NO — real populated report/export acceptance pending; zero-data safety is local-tested. |

## Content

| Field | Contract |
| --- | --- |
| Route | `/admin/content` |
| Mockup | A-10/A-01 content interpretation |
| Purpose | Edit approved public community, How To Order, and Help copy without code changes. |
| Required Data | Structured content block key, eyebrow, title, body, status. |
| Primary Action | Save draft then publish. |
| Secondary Actions | Switch approved surface. |
| Allowed Create | Content block for approved key. |
| Allowed Edit | Approved text fields. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Arbitrary CMS schema, unapproved blast/automation settings, fake content. |
| Filters | Surface selector. |
| Search | None. |
| Upload | None. |
| Detail View | Current block/status. |
| State Machine | `draft → published`. |
| Query | `contentBlocks.getForAdmin`, public `getPublished`. |
| Mutation | `contentBlocks.upsert/publish`. |
| Authorization | Content manage; Admin/Owner per permission matrix. |
| Loading | Block form loading state. |
| Empty State | No draft for selected approved surface. |
| Error State | Validation/save/publish error. |
| Success State | Draft/status and public projection update after publish. |
| Customer Consequence | Approved public copy changes on customer surfaces. |
| Notification Consequence | None. |
| Production Verified | NO — safe real content edit not authorized. |

## Settings

| Field | Contract |
| --- | --- |
| Route | `/admin/settings` |
| Mockup | A-10 |
| Purpose | Maintain minimum store/contact/payment instructions with explicit operational meaning. |
| Required Data | Store name, manual WhatsApp number, payment instructions. |
| Primary Action | Save settings. |
| Secondary Actions | None beyond visible fields. |
| Allowed Create | First settings record through canonical upsert. |
| Allowed Edit | Approved settings fields only. |
| Allowed Delete/Archive/Void | None. |
| Forbidden Actions | Payment gateway, WhatsApp API blast, credential storage, placeholder toggle controls. |
| Filters | None. |
| Search | None. |
| Upload | None. |
| Detail View | Settings form. |
| State Machine | Versioned/audited settings update. |
| Query | `settings.getForAdmin`; customer-safe `settings.getForCustomer`. |
| Mutation | `settings.update`. |
| Authorization | Owner-only. |
| Loading | Form loading/disabled state. |
| Empty State | Required fields prompt for first setup. |
| Error State | Validation/permission error. |
| Success State | Settings and customer payment instructions update; activity event recorded. |
| Customer Consequence | Customer sees approved payment/contact instructions. |
| Notification Consequence | None; manual WhatsApp handoff remains manual. |
| Production Verified | NO — Owner settings edit pending explicit safe UAT. |

## Audit result

- Required sections classified: `17/17`.
- Required local actions classified: `100%` in this matrix and the mockup/action matrices.
- Required dead controls: `0` found in the audited source-defined surface.
- Intentionally omitted: global search, bulk product/order import, product export,
  gallery, external preview metadata, WhatsApp API automation, payment gateway,
  and advanced analytics; these are excluded or future backlog, not hidden
  required operations.
- Production verification: blocked by canonical Convex Development access and
  missing designated authenticated identities/intentional real product.
