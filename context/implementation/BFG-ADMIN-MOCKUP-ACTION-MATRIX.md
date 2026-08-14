# BFG Admin Mockup Action Matrix

Reconciled: 2026-08-14
Production status: new Phase 07.1 build not yet deployed. Authenticated image comparison is `BLOCKED_BY_EXTERNAL` because
no designated Owner/Admin browser identity is configured.

| Mockup | Visible Control | Intended Meaning | Route | Component | Query/Mutation | Authorization | Current Status | Production Status | Visual Match | Functional Match | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-01–10 | Sidebar/logo/icons/active state | Reach every operation | `/admin/*` | `AdminNav`, `SiteShell` | route-specific | Admin/Owner; Owner system links | ACTIVE_LOCAL | pending deploy | SOURCE-MAPPED | PASS | authenticated rendered compare pending |
| A-01–10 | Notification bell + badge | Event attention | `/admin/notifications` | `WorkspaceActions`, `ActivityCenter` | list/count/markRead | recipient | ACTIVE_LOCAL | absent old release | SOURCE-MAPPED | PASS | real event UAT |
| A-01–10 | Inbox button + badge | Persistent operational submissions | `/admin/inbox` | same | list/count/markRead | recipient | ACTIVE_LOCAL | absent old release | SOURCE-MAPPED | PASS | real Join Inbox UAT |
| A-01–10 | Account/workspace controls | Identity and customer-side switch | header | Clerk `UserButton`, links | Clerk | signed in | ACTIVE | old release live | PARTIAL | PASS | authenticated fidelity only |
| A-01–10 | Global search | Cross-domain search | n/a | intentionally omitted | n/a | n/a | INTENTIONAL_NON_ACTION | n/a | DIFFERENT | n/a | no approved global result/security contract; route search is canonical |
| A-01 | KPI/attention cards | Real queues | `/admin` | dashboard | canonical queue queries | Admin/Owner | ACTIVE | old release live | SOURCE-MAPPED | PASS | populated render pending |
| A-01 | Latest activity / See all | Immutable audit history | `/admin/audit` | audit page | `auditEvents.listForOwner` | Owner | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real Owner render |
| A-01 | Quick actions | Books/catalog/batch/invoice | domain routes | dashboard links | existing mutations | permission-specific | ACTIVE | old release live | SOURCE-MAPPED | PASS | none found |
| A-02 | Add/edit/search/filter book | Book Master operations | `/admin/books*` | `AdminBooks`, detail | books/publishers/variants | `books.manage` | ACTIVE | old release partial | SOURCE-MAPPED | PASS | real product UAT |
| A-02 | Publisher maintenance | Create/rename/activate | `/admin/books` | publisher form/list | publisher mutations | `books.manage` | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real operator UAT |
| A-02 | Import Data | Bulk import | n/a | intentionally omitted | none | n/a | INTENTIONAL_NON_ACTION | n/a | DIFFERENT | n/a | mapping/rollback policy not approved; single-product flow required now |
| A-02 | Product export | Product spreadsheet | n/a | intentionally omitted | none | n/a | INTENTIONAL_NON_ACTION | n/a | DIFFERENT | n/a | source scope requires order/invoice/batch export, not product dump |
| A-03 | Metadata/variant/ISBN/price/status | Product configuration | `/admin/books/[id]` | `AdminBookDetail` | create/update | `books.manage` | ACTIVE | old release live | SOURCE-MAPPED | PASS | real pilot |
| A-03 | Cover upload/replace | Durable media | same | native file picker | upload URL/attach | `books.manage`; trusted MIME/size | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real file UAT |
| A-04 | Create batch + deadline | Start PO batch | `/admin/batches` | batch form | `batches.create` | `batches.manage` | ACTIVE_LOCAL | deadline not live | SOURCE-MAPPED | PASS | real batch UAT |
| A-04 | Batch detail/roster/lock | Assign/change/add and lock | `/admin/batches/[id]` | detail | batch tracking/roster | batch permission | ACTIVE | old release live | SOURCE-MAPPED | PASS | populated render |
| A-04/A-09 | Batch filter/recap/export | Period operations | `/admin/reports` | reports | `reports.get/recordExport` | Admin | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | Production download |
| A-05 | Order search/status filter | Operate order queue | `/admin/orders` | order page | admin list | order permission | ACTIVE_LOCAL | old partial | SOURCE-MAPPED | PASS | populated render |
| A-05 | Upload Excel/mapping | Bulk order import | n/a | intentionally omitted | none | n/a | INTENTIONAL_NON_ACTION | n/a | DIFFERENT | n/a | no approved schema/rollback/duplicate contract |
| A-05 | Add manual order | Assisted order | `/admin/orders` | assisted form | `orders.createAssisted` | order manage | ACTIVE | old release live | SOURCE-MAPPED | PASS | real operator UAT |
| A-05 | Detail/status/tracking | Operate fulfillment | order/batch detail | pages | state mutations | scoped Admin | ACTIVE | old release live | SOURCE-MAPPED | PASS | real sync UAT |
| A-06 | Customer search/detail/history/balance | Customer operations | `/admin/customers*` | customer pages | canonical admin queries | Admin | ACTIVE | old release live | SOURCE-MAPPED | PASS | populated render |
| A-06 | Send/grant catalog access | Manual secure handoff | catalog access route | `AdminCatalogAccess` | generate/grant | `catalog.manage` | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real copy/grant UAT |
| A-07/08 | Invoice/payment filters and review | Manual finance | invoice/payment routes | existing pages | invoice/payment mutations | finance permissions | ACTIVE | old release live | SOURCE-MAPPED | PASS | real safe flow/empty UAT |
| A-07/08 | Durable proof link | Inspect private proof | `/admin/payments`, `/admin/deposits` | external safe storage link | storage URL | finance permissions | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | Production proof privacy |
| A-07/08 | Deposit top-up verify/reject/adjust | Deposit operations | `/admin/deposits` | deposit page | top-up/ledger mutations | deposit permission | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real/empty UAT |
| A-07 | WhatsApp blast | Automated outbound blast | n/a | omitted | none | n/a | EXCLUDED | absent | n/a | n/a | explicit exclusion |
| A-08/A-10 | Payment/store settings | Critical first-run config | `/admin/settings` | settings form | settings query/update | Owner | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real Owner edit |
| A-09 | Period/search/export | Operational report | `/admin/reports` | reports | report query/audit export | Admin | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | Production download |
| A-09 | Sales/batch metrics | Minimum real analytics | same | metric cards/batch statuses | `reports.get` | Admin | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | populated correctness |
| A-10 | Content draft/publish | No-code public content | `/admin/content` | content forms | content mutations | `content.manage` | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real publish UAT |
| Access | Create/edit/open/close/assign/remove | Catalog operations | `/admin/catalogs/[id]` | `AdminCatalogDetail` | catalog/item mutations | `catalog.manage` | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real catalog UAT |
| Access | Generate/copy/revoke/expiry/history | Code lifecycle | `/admin/catalogs/[id]/access` | `AdminCatalogAccess` | access query/mutations | `catalog.manage` | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real one-time secret flow |
| Access | Member grant/revoke | Customer-scoped access | same | customer picker/grant list | grant/revoke | `catalog.manage` | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real member UAT |
| Users | Invite/roles/status | Multi-Admin controls | `/admin/users` | users page | invitations/user mutations | Owner | ACTIVE_LOCAL | not deployed | PROPORTIONAL | PASS | real invitation claim |

Required visible controls: `UNKNOWN=0`, `DEAD_ACTION=0`. Controls not backed by the source contract are explicitly
`INTENTIONAL_NON_ACTION`; they are not rendered as dead buttons.
