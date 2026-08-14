# BFG Customer Mockup Action Matrix

Reconciled: 2026-08-14. Public/signed-out rendered QA is complete locally; authenticated populated comparison remains
blocked by the absence of a designated Customer QA identity and intentional real product/order records.

| Mockup | Visible Control | Intended Meaning | Route | Component | Query/Mutation | Authorization | Current Status | Production Status | Visual Match | Functional Match | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Access code + enter | Unlock one private catalog | `/catalog` | customer catalog gateway | unlock/getUnlocked | scoped code/session | ACTIVE | old release live | PASS_LOCAL | PASS | real code UAT |
| C-01 | Member login | Account/owned consequences | `/sign-in` | Clerk form | Clerk + `appUsers` | admitted active identity | ACTIVE | live | PASS_LOCAL | PASS | real customer UAT |
| C-01 | Help | Intentional support path | `/help` | public link/page | published content | public | ACTIVE_VERIFIED | live | PASS | PASS | none |
| C-02–08 | Logo/header/primary nav | Consistent customer shell | customer routes | `SiteShell` | none | public/signed-in | ACTIVE | live | PASS_LOCAL | PASS | authenticated populated image QA |
| C-02–08/latest | Notification icon + badge | Owned event attention | `/account/notifications` | `WorkspaceActions`, `ActivityCenter` | list/count/markRead | recipient | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real customer event |
| C-02–08/latest | Inbox icon + badge | Persistent BFG operations | `/account/inbox` | same | list/count/markRead | recipient | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real access message |
| C-02–08 | Cart badge | Old cart | n/a | omitted | none | n/a | SUPERSEDED | absent | DIFFERENT | n/a | structured order submission is canonical |
| C-02 | Ready Stock/Secret Catalog entry | Product discovery | `/ready-stock`, `/catalog` | catalog components | safe queries | public/scoped | ACTIVE | live | PASS_LOCAL | PASS | real product UAT |
| C-02 | Search/category/publisher/format | Ready Stock filters | `/ready-stock` | `ReadyStockCatalog` | `readyStock.list` | public-safe | ACTIVE | live | PASS_LOCAL | PASS | populated data pending |
| C-02/03 | Private product list/detail | Scoped books | `/catalog` | customer catalog | safe catalog view | valid session/grant | ACTIVE | live | PASS_LOCAL | PASS | real assigned product |
| C-03 | Back | Return without dead end | catalog/detail routes | back controls | none | current session | ACTIVE | live | PASS_LOCAL | PASS | none |
| C-03 | Variant/quantity/order | Structured preorder | `/catalog` | order form | `orders.submit` | active member grant/ownership | ACTIVE | live | SOURCE-MAPPED | PASS | real order UAT |
| C-03 | External preview | Publisher preview metadata | n/a | omitted | none | n/a | INTENTIONAL_NON_ACTION | absent | DIFFERENT | n/a | no approved preview URL source/schema |
| C-04 | Cover/media | Product media | Ready Stock detail | `BookCover` | storage projection | public-safe | ACTIVE_LOCAL | upload not deployed | SOURCE-MAPPED | PASS | real cover UAT |
| C-04 | Gallery arrows/thumbnails | Multi-image gallery | n/a | omitted | none | n/a | INTENTIONAL_NON_ACTION | absent | DIFFERENT | n/a | source requires cover handling, not gallery schema |
| C-04 | Order CTA | Ready Stock reservation/order | detail | `ReadyStockOrderAction` | `orders.createReadyStock` | active customer | ACTIVE | live | SOURCE-MAPPED | PASS | real order UAT |
| C-05 | Owned order list/detail/search state | Order history | `/account/orders*` | order pages | own queries | ownership | ACTIVE | live | SOURCE-MAPPED | PASS | populated auth render |
| C-06 | Batch list/detail/timeline/back | Participating batch tracking | `/account/batches*` | batch pages | `batchTracking.listMine/getBatchMine` | ownership | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real roster/status UAT |
| C-06/latest | Batch-open notification | Open assigned batch from badge | notifications→batch detail | activity center | event + tracking | recipient/ownership | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real batch event |
| C-07 | Balance/top-up/proof/history | Deposit operations | `/account/deposit` | deposit page | top-up/account/ledger | ownership | ACTIVE_LOCAL | not deployed | SOURCE-MAPPED | PASS | real safe event or empty state |
| C-07 | Invoice/detail/payment proof | Manual payment | `/account/invoices*` | invoice form | invoice/payment/storage | ownership | ACTIVE_LOCAL | proof not deployed | SOURCE-MAPPED | PASS | real/fixture privacy UAT |
| C-08 | Profile/address/access/account links | Account management | `/account*` | dashboard/profile/address | own queries/mutations | ownership | ACTIVE | live | PASS_LOCAL | PASS | authenticated populated render |
| C-08 | Logout | End session | header account control | Clerk `UserButton` | Clerk | signed in | ACTIVE | live | PROPORTIONAL | PASS | none |
| authenticated mobile | Five-item bottom nav | Canonical mobile IA | customer routes | `CustomerBottomNav` | none | signed-in/public shell | ACTIVE | live | PASS_LOCAL | PASS | preserve |

Required controls: `UNKNOWN=0`, `DEAD_ACTION=0`. Notification/Inbox placement follows the authenticated header; no
floating controls or fake badges are used.
