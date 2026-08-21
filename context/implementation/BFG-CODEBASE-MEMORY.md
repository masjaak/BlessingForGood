# BFG CODEBASE MEMORY

Post-diff map refreshed at HEAD `eca8310` on 2026-08-21. This is structural
memory, not product requirement authority.

## Major Domain Modules

| Domain | Convex modules/tables | Customer/Admin consumers |
|---|---|---|
| Identity/admission | `lib/auth.ts`, `users.ts`, `joinRequests.ts`; `appUsers`, `staffInvitations`, `joinRequests` | `sign-in`, `join`, `account`, Admin Join Requests/Users |
| Product/catalog | `publishers.ts`, `books.ts`, `bookVariants.ts`, `secretCatalogs.ts`, `catalogAccess.ts`; books/variants/catalog tables | Admin Books/Catalogs, customer `/catalog`, Ready Stock |
| Ready Stock | `readyStock.ts`, `lib/readyStockReservations.ts`; inventory/reservations | public Ready Stock, customer order, Admin Ready Stock/Orders |
| Orders | `orders.ts`, `orderFulfillment.ts`; orders/items/status history | customer order/catalog, Admin Orders |
| Batch/tracking | `batches.ts`, `batchTracking.ts`, transition helpers; batches/assignments/history | customer/Admin batch and order detail |
| Finance | `invoices.ts`, `paymentConfirmations.ts`, `depositTopUps.ts`, `depositAccounts.ts`, `depositTransactions.ts`, `invoiceDepositAllocations.ts`, `refunds.ts` | Tagihan, Deposit, Payments, Refunds, Admin finance |
| Exceptions | `orderExceptions.ts`, exception state/views; exception and adjustment tables | customer order detail, Admin Exceptions |
| Attention | `notifications.ts`, `lib/notifications.ts`; `notifications` with `surface=notification/inbox` | Activity, Notifications, Inbox |
| Product media | `books.ts`, `readyStock.ts`, `schema.ts`; `bookMedia` plus Book preview metadata | Admin Book Detail, Ready Stock detail, customer-safe gallery |
| Operations | `reports.ts`, `contentBlocks.ts`, `settings.ts`, `auditEvents`/`lib/audit.ts` | Reports, Content, Settings, Audit |

## Route Consumers

- Shared customer shell: `src/components/site-shell.tsx`.
- Shared Admin shell/navigation: `src/components/admin-layout-shell.tsx`,
  `admin-layout-shell.tsx`, `admin-nav.tsx`, `admin-operational-page.tsx`.
- Customer data/provider bridge: `src/domain/prototype/operations-context.tsx`,
  `convex-store.tsx`, `store.tsx`; the legacy directory name is an adapter
  label, not a browser-local business store.
- Shared surface primitives: `src/components/ui.tsx`, `brand.tsx`,
  `book-cover.tsx`, skeleton components, `workspace-actions.tsx`.

The route-to-source classification is authoritative in
`BFG-ROUTE-INVENTORY-V2.md`; the route tree contains no unclassified required
route and no hidden URL dependency for the active baseline.

## Canonical Server Permission Helpers

`convex/lib/auth.ts` provides `requireIdentity`, `findCurrentUser`,
`requireCurrentUser`, `requireActiveUser`, `requirePermission`,
`requireAdminOrOwner`, `requireOwner`, `requireOwnedResource`, and
`hasPermission`. Domain mutations additionally guard target ownership, state,
financial relation, file metadata, catalog scope, and active customer status.

## Customer Projections

Customer-safe queries include owned orders/order detail, invoice/payment proof
status, deposit account/ledger/allocation, batches/tracking, exceptions,
refunds, profile/addresses, notifications/Inbox, catalog access projections,
public Ready Stock, and published content/settings. Admin query variants are
separate and never substitute for ownership filtering.

## Admin APIs and Reachability

Admin routes consume canonical queries/mutations for Books, Catalogs/Access,
Ready Stock, Join Requests, Orders, Batches/Tracking, Customers, Invoices,
Payments, Deposits, Exceptions, Refunds, Reports, Content, Notifications,
Inbox, Users, Audit, and Owner Settings. Natural navigation is mapped in the
route and action matrices.

## Centralized State Transitions

- `lib/shipmentTransitions.ts` — six-stage batch shipment.
- `lib/fulfillmentTransitions.ts` — five-stage order fulfillment.
- `lib/cancellationEligibility.ts` — cancellation decision boundary.
- `lib/orderExceptionState.ts` — blocked/fulfillable quantity and resolution.
- `lib/readyStockReservations.ts` — atomic reservation/release/consume.
- `lib/depositLedger.ts` and `lib/invoiceCalculations.ts` — financial deltas.
- `lib/catalogView.ts` and access/session helpers — scoped catalog projection.

## Competing Implementations

- The `src/domain/prototype` name and pure helpers are retained for the current
  adapter boundary and labels/types. Active business persistence is Convex;
  no browser-local prototype store is a product authority.
- `convex/prototypeSessions.ts` and `prototypeSessions` schema table are
  isolated legacy test support. Active Preview does not read or write them.
- The current Convex facade and newer direct route mutations coexist where the
  compatibility adapter is useful; the canonical backend functions and schema
  remain one business pipeline. Do not delete compatibility code without
  caller/reachability proof.

## Legacy Symbols / Orphans

- `prototypeSessions`: `LEGACY_TEST_SUPPORT`, not reachable from active app
  routes.
- `/sign-up`: `DEPRECATED_PUBLIC_SIGNUP`, but invitation completion remains an
  intentional supported path.
- Conceptual `/admin/import`: `DEFERRED`, no active CTA or mutation.
- Old My Bookshelf/legacy logo names in mockup source: visual history only.

No required active feature is backend-only without an identified route, and no
active visible action is a known dead action under the current action audit.

## Historical Reports That No Longer Describe HEAD

Earlier reports with 166/166 or lower counts, old deployment IDs, blocked
authenticated UAT labels, old role/Secret Catalog models, or “Phase 07.1
active” headings remain historical evidence. They are superseded by the
current project-status anchor, Source of Truth, decision log, and baseline
matrix; they are not rewritten.

## Post-diff Memory — Phase 07.1 Responsive/Media Closure

Changed application reach:

- `site-shell.tsx`: CustomerShell/AdminShell now mount one shared
  `WorkspaceActivityProvider`; CustomerBottomNav consumes the same unread
  counts and renders the Akun dot. Mobile header actions are hidden by the
  shared customer breakpoint; desktop action structure is unchanged.
- `workspace-actions.tsx`: existing notification and Inbox unread queries are
  lifted into the provider; ActivityPopover keeps the existing workspace
  presentation and routes.
- `account/page.tsx`: account navigation now exposes Notifikasi and Kotak Masuk
  beside Profile/Addresses through the existing customer-safe routes.
- `admin-book-detail.tsx` → `cover-upload-field.tsx`: Book Master keeps the
  existing upload URL/storage/attach mutations; only file presentation,
  preview, validation feedback, and section hierarchy changed.
- `globals.css`: shared customer header/bottom-nav, Admin header compact mode,
  account activity rows, and CoverUploadField responsive primitives changed.

Blast-radius verdict:

| Reach | Result |
|---|---|
| CustomerHeader/SiteShell | changed; all customer shells consume the provider |
| Account / BottomNav / Activity | changed; same canonical unread queries, no duplicate path |
| AdminHeader | responsive CSS only; same Activity/UserButton/backend |
| Book Detail / CoverUpload | changed presentation and local validation only |
| Convex schema/functions | unchanged |
| Auth/RBAC | unchanged |
| Financial/inventory/Secret Catalog | unchanged |
| Customer product projection | unchanged backend; existing cover projection preserved |

Codebase Memory reindex after the diff: `3015` nodes / `8090` edges, zero
skipped files. `src/app/account/page.tsx` retains a best-effort parse-partial
warning in the index; the flagged source ranges were read directly and are
covered by the full frontend test and build gates. Pre-existing/untracked
`artifacts/visual-convergence` screenshots were preserved.

## Post-diff Memory — Phase 08 Spacing / Product Media Source Contract

Changed application reach:

- `src/app/globals.css`: shared Admin summary-to-action separation now uses
  `--space-divider-to-actions`; the Customer Homepage Journey and four major
  chapter sections use responsive semantic rhythm tokens. No route-specific
  action margin, component API, or business mutation changed.
- `tests/e2e/phase071-surface.spec.ts`: one rendered geometry regression covers
  Homepage chapter padding, locked section order, non-overlap, and page-level
  horizontal overflow at the six supported customer widths.
- Product Media changes are context-only: the source contract and traceability
  matrix document the two material decisions that block schema, storage,
  projection, and UI implementation.

Blast-radius verdict:

| Reach | Result |
|---|---|
| Admin action regions | shared CSS spacing only; representative production surfaces require authenticated recheck |
| Customer Homepage | shared Homepage CSS only; locked content/order and shell navigation preserved |
| Book media / storage | unchanged; Product Media remains unimplemented pending source decisions |
| Catalog / Ready Stock / Secret Catalog projections | unchanged |
| Auth/RBAC | unchanged |
| Finance / inventory / state machines | unchanged |
| Bulk Import | unchanged; Production pilot remains deferred by user |

Codebase Memory post-diff conclusion: no unexpected backend, authorization,
financial, inventory, Secret Catalog, or Bulk Import blast radius was found.

## Post-diff Memory — Phase 08 Real UAT Reopen / Admin Action Rhythm

Changed application reach:

- `src/app/globals.css`: added three semantic Admin spacing roles derived from
  the existing scale: content-to-actions 24px, action-stack 12px, and
  action-support 12px. The rules are scoped under `.admin-shell`; no base
  spacing variable or Customer Homepage rhythm changed.
- `src/app/admin/catalogs/page.tsx`: primary/danger Catalog actions now share
  one action region and stacked grammar. Draft/closed/archived helper copy is
  explicitly supporting copy. The intrinsic left creation frame was not
  touched.
- `src/app/admin/batches/[batchId]/page.tsx` and
  `src/app/admin/invoices/[invoiceId]/page.tsx`: existing operational action
  groups now carry their helper/status copy through the same semantic region.
- `src/app/admin/page.tsx` and `src/components/admin-bulk-import.tsx`:
  existing queue/import explanations are grouped with their actions without
  changing domain behavior.
- `tests/components/admin-catalog-discoverability.test.tsx` and
  `tests/components/bfg-select.test.tsx`: focused regressions cover Catalog
  action composition and genuine lower-viewport dropdown collision.

Blast-radius verdict:

| Reach | Result |
|---|---|
| Admin action regions | changed only at shared CSS plus five existing compositions; authenticated rendered verification still required |
| Catalog left frame | unchanged and explicitly frozen |
| Customer Homepage | unchanged; no shared base or Homepage token changed |
| Settings | unchanged; existing consumed fields and persistence preserved |
| BFGSelect algorithm | unchanged; only a collision regression was added |
| Admin navigation | unchanged; one existing scroll source preserved |
| Convex schema/functions | additive Activity projection and Book Media changes; deployed through canonical Production hook |
| Auth/RBAC | unchanged |
| Financial/inventory/Secret Catalog state machines | unchanged |
| Product Media | Book Master-owned gallery and HTTPS metadata-only preview implemented; real-book UAT pending |
| Bulk Import | unchanged; legitimate Production pilot remains deferred by user |

Current evidence boundary: the supplied real Production screenshot proved the
pre-fix Catalog action rhythm was wrong. The public post-fix Production render
is green; authenticated private-flow render and real-business UAT remain
`BLOCKED_EXTERNAL`, not green.
