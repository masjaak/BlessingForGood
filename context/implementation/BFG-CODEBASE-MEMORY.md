# BFG CODEBASE MEMORY

## Post-diff memory — Secret Catalog global access code and form alignment — 2026-08-30

- `src/components/customer-catalog.tsx` owns the Customer discovery workspace:
  Catalog header, Jakarta-derived deadline label, title/ISBN search, current
  Catalog Publisher filter, count/reset/empty states, and the existing variant,
  quantity, detail-link, and order controls. The workspace remounts on Catalog
  ID changes so selections cannot bleed between eligible Catalogs.
- `convex/lib/catalogView.ts` remains the Customer projection owner. It returns
  only the requested Catalog's eligible published/special books plus canonical
  publisher, ISBN, variants, Catalog ETA, and title count. The current
  hundreds-scale ceiling is 500 Catalog items; paginate if that ceiling is
  reached.
- `src/lib/catalog-discovery.ts` is the small shared pure matcher. Customer
  matching is title/ISBN only with trimmed, case-insensitive, hyphen/space-safe
  ISBN comparison. Admin matching adds canonical publisher and author.
- `src/components/admin-catalog-detail.tsx` owns Admin Book Master assignment
  search and current-Catalog tracking search/filter. `convex/catalogItems.ts`
  adds only the canonical publisher/author/book projection fields; existing
  eligibility, `add`, `remove`, Catalog lifecycle, and variant ownership rules
  remain authoritative and unchanged. Tracking counts unique titles while
  preserving variant rows and existing management actions.
- `convex/catalogAccess.ts` remains the single access-code owner. Admin
  `generateCode` uses the existing random/digest/one-time-raw-display flow and
  writes `catalogAccessCodes.scope="global"`; one current global code opens all
  existing eligible open/unexpired Catalogs. `getUnlocked` and
  `listForSession` re-check that eligibility for every private Catalog read.
  Revoke and expiry remain server-side; active member grants are updated for
  the eligible set on redemption.
- `src/components/admin-catalog-access.tsx` owns the simplified Access page:
  one generated-code section plus the unchanged member grant controls. The
  deleted `src/components/admin-catalog-period.tsx` and removed period Admin
  mutations are no longer active product paths. Historical per-Catalog code
  rows, `catalogAccessPeriods`, Catalog links, and valid period sessions remain
  compatibility data; global access does not require them.
- `src/lib/calendar-date.ts` remains the `Asia/Jakarta` date authority and
  `catalogDeadlineLabel` in `src/domain/prototype/logic.ts` derives the
  Customer status copy from the canonical Close Order timestamp. Catalog ETA
  is the new Catalog-level `estimatedArrivalMonth`; Batch ETA remains separate.
- `src/domain/prototype/convex-store.tsx` maps current session summaries into
  the Product context and updates only the selected session Catalog ID. The
  existing customer selector is retained with neutral Secret Catalog copy so
  one global session can open another eligible Catalog without another code.
- `src/components/admin-catalog-detail.tsx` owns the local Catalog settings
  three-column grid (`catalog-settings-grid`); `admin-catalog-access.tsx` owns
  the local access-code and member-form grids. Shared BFG inputs, buttons,
  spacing, breakpoints, and colors remain unchanged.
- Production read-only preflight found one inactive historical access-period
  row, no current `secretCatalogs.accessPeriodId` links in the inspected
  Catalog set, and legacy per-Catalog codes/sessions/grants that must not be
  destructively migrated in this ticket. New global rows are the active path;
  old rows remain compatibility data until normal expiry/revoke behavior.
- Protection coverage: `tests/lib/catalog-discovery.test.ts`,
  `tests/components/customer-catalog.test.tsx`,
  `tests/components/admin-catalog-discoverability.test.tsx`,
  `tests/domain/logic.test.ts`, and `convex/catalog-discovery.test.ts`.
  Global-code coverage includes multi-Catalog eligibility, ineligible Catalog
  denial, wrong-code failure, rotation, revoke, digest-only storage, and a
  Catalog carrying a historical period relation. Admin component coverage
  asserts the period controls are absent and local form owners remain present.
  Full Convex/frontend coverage, TypeScript, ESLint, formatting, build, Convex
  check, diff checks, and the rendered 390/768/1440 form fixture pass locally.
  Production deployment and authenticated Production UAT remain release work
  for this correction.
- No category taxonomy, global search, fuzzy/semantic search, Batch rewrite,
  Ready Stock rewrite, Book Detail rewrite, or order-business change belongs to
  this diff. The category discussion remains backlog.

## Post-diff memory — Admin action and deadline tuning — 2026-08-29

- Confirmed frameless operational Admin mutations are owned by their existing
  `Button` callsites and now use framed `secondary` or `danger` variants. The
  shared Button primitive, callbacks, loading/disabled behavior, permissions,
  navigation links, support/reset controls, and icon controls were not changed.
- `src/lib/calendar-date.ts` is the single date adapter for the relevant
  Catalog/Batch deadline UX and comparison. It uses the existing
  `Asia/Jakarta` display timezone, converts date-only input to that day's end
  timestamp, and leaves existing UTC millisecond storage unchanged.
- `convex/batches.ts:assertBatchCatalogDeadline` remains the sole shared
  Catalog-to-Batch deadline guard. It now compares calendar-date keys while
  preserving unset-deadline behavior and all other Batch, Customer cutoff,
  lifecycle, and authorization rules.
- Focused deadline, date-adapter, and Admin rendered regressions pass. Full
  Convex and frontend Vitest suites pass sequentially (`27/27` files,
  `179/179` tests; `46/46` files, `244/244` tests); TypeScript, ESLint,
  formatting, build, Convex check, and diff checks pass. Commit `a3200dd` is
  deployed through the canonical Vercel Production path; authenticated
  Production UAT remains pending without an authorized session or safe
  fixture.

## Post-diff memory — minor stability tuning — 2026-08-29

- `src/lib/gbp.ts` owns Admin UI GBP pence↔pounds parsing and formatting.
  Storage remains `bookVariants.supplierPriceGbpMinor` as integer pence through
  the existing `convex/schema.ts`, `convex/bookVariants.ts`, and product-domain
  boundaries. No public projection exposes it.
- `convex/secretCatalogs.ts:restore` is the sole `archived → draft` mutation. It
  is permission-checked and audited, patches only lifecycle metadata, and the
  UI owner is `src/components/admin-catalog-detail.tsx` using the existing
  confirmation action pattern.
- The local alignment owner is `.admin-variant-create` in
  `src/app/globals.css`; existing responsive overrides and shared form styles
  remain unchanged.
- Regression owners are `tests/lib/gbp.test.ts`,
  `convex/destructive-actions.test.ts`, `convex/readyStock.test.ts`,
  `tests/components/admin-book-detail.test.tsx`,
  `tests/components/admin-catalog-discoverability.test.tsx`, and
  `tests/lib/excel-export.test.ts`.
- Auth, Ready Stock semantics, Batch lifecycle, Finance, Secret Catalog access,
  SEO/PSEO/GEO, robots, sitemap, and social metadata were not changed. Local
  engineering checks and public Production smoke checks pass; authenticated
  Admin UAT remains pending because no authorized session/fixture was available.

## Post-diff memory — SEO/PSEO/GEO discovery foundation — 2026-08-28

- `src/app/layout.tsx` remains the root owner of the existing BFG metadata and
  social preview foundation. `src/app/robots.ts` is the single robots
  authority; it allows public crawling, disallows private route families, and
  explicitly allows `OAI-SearchBot` to reach public content. Robots is not an
  authorization boundary, and no GPTBot-specific policy was added.
- `src/app/sitemap.ts` is the single sitemap authority. It emits canonical
  `www` URLs for the homepage, useful public informational pages, Ready Stock,
  and currently public Ready Stock book slugs. It excludes auth, account,
  admin, Secret Catalog, transaction, filter, and non-public content. It does
  not emit `lastModified` because the safe public projection has no truthful
  update timestamp.
- `/ready-stock/[slug]` is the only implemented programmatic search dimension:
  it uses the existing anonymous public Ready Stock projection, renders the
  real book in server HTML, emits unique metadata/Product/Breadcrumb data, and
  returns a real 404 for an unknown slug. Author, publisher, and category
  landing pages were not added because the current public route/data contract
  does not yet establish useful pages for them.
- Index policy: homepage, Ready Stock, public Ready Stock book pages,
  community, how-to-order, and help are indexable. Join, Secret Catalog,
  account, admin, auth, and invitation surfaces carry `noindex`; private
  content remains protected by existing authorization. Product structured data
  contains only projected public title, cover, description, variant, price,
  format/ISBN, and stock-derived availability—never reviews, ratings,
  shipping claims, or Secret Catalog fields.
- Focused and full checks pass, including 71 Vitest files / 404 tests,
  TypeScript, ESLint, format, build, Convex check, audit, and diff checks.
  Commit `27267b5a02ab8990cbe527fa3cb0c5369358ac90` is deployed to Vercel
  Production as `dpl_E9QURZTanU7Bo4GjkvjPLwBN333E`; live robots, sitemap,
  public-page, structured-data, and unknown-book 404 checks pass. Search
  Console verification and sitemap submission remain operator steps; actual
  query impressions become the next keyword-priority source.

## Post-diff memory — homepage Open Graph metadata — 2026-08-28

- `src/app/layout.tsx` is the single root metadata owner. It defines the BFG
  title, description, `metadataBase`, homepage canonical, Open Graph website
  fields, and Twitter/X `summary_large_image` fields.
- `public/opengraphimageBFG.png` is the approved static social preview asset;
  it is `1672×941`, `image/png`, and the Open Graph and Twitter/X metadata use
  the same absolute Production URL after Next.js metadata resolution.
- No `opengraph-image` generator, separate Twitter image, route-by-route SEO
  system, Auth/Clerk change, Convex change, or business-domain change belongs
  to this ticket.
- Focused metadata tests and the full deterministic checks pass. Vercel
  Production commit `c8abf1437fa1611fda6e83a77df9ccbc610178c9` emits the
  expected homepage head and serves the approved image with matching SHA-256.

Post-diff map refreshed for the canonical invitation onboarding and final
activation P0 correction on 2026-08-28. This is structural memory, not product
requirement authority.

## Post-diff memory — invitation post-success finalization — 2026-08-28

- `src/components/clerk-invitation-acceptance.tsx` now treats a verified
  current Clerk identity whose Product context is `authenticated/customer` as
  terminal success when the known invitation target matches (or when Clerk
  has already established the same-session completion context). It renders a
  short success state and calls `router.replace("/account")`.
- `activeInvitationRef` is a one-way terminal latch. Late ticket results,
  Clerk resource refreshes, finalization callbacks, Protect/verification
  continuations, and the timeout cannot write mismatch, consumed-ticket, or
  activation-error state after membership is active. The ticket is not
  reprocessed and the existing correlation marker is cleared.
- The existing known-email wrong-account guard and genuine invalid-ticket
  handling remain before activation; no Clerk user deletion, invitation
  writer, Convex membership writer, or second auth/reconciliation path was
  added.
- Focused invitation coverage is `30/30`; full Vitest is `69 files / 398
  tests`, Convex is `29 files / 182 tests`, and TypeScript, ESLint, Format,
  build, audit, Convex check, and diff checks pass. Vercel deployment
  `4H54pzdUnqUtnkrzUeUbz9pNSShQ` for canonical commit
  `2071c369388aa669446b6419d193c9fb7e1bf3cb` is successful on the Production
  alias. The affected public fake-ticket recovery check passes `8/8` at
  375/390/430/768/834/1024/1280/1440; the full unauthenticated public suite
  is `285 passed`, `8` repeated data-limited cover failures, and `7 skipped`.
  Authenticated Production UAT remains an external gate because no authorized
  Customer/mailbox fixture is available in this runtime.

## Post-diff memory — canonical invitation onboarding and final activation

- `convex/joinRequests.ts:approve` never activates a Customer merely because a
  Clerk subject is stored. It always schedules
  `joinRequestInvitations.deliver`; only an authenticated Customer reaching
  `users.ensureCurrentUser` can invoke the canonical admission writer.
- `convex/joinRequestInvitations.ts` reuses a current pending handoff and calls
  Clerk `createInvitation` with `ignoreExisting:true` and the canonical
  `/accept-invitation` redirect. Clerk identity existence is therefore handled
  by the handoff, not by a BFG `sign_in_required` lifecycle. Explicit resend
  remains the only revoke/replace path.
- `convex/joinRequestInvitationState.ts` owns delivery persistence only. The
  removed `markSignInRequired` and `reconcileIdentity` paths were the
  regression-specific router/writer; no second membership writer was added.
- `convex/users.ts` still owns the only `appUsers` admission transaction.
  Current verified email is the admission key; a changed subject is accepted
  only for a current approved reapply against a removed historical tombstone.
  The removed tombstone is reactivated only by authenticated reconciliation of
  the new request, preserving its member code.
- `src/components/clerk-invitation-acceptance.tsx` accepts the Clerk ticket on
  the same BFG route. New tickets use the existing `signUp.ticket` → dynamic
  profile/verification/Protect → finalize path; `__clerk_status=sign_in`
  consumes `signIn.ticket` before rendering the same-route embedded Clerk
  sign-in flow. That embedded sign-in uses hash routing on the non-catch-all
  acceptance page, and successful sign-in returns as `__clerk_status=complete`
  to avoid consuming the invitation ticket twice. The resource that accepts
  the ticket is retained for status inspection and finalization across a Clerk
  hook refresh; a non-complete status selects the same-route embedded sign-in
  continuation, and a pending session task returns to that continuation.
  `complete` only proceeds when the current session, verified email, Convex
  auth, and active Customer state are all present. Different current sessions
  remain guarded.
- The `signUp.ticket` boundary classifies returned Clerk error envelopes and
  rejected Promises through the same existing-identity check. A safe existing
  identity error re-enters the same-route sign-in continuation instead of
  writing the generic activation failure; a successful new ticket still uses
  the current `missing_requirements` → `Lengkapi akun` transition.
- Admin Join Requests, `/join`, and `ProductAccessGuard` now use neutral
  approval/waiting copy. The Admin workspace no longer offers Customer login as
  the primary onboarding action. No Book, Batch, Ready Stock, Finance, Upload,
  Activity, or unrelated button architecture changed.

Local regression coverage includes the exact thrown existing-identity RED, new
identity final activation, existing-identity handoff, completed session,
wrong-session mismatch, explicit resend/idempotency, authenticated
pre-activation, and removed-member reapply. Vercel Production deployment
`GzoR6K7dCHNwFRhnYMkGm1U3q6ZE` is successful on the canonical alias; the
affected public recovery check passes `5/5` at 375, 390, 430, 768, and 1440.
Authenticated UAT remains an external release gate because no authorized
Customer email or mailbox is available; no real identity or invitation
fixture was fabricated.

Post-diff map refreshed for the removed-member Admin projection cleanup on
2026-08-27. This is structural memory, not product requirement authority.

## Post-diff memory — removed-member Admin projection cleanup

- `convex/joinRequests.ts:listForAdmin` owns the default Admin
  `Permintaan bergabung` operational projection and filters `removedAt` at
  the indexed query boundary before the existing bounded `take(200)`.
- `src/app/admin/join-requests/page.tsx` performs search over that returned
  projection, so removed requests cannot reappear through the route-local
  search. `src/app/admin/page.tsx` consumes the same projection for dashboard
  counts.
- `convex/users.ts:findApprovedJoinRequest` remains the separate current
  admission resolver used by authenticated reconciliation. It still excludes
  removed requests and can select a new current approved reapply request.
- No schema, Clerk, membership mutation, historical data, or customer
  business projection changed.

## Post-diff memory — invitation missing-requirements submit — 2026-08-28

- `src/components/clerk-invitation-acceptance.tsx` remains the single BFG
  presentation/orchestration boundary for invitation ticket acceptance. The
  existing Clerk Future `signUp` proxy is refreshed through `signUpRef` and is
  re-read after `password`/`update`; no second signup resource or auth system
  was introduced.
- The submit path now separates Clerk update errors from post-update
  finalization errors. Known Clerk field codes and fields map to safe local
  messages beside the affected control; unknown update failures remain a
  retryable technical form error. `submitting` always resets in `finally`, so
  the same valid ticket can be retried.
- The form renders only Clerk-reported requirements. After a successful
  update it re-reads `status`, `missingFields`, `unverifiedFields`, Protect,
  and `createdSessionId` before choosing another requirement, verification,
  or finalization. Existing finalize → Clerk session → Convex → canonical
  `appUsers` reconciliation is unchanged.
- Safe `bfg_invitation_stage` diagnostics carry correlation ID, submitted
  field names, stage completion, state arrays, and Clerk code/field; they do
  not carry field values. The password control is `type=password` with
  `autocomplete=new-password` and regression coverage asserts no password
  value appears in diagnostics.
- Focused invitation coverage is `16/16`; full Vitest is `69 files / 377
  tests`; TypeScript, ESLint, format, Convex Development check, build, audit,
  and diff checks pass. Local Playwright remains unavailable without a Clerk
  publishable key; legitimate Production invitee UAT is still a release gate.

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

## Post-diff memory — Phase 08 post-closure visual stabilization

Shared blast radius is intentionally small:

| Surface | Shared path | Result |
|---|---|---|
| How To Order | `how-to-order.tsx` + scoped customer CSS | Seven canonical steps keep one data source; desktop uses the connected row and mobile/tablet use the vertical timeline. |
| Homepage journey | `src/app/page.tsx` + scoped customer CSS | `home-journey` gets a narrower inner wrapper; homepage section order and global container stay unchanged. |
| Mengenal BFG | story card CSS token assignment | The primary story heading is forced to the canonical high-contrast light token on the green card; copy/palette are unchanged. |
| Book Cover | `book-cover.tsx`, `cover-upload-field.tsx`, `books.ts`, `schema.ts` | Original storage is preserved; optional presentation metadata is validated, persisted, resettable, and projected through Ready Stock and Secret Catalog/customer renderers. |
| Product Media | existing `bookMedia` path | Gallery remains separate; no gallery ownership or upload flow was changed. |

Expected zero-impact domains: Auth, Orders, Batch, Finance (Invoices,
Payments, Deposit, Refunds), Activity, Admin permissions, and Bulk Import. No
state machine, ownership rule, navigation IA, or operational Admin route was
changed. `Buku Saya` has no BookCover renderer in the current source, so it has
no new cover-renderer blast radius.

## Post-diff memory — Phase 08 final journey icon + homepage process correction

- `src/components/how-to-order.tsx` owns one local `JourneyIcon` component and
  the seven-step semantic mapping. It uses the official Tabler Icons v3.46.0
  outline paths for search, book, send, package, receipt, delivery truck, and
  home-check; no icon dependency was added. The homepage icon-bearing preview
  reuses this same component.
- `src/app/globals.css` keeps the full journey desktop row and mobile/tablet
  timeline, while the homepage `home-journey` is a left-aligned, bounded 860px
  rail with short arrow connectors. At widths up to 900px it becomes a compact
  vertical sequence without cards or full-height dividers.
- Deterministic coverage is in
  `tests/components/how-to-order.test.tsx` and
  `tests/e2e/phase071-surface.spec.ts`; rendered evidence is in
  `artifacts/phase08-journey/`.

This correction's blast radius is limited to How To Order, the homepage
journey, the shared customer journey icon component, responsive CSS, and their
tests. Admin, Auth, Orders, Batch, Finance, Activity, Cover, Gallery, and Bulk
Import paths were not changed.

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

## Post-diff memory — Global Button System Consolidation (2026-08-22)

- `src/components/ui.tsx` is the only application Button visual primitive:
  `Button`, `LinkButton`, `IconButton`, `LinkIconButton`, `ToggleButton`, and
  `ActionGroup`.
- `src/app/globals.css` owns one final semantic Button token block. Customer
  and Admin callers select semantic variants/sizes; they do not own button
  colors, radii, hover rules, or individual button margins.
- Navigation remains anchor/LinkButton semantics. State changes remain native
  Button semantics. The only native `<button>` source implementation is the
  shared primitive itself; BFGSelect, gallery, quantity, close, and back paths
  consume the family.
- Async callsites use `loading`/`loadingLabel`; business mutations and server
  authorization were not changed. Conditional visibility remains role,
  ownership, and state-machine controlled.
- Test-only visual fixture: `tests/components/button-specimen.tsx`; source
  anti-pattern guard: `tests/components/button-system-guard.test.tsx`.
- Full authenticated rendered QA is still a release gate. The representative
  customer-375 run reached the browser but was non-green (16/19) under a
  placeholder Convex deployment, with Clerk/RSC network errors and no real
  production data/session. Do not convert this source-level closure into a
  Production visual-green claim without screenshots.

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
| Product Media | Book Master-owned gallery and HTTPS metadata-only preview implemented; no real-book mutation was needed for this presentation-only fix |
| Bulk Import | unchanged; legitimate Production pilot remains deferred by user |

Historical evidence boundary for that earlier reopen: the supplied real
Production screenshot proved the pre-fix Catalog action rhythm was wrong. That
status is superseded by the later authenticated Book Detail evidence and
External Preview alignment closure recorded below.

## Post-diff Memory — Phase 08 Activity Responsive Closure

Changed application reach:

- `src/components/workspace-actions.tsx`: the shared Admin/Customer Activity
  trigger now uses one viewport geometry helper. On open it measures the
  visual viewport and anchor, shifts left when the right edge would collide,
  caps height to a safe bottom boundary, and recalculates on resize, scroll,
  visual-viewport changes, and anchor/root resize. Escape, outside close, and
  trigger focus return remain in the same component.
- `src/app/globals.css`: Activity panel/content/card tracks now use explicit
  shrinkable columns, `min-width: 0`, `max-width: 100%`, and normal wrapping.
  The previous horizontal clipping rule and unsafe narrow fixed-surface mode
  were removed; vertical panel scrolling remains.
- `tests/components/workspace-actions.test.tsx`: geometry unit coverage checks
  right collision, narrow mobile width/bottom reserve, and upward opening.
- `tests/e2e/activity-responsive.spec.ts`: populated rendered coverage checks
  the full Activity surface at 375, 390, 430, 768, 834, 1024, 1280, and 1440
  widths with long explanation, titles, references, cards, and actions.
- `tests/e2e/clerk-auth.spec.ts`: when the user-controlled Clerk QA session
  exists, the real panel checks containment, card width, Escape, focus return,
  customer logo-only mobile header, bottom nav, and Account → Activity.

Root-cause verdict: the clipped cards were caused by the nested content stack's
intrinsic grid track and missing shrink constraints, amplified by anchor-only
panel positioning and the narrow fixed panel's containing block. `overflow-x:
hidden` had masked the symptom. No Convex schema/function, authorization,
financial, inventory, catalog, Product Media, or Bulk Import path changed.

Blast-radius verdict:

| Reach | Result |
|---|---|
| Admin Activity trigger/panel | changed shared geometry only; feed projection and actions preserved |
| Customer Activity page | unchanged presentation contract; shared feed and shell navigation preserved |
| Notification/Inbox backend | unchanged; separate ownership, unread, read, and destination semantics preserved |
| Customer header/bottom nav | unchanged behavior; authenticated mobile regression added |
| Convex/auth/RBAC/finance/inventory | unchanged |

Memory reindex after this diff: `3403` nodes / `9176` edges, zero skipped
files, and three existing parse-partial files (`src/app/account/orders/page.tsx`,
`src/app/account/page.tsx`, and `src/app/admin/page.tsx`). The repository index
is best-effort; those flagged ranges remain covered by direct source inspection
and the frontend gates.

## Post-diff Memory — Phase 08 Interaction/Form/Journey Stabilization — 2026-08-21

The targeted diff is limited to shared presentation and its consumers:

- `src/components/ui.tsx` and `src/app/globals.css`: shared Button/LinkButton
  variants and default/hover/active/focus-visible/disabled affordance states;
  the existing non-interactive Admin count label no longer presents as a
  button.
- `src/components/bfg-file-picker.tsx`: one accessible custom picker over a
  visually-hidden native input. Cover, Gallery, Deposit, Payment, and Bulk
  Import now share the visible picker language; upload and authorization
  consequences remain in their existing callers.
- `src/components/cover-upload-field.tsx`,
  `src/components/admin-book-detail.tsx`,
  `src/components/admin-bulk-import.tsx`, and the two customer proof-upload
  pages: custom file presentation and the deliberate Gallery media field grid.
- `src/components/bfg-select.tsx`: portal positioning now remeasures after
  render at constrained viewports without changing its collision contract.
- `src/app/globals.css`, `src/components/how-to-order.tsx` consumers, and
  `tests/e2e/phase071-surface.spec.ts`: shared desktop journey rows and mobile
  rhythm; no business sequence, copy, or icon family change.
- Focused component/E2E tests and Playwright projects cover the contract at
  375, 390, 430, 768, 834, 1024, 1280, and 1440px.

Blast-radius verdict: Auth, RBAC, Orders, Batch, Invoice, Deposit, Payment,
Refund, Secret Catalog, Activity data, Human references, Product Media data
contracts, cover metadata, Bulk Import parsing/confirmation, Admin IA, and
customer route behavior were preserved. `rg` confirms visible file-input
markup is owned by the shared picker only. No Convex schema/function change is
part of this pass.

## Post-diff Memory — Phase 08 External Preview Form Alignment — 2026-08-21

Changed application reach is limited to two files:

- `src/components/admin-book-detail.tsx`: the External Preview pair now has
  explicit label, control, and support rows. Existing label text, placeholder,
  HTTPS validation, helper copy, error semantics, and separate save action are
  preserved.
- `src/app/globals.css`: the local pair uses named grid areas on the existing
  two-column form grid and stacks at the existing 900px breakpoint. Both
  controls keep the canonical Admin input height and form-column gap.

Root-cause verdict: the shared `Field` primitive renders `label → hint →
control`, which is valid for its other consumers but misaligned this paired
form. The fix therefore stays local; no invisible helper, empty spacer,
translation, per-field margin, or height override was added.

Blast-radius verdict: the custom BFG file picker, Gallery alt-text/file-picker
pair, cover upload, Product Media backend, Book schema, HTTPS validation,
Auth/RBAC, Orders, Batch, Finance, Activity, Homepage, How To Order, Button
system, and Bulk Import remain unchanged. No Convex source file was touched.

Evidence: local `npm run check` remains green (`241/241` Vitest including
`111/111` Convex); focused media/file-picker checks pass `6/6`; the deployed
Vercel CSS contains the new grid selectors; signed-out `/admin/books` passes
`3/3` at 1024/1280/1440; and the supplied authenticated Production screenshot
is the real Book Detail evidence. The live public suite's eight identical
cover-geometry failures are outside this diff and remain intentionally out of
scope.

## Post-diff memory — Maintenance UAT correction — 2026-08-22

| Domain | Canonical source | Current invariant |
| --- | --- | --- |
| Order → Invoice | `convex/invoices.ts`, `src/app/admin/orders/[orderId]/page.tsx`, `src/app/admin/invoices/page.tsx` | Order detail reads one non-void invoice projection and links the existing Finance mutation flow; no second issue mutation exists. Existing pre-invoice exception financial snapshots remain legal. |
| Invoice references | `convex/lib/invoiceNumbers.ts`, `invoiceReferenceCounters`, `invoices.ts` | New references are server-generated `BFG-INV-YYMMDD-XXXX`; `_id`, snapshots, amounts, state, and relationships do not change. Preview/backfill is bounded, audited, and idempotent. |
| Activity | `convex/lib/notifications.ts`, `convex/notifications.ts`, `src/components/activity-center.tsx` | Notification/Inbox remain separate backend sources; `projectActivity` is one chronological projection carrying `readAt`; unread presentation is shared by Admin and Customer. |
| Action spacing | `src/components/ui.tsx`, `src/app/globals.css` | `ActionGroup` owns related-action gaps, wrapping, support text, and responsive stacking; conditional actions must not add route-local margins. |
| Master Book | `convex/books.ts`, `src/components/admin-book-detail.tsx` | `books.update` is the save/publish server mutation; Save persists without publishing, explicit Publish sets `published`, and feedback remains visible across reactive updates. |
| Ready Stock | `orders.ts`, `readyStock.ts`, `lib/readyStockReservations.ts` | `source=ready_stock`, atomic reservation, release/fulfill consequence, and no Batch assignment. |
| Secret Catalog / Batch | `secretCatalogs.ts`, `catalogItems`, `batches.ts`, `batchTracking.ts`, `catalogView.ts` | Catalogs may contain many Publishers/titles; Batch is multi-Publisher and links only when Catalog close date equals Batch PO deadline; customer projection checks active grant/open Catalog or own assignment. |

Known ceilings remain bounded reads of 200/500/2,000 records already marked in
the source. Production deployment/backfill is not part of this local memory
refresh because the canonical Convex target is not configured.
