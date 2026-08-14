# BFG PRD Traceability Matrix

Reconciled against the original PRD/UX/business rules/routes/scope/success pack and latest decisions on 2026-08-14.
The master coverage matrix owns final status; this table records the shortest end-to-end trace for every commercial
scope group.

| PRD Requirement | Canonical Domain | Admin Route | Admin Action | Backend Query/Mutation | State Transition | Customer Projection | Customer Route | Visual Source | Test | Production Acceptance | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foundation/Production | runtime/config | `/admin` | operate empty/populated states | all canonical domains | environment | public/account shells | public/account | all | build + smoke | deployed commit + owner smoke | PARTIAL |
| Authentication/access | Clerk + appUsers | Admin routes | role/status/invite | users/auth helpers | admission/access | own workspace only | `/sign-in`, `/account` | all | RBAC/ownership tests | real Owner/Admin/Customer | PARTIAL |
| Landing/bio-link | content/static | `/admin/content` | draft/publish | contentBlocks | draft→published | public branded pages | `/`, community/order/help | customer references | component/browser | live public responsive | ACTIVE_VERIFIED |
| Ready Stock | books/variants/inventory/orders | books/stock | publish, upload cover, stock | readyStock/books/orders | available/reserved/order | safe list/detail/order | `/ready-stock*` | A-02/03, C-04 | publishing/security tests | real product/order | PARTIAL |
| Join/admission | joinRequests/appUsers/events | join queue | review/approve/reject | join mutations | submitted→resolved | request/admission notice | `/join`, account | A-01 | join/event tests | real request | PARTIAL |
| Book Master | publishers/books/variants/storage | `/admin/books*` | add/edit/status/cover | product mutations | publication | eligible product fields | Ready Stock/catalog | A-02/03, C-02–04 | product/upload tests | real client product | PARTIAL |
| Multi-book Batch PO | batches/catalog links/assignments | `/admin/batches*` | create/deadline/roster/lock | batch mutations | editable→locked | participating batch | `/account/batches*` | A-04–06, C-05/06 | roster/state tests | real roster | PARTIAL |
| Deposit | topups/accounts/ledger | `/admin/deposits` | verify/reject/adjust | deposit mutations | submitted→review→resolved | balance/topups/history | `/account/deposit` | A-06–08, C-07 | atomic ledger/privacy tests | safe real/empty UAT | PARTIAL |
| Invoices/payments | invoices/confirmations/storage | invoice/payment routes | issue/review | invoice/payment mutations | draft→issued/settled; payment review | own invoice/status/proof submit | `/account/invoices*` | A-07/08, C-07 | finance/privacy tests | real or empty Production | PARTIAL |
| Batch tracking | tracking histories | batch detail | advance status | tracking mutations | seven semantic states | one participant timeline | batch/order detail | A-01/04–06, C-05/06 | tracking/notification tests | real status sync | PARTIAL |
| Customer dashboard | owned aggregate domains | customer context | indirect domain changes | own queries | loading/empty/populated | balance/orders/batches/notices | `/account` | C-05–08 | component/browser | populated customer | PARTIAL |
| Secret Catalog/access | catalogs/items/codes/sessions/grants | catalog detail/access | lifecycle, assign, code, grant | catalog/access mutations | catalog/code/session/grant | scoped safe products/order eligibility | `/catalog` | A-02/03, C-01–03 | access/privacy tests | real create→unlock→revoke | PARTIAL |
| Order/invoice recap/export | reports | `/admin/reports` | period/search/export | reports query/export audit | report snapshot | none | n/a | A-09 | query/CSV injection tests | Production download | PARTIAL |
| Customer data/history | profiles/addresses/owned domains | `/admin/customers*` | view customer context | admin queries | current/history | own profile/orders/balance | `/account/*` | A-06, C-08 | ownership tests | populated customer | PARTIAL |
| Multi-Admin/activity | invitations/appUsers/audit | `/admin/users`, `/admin/audit` | invite/role/status/view log | user/audit functions | invitation/access | no private cross-user effect | workspace switch | user/A-01 | Owner denial/audit tests | real invitation claim | PARTIAL |
| Admin analytics | reports | `/admin/reports` | period filter | reports.get | bounded window | none | n/a | A-09 | deterministic zero/populated query | Production populated/zero | PARTIAL |
| Notification/Inbox latest | notifications + domain events | notification/Inbox routes | open/read/work queue | list/count/read + event writes | unread→read | owned notice/message | account notification/Inbox | authenticated shells | ownership/read tests | real Admin and Customer events | PARTIAL |

Explicit exclusions: WhatsApp Business API automation and payment gateway. Advanced analytics, bulk imports, full chat,
global search, and multi-image gallery remain outside the current canonical scope unless a later client decision adds
their missing contracts.
