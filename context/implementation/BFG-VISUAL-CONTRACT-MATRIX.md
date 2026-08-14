# BFG Visual Contract Matrix

Reconciled from all ten approved Admin PNGs, all eight Customer PNGs, the official `Logo-1`/Blessy assets, and the
latest explicit notification/Inbox decision. DOM/CSS inspection is not counted as image QA.

| Surface | Route | Visual source | Required hierarchy/control | Implementation | Rendered evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Admin shell | all `/admin/*` | A-01–10 | logo, sidebar groups/icons, active state, header account, notification, Inbox | `SiteShell`, `AdminNav`, `WorkspaceActions` | signed-out gate at 1024/1280/1440; authenticated blocked | PARTIAL |
| Admin dashboard | `/admin` | A-01 | operational attention, badges, quick actions, activity link | real queues + audit route | authenticated image blocked | PARTIAL |
| Book list | `/admin/books` | A-02 | page header, search/filter, table/cards, add/publisher actions | canonical forms/list | authenticated image blocked | PARTIAL |
| Product detail/upload | `/admin/books/[id]` | A-03 | metadata, cover, variants, ISBN, price, status, primary/secondary actions | structured detail + native file upload | authenticated image blocked | PARTIAL |
| Catalog list/detail/access | `/admin/catalogs*` | A-02/03 + latest | Draft create, lifecycle, assignment, access entry, generate/copy/revoke/grant | dedicated detail/access routes | authenticated image blocked | PARTIAL |
| Batch | `/admin/batches*` | A-04 | deadline, roster, status, detail | canonical batch pages | authenticated image blocked | PARTIAL |
| Orders | `/admin/orders*` | A-05 | search/filter/table/detail/manual action | canonical order pages | authenticated image blocked | PARTIAL |
| Customers | `/admin/customers*` | A-06 | search/detail/history/balance | canonical customer pages | authenticated image blocked | PARTIAL |
| Invoice/deposit/payment | finance routes | A-07/08 | queues, proof, status, filters, actions | invoice/payment/deposit pages | authenticated image blocked | PARTIAL |
| Reports | `/admin/reports` | A-09 | period, metrics, batch status, export | real zero-safe report | authenticated image blocked | PARTIAL |
| Settings/content/users/audit | system routes | A-01/10 | operational forms, permissions, activity | dedicated routes | authenticated image blocked | PARTIAL |
| Customer shell | public/account routes | C-01–08 | official logo, desktop/mobile nav, account, notification, Inbox | one `SiteShell`; five-item mobile nav | 375/390/430/768/1440 public/signed-out images | PASS_LOCAL_SIGNED_OUT |
| Home/community/order/help | public routes | customer set | branded cream/green/rust hierarchy, Blessy, CTA flow | official assets + published content | 155-route sweep; representative images inspected | PASS_LOCAL |
| Secret Catalog access | `/catalog` | C-01–03 | back, code form, help, scoped content/action | gateway and safe catalog view | 375/390/430/768/1440 locked state | PASS_LOCAL_LOCKED |
| Ready Stock list | `/ready-stock` | C-04 | title, search/filter, rows/cards, real empty state | canonical projection | corrected loading-state images at five widths | PASS_LOCAL_EMPTY |
| Ready Stock detail | `/ready-stock/[slug]` | C-04 | cover, metadata, variant/price/availability, CTA/back | detail route | route smoke; real product image blocked by data | PARTIAL |
| Orders/batch | `/account/orders*`, `/account/batches*` | C-05/06 | list/detail/back/timeline/status | owned pages | signed-out gates only | PARTIAL |
| Invoice/deposit/account | `/account/invoices*`, `/account/deposit`, `/account` | C-07/08 | balance, proof, history, profile/address/actions | owned pages and reachable cards | signed-out gates only | PARTIAL |

## Rendered QA result

- Full local smoke: 155 route/viewport checks. The capped run produced 152 PASS and three Clerk development-instance
  concurrency timeouts; those exact tests passed sequentially with retries disabled.
- Ready Stock's component loading region is now the screenshot gate; five/five widths rendered the legitimate empty
  state rather than a skeleton.
- Representative 375/390/1440 screenshots were visually inspected against the approved customer hierarchy.
- Authenticated Admin 1024/1280/1440 and populated Customer 375/390/430/1440 comparisons are
  `BLOCKED_BY_EXTERNAL`: no designated QA identities/real records were supplied. No auth bypass or dummy data was used.

The approved mockups define hierarchy, spacing, density, and control placement. Controls lacking a source contract
(bulk import, global search, gallery, external preview) are intentionally omitted and classified in the action matrices;
they are not rendered as dead affordances.
