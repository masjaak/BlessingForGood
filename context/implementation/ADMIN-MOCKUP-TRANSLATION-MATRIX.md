# Admin Mockup Translation Matrix

Status: `BFG_PHASE_07_1_FINAL_CLOSURE_LOCAL_PRODUCTION_ACCEPTANCE_PENDING`

Visual sources inspected directly:

- `public/mockups/admin/admin dashboard 1.png` through `admin dashboard 10.png`
- `context/implementation/ADMIN-VISUAL-SOURCE-MAP.md`
- `context/implementation/BFG-ADMIN-DESIGN-SYSTEM.md`

The mockups are visual references only. Existing BFG business policies,
Convex queries, permissions, and zero-production-data rules remain authoritative.

The table above is the initial audit snapshot. The current Phase 07.1 delta is
recorded below; authenticated Production comparison remains the final evidence
gate.

| Admin Surface | Route | Local Mockup | Mockup Intent | Current Production Pattern | Difference | Layout Change | Icon Change | Hierarchy Change | Data/Logic Change Required? | Decision | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/admin` | `admin dashboard 1.png` | Attention-first overview with quiet summary context | Operational queue cards split into primary attention and secondary context; no invented analytics | Authenticated rendered comparison remains unavailable | Keep dense content canvas; primary four queues lead and three context counts are quieter | Use one outlined BFG icon grammar in nav/queue accents | Action queues lead; informational counts secondary | NO | Implemented presentation split; validate against authenticated render | P1 | IMPLEMENTED / AUTH-BLOCKED |
| Join Requests | `/admin/join-requests` | `admin dashboard 1.png` | Customer/admission queue with row-level status | Real join-request queue and review controls | Authenticated rendered comparison remains unavailable | Use compact queue/table rhythm where existing markup supports it | Align people/request icons to shared stroke weight | Review state and next action dominate | NO | Validate existing route against mockup after auth | P1 | AUTH-BLOCKED |
| Customers | `/admin/customers`, `[customerId]` | `admin dashboard 6.png` | Customer list plus detail context before action | Real customer list and operational detail projection | Authenticated rendered comparison remains unavailable | Add consistent summary header/detail sections without new fields | Align customer, address, deposit, and order icons | Identity/status/action order follows mockup | NO | Validate existing route against mockup after auth | P1 | AUTH-BLOCKED |
| Books | `/admin/books`, `[bookId]` | `admin dashboard 2.png`, `3.png` | Catalog table and grouped creation/edit form | Book Master table/detail/forms | Authenticated rendered comparison remains unavailable | Improve table header/row density and form grouping | Use coherent book/format/upload icons | Book identity, format, status, action order | NO | Validate existing route against mockup after auth | P1 | AUTH-BLOCKED |
| Catalog | `/admin/catalogs` | `admin dashboard 2.png`, `3.png` | Pre-order catalog management with filters and clear creation action | Secure Secret Catalog cards/forms and code lifecycle | Authenticated rendered comparison remains unavailable | Keep secure code form; use clearer list/filter hierarchy | Catalog/access icons share nav grammar | Create/access/revoke actions separated from informational state | NO | Validate existing route against mockup after auth | P1 | AUTH-BLOCKED |
| Ready Stock | `/admin/ready-stock` | `admin dashboard 2.png` | Stock-aware catalog view | On hand/reserved/available projection | Authenticated rendered comparison remains unavailable | Make inventory summary and table identity clearer | Use box/stock icon consistently | Available is derived and visually subordinate to on-hand/reserved | NO | Validate existing route against mockup after auth | P1 | AUTH-BLOCKED |
| Orders | `/admin/orders`, `[orderId]` | `admin dashboard 5.png`, `6.png` | Dense order queue with progress and detail | Real all-order queue, assisted order, tracking detail | Authenticated rendered comparison remains unavailable | Prioritize record identity, status, progress, and action columns | Align order, timeline, customer, and action icons | Status/action consequence is primary | NO | Validate existing route against mockup after auth | P0 | AUTH-BLOCKED |
| Batch PO | `/admin/batches`, `[batchId]` | `admin dashboard 4.png` | Batch list with expandable/detail operational context | Real batch list/detail and roster controls | Authenticated rendered comparison remains unavailable | Keep dedicated detail page; make summary/detail sections scan-first | Align batch/cargo/lock icons | Shipment stage and lock state lead | NO | Validate existing route against mockup after auth | P0 | AUTH-BLOCKED |
| Invoices | `/admin/invoices`, `[invoiceId]` | `admin dashboard 7.png` | Finance queue, invoice status, deposit history | Real invoice/deposit projections and actions | Authenticated rendered comparison remains unavailable | Use tighter list/summary grouping and money alignment | Align invoice, deposit, allocation icons | Outstanding/status/financial consequence lead | NO | Validate existing route against mockup after auth | P0 | AUTH-BLOCKED |
| Payments | `/admin/payments` | `admin dashboard 8.png` | Verification queue with immediate review actions | Real pending/history payment queue | Authenticated rendered comparison remains unavailable | Keep readable table; bring filters and actions closer to queue | Use payment/proof/review icons consistently | Pending verification is the primary attention queue | NO | Validate existing route against mockup after auth | P0 | AUTH-BLOCKED |
| Exceptions | `/admin/exceptions` | `admin dashboard 5.png`, `6.png` | Operational problem queue and resolution context | Real item-level exception queue/actions | Authenticated rendered comparison remains unavailable | Make exception type/status/consequence scan-first | Align warning/exception/resolve icons | Active unresolved exceptions lead; history secondary | NO | Validate existing route against mockup after auth | P0 | AUTH-BLOCKED |
| Refunds | `/admin/refunds` | `admin dashboard 7.png`, `8.png` | Financial obligation/payout queue | Real refund obligation and payout history | Authenticated rendered comparison remains unavailable | Keep concise empty state; use finance queue treatment when populated | Align refund/payout/status icons | Obligation vs payout status must be distinct | NO | Validate existing route against mockup after auth | P0 | AUTH-BLOCKED |
| Users / Access | `/admin/users` | `admin dashboard 10.png` | Quiet system access management | Owner-only user role/suspension controls | Authenticated rendered comparison remains unavailable | Use quiet system section and clear role/status grouping | Align user/access/suspension icons | Security consequence leads; no customer-style CTA | NO | Validate existing route against mockup after auth | P1 | AUTH-BLOCKED |

## Shared translation rules

- Admin remains desktop-first at 1440px, with 1280px and 1024px usability
  fallback. Customer styles remain scoped under `.customer-shell`.
- Preserve warm neutral canvas, forest green hierarchy, serif workspace titles,
  compact sans-serif data, restrained radii, and table money alignment.
- Do not add charts, reporting, settings, upload automation, exports, fake
  metrics, supplier data, or new backend fields to close visual gaps.
- Empty states stay concise and operational. The mascot is not a dashboard
  decoration and never replaces the state label.
- Admin/customer switching is a workspace action, not a new Admin item in
  customer primary navigation.

## Phase 07.1 visual-system delta

- `BrandLogo` now uses canonical colorful `Logo-1` for both customer and Admin.
- Customer routes share the same `SiteShell` header container, logo geometry,
  and navigation rhythm; route-specific homepage logo offsets were removed.
- `AdminNav` keeps one existing outlined SVG family with a shared icon box,
  stroke, baseline, label gap, active state, and live Join Requests badge.
- Dashboard Join Requests attention uses the same pending-review source as the
  sidebar badge. Zero pending requests hides the badge.
- Ready Stock, Exceptions, and Refunds now share
  `admin-operational-page` / `admin-operational-content`, common
  page-header/content-width/spacing grammar, and compact operational states.
  Ready Stock remains inventory-first, Exceptions queue-first with a native
  disclosure for creation, and Refunds status-first with pending/processing/
  paid/failed context.

Local signed-out smoke and source-level mockup checks pass. The authenticated
Admin rubric (Dashboard, Join Requests, Customers, Books, Catalogs, Ready
Stock, Orders, Batch PO, Exceptions, Invoices, Payments, Refunds, Users) is
`PENDING REAL OWNER SESSION` until the final Production browser pass; no
bypass or dummy business data is acceptable.
