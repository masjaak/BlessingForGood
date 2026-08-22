---
title: Project Changelog
status: approved
owner: MasJak
last_updated: 2026-08-22
source: conversation
---

# Changelog

## [global-button-system-consolidation] — 2026-08-22

### Changed

- Consolidated `Button`, `LinkButton`, `IconButton`, `LinkIconButton`,
  `ToggleButton`, and `ActionGroup` into one customer/Admin interaction family.
- Replaced `quiet` with semantic `tertiary`, locked 40/44/48px sizes, visible
  sage Secondary treatment, danger states, focus/loading/disabled geometry, and
  shared action spacing.
- Migrated current-tree navigation links, icon controls, disclosure styling,
  upload controls, and async callsites without changing server/business logic.
- Added `BFG-BUTTON-SYSTEM.md`, `BFG-BUTTON-AUDIT.md`, a test-only specimen, and
  a source guard for raw/button-like anti-patterns.

### QA boundary

- Component/source QA is covered. A representative customer-375 Playwright
  run reached the browser but remained non-green (16/19) because the local
  run used a placeholder Convex deployment and Clerk/RSC network requests;
  authenticated Admin/Customer and Production screenshots remain a release
  gate. No Production or Convex deployment was made.

## [phase-07.1-responsive-cover-closure] — 2026-08-15

### Changed

- Locked the customer mobile header to the canonical logo-only treatment and
  kept the five-link bottom navigation as the activity entry point.
- Added the shared unread-count provider, Akun Activity rows for Notifikasi and
  Kotak Masuk, and a subtle data-backed Akun indicator without changing the
  Notification/Inbox backend model.
- Kept Customer/Admin desktop Activity and avatar controls in the shared
  header grammar, with a compact Admin Activity treatment at supported 1024px.
- Replaced the visible browser file control on Book Master with reusable
  `CoverUploadField` presentation, real cover preview, selected filename,
  validation, loading, success, and error states. Existing Convex storage and
  attach consequences remain unchanged.
- Refined Book Detail into Informasi Buku, Cover Buku, Deskripsi, and
  Variant/ISBN/Harga sections without changing domain logic.

### QA

- Vitest: 194/194; Convex: 94/94; Playwright: 180/180; TypeScript, ESLint,
  format, and build pass. The exact 1280px Customer matrix is green locally
  and on Production (20/20 each). Vercel Production canonical aliases are
  READY; the volatile delivery ID is recorded in the closure report.
- Authenticated Production recheck and real cover/product UAT are
  `BLOCKED_EXTERNAL`/`BLOCKED_BY_DATA` in this environment because no
  authorized Clerk session or intentional client product was supplied. No
  Production business data was created.

## [phase-07.1-baseline-reconciled-agent-system-v2] — 2026-08-15

### Changed

- Reconciled the original PRD, UX flows, business/security/financial policies,
  routes, scope, mockups, brand assets, current code, and supplied Production
  baseline into `context/SOURCE_OF_TRUTH.md`.
- Added the permanent decision register and V2 traceability, consequence,
  state-machine, security, financial, visual, sync, mockup, and Phase 08 gate
  artifacts under `context/implementation/`.
- Updated the current project-status anchor without rewriting historical
  reports.

### QA

- Current baseline: Vitest 189/189, Convex 94/94, Playwright 160/160;
  TypeScript, ESLint, format, and build pass.
- No Phase 08 feature was implemented and no Production business data was
  created by this reconciliation.

## [phase-07.1-operational-completeness] — 2026-08-14

### Changed

- Added direct Admin invoice draft/issue actions and contextual customer
  invoice/deposit links using the existing canonical operations.
- Added selected-cover preview before durable Book Master save/replace.
- Standardized Admin sidebar icon wrappers and optical row alignment.
- Added the complete page-by-page Admin operational matrix and updated action,
  visual, sync, and QA traceability records.

### QA

- Local regression tests cover invoice create-and-issue, cover preview, and
  Admin navigation icon geometry.
- Convex CLI canonical Development validation remains blocked by missing access
  to `content-snake-214`; no Production deployment or business data mutation
  was performed.

## [phase-07.1-admin-security] — 2026-08-13

### Security

- Added an explicit Admin route/query/mutation authorization inventory and
  direct backend bypass tests for signed-out, missing, suspended, customer,
  Admin, and Owner identities.
- Reused one client role policy across route guards and route-aware data
  providers so Admin/Owner can use customer surfaces without mounting Admin
  operational payloads outside `/admin`.
- Composed Admin permissions from the existing customer permission set while
  preserving Owner-only user/access operations and all Admin server guards.

### Preserved

- Clerk remains the only identity provider. Clerk Organizations, alternate
  Admin login, email whitelists, schema changes, dummy Production data, Secret
  Catalog coupling, and business/financial policy changes were not added.
- Production authentication acceptance remains blocked at the Clerk
  Production → Convex-compatible token boundary.

### QA

- Full Vitest projects: 133/133; frontend project: 60/60; standalone Convex:
  77/77; Playwright public/customer and signed-out Admin: 114/114.
- Format, ESLint, TypeScript, production build, and diff check pass.
- Authenticated Production role and same-session acceptance remains blocked by
  the external Clerk Production → Convex token configuration.

## [homepage-v4.1.3] — 2026-08-12

### Changed

- Rebalanced the homepage above the fold around the approved hero message,
  early Ready Stock/Secret Catalog actions, and a compact responsive journey
  stepper.
- Optically centered the visible homepage `Logo-1` artwork while keeping the
  complete official logo contained and unclipped.
- Removed the large dark-green journey card without changing its three current
  product moments or any route behavior.

### Preserved

- Customer routes, bottom navigation, Clerk/Convex contracts, Secret Catalog
  security, Ready Stock ordering, financial logic, and Phase 07 Admin remain
  unchanged.

## [phase-07] — 2026-08-12

### Added

- Applied the targeted Customer Visual V4.1.1 patch with the approved local
  multicolor `Logo-1`, contained production-safe rendering, framed mobile
  `Masuk`, and a shared illustrated How To Order system for the homepage and
  `/how-to-order`.
- Added the desktop-first Admin operations workspace with grouped navigation,
  attention-led dashboard styling, shared status/table density, and the
  permission-checked `/admin/ready-stock` inventory projection.
- Added Admin action coverage, visual source mapping, design-system, and Phase
  07 QA documentation.

### Preserved

- Phase 06.7 business policies, canonical Convex data contracts, RBAC,
  ownership, Secret Catalog security, reservation atomicity, financial history,
  append-only deposit ledger, and customer consequences.
- No production business data, Preview delivery, analytics, reporting, CMS,
  settings platform, notification platform, or payment gateway was added.

### QA

- Local: Vitest 108/108; Convex 72/72; customer Playwright 75/75; signed-out
  Admin Playwright 39/39; TypeScript/build/lint/format/diff check PASS.
- Production: safe customer and signed-out Admin smoke 114/114 on the final
  `www.blessingforgood.com` alias. Production deployment is Ready.

## [phase-06.7] — 2026-08-12

### Added

- Closed the canonical BFG business policy in
  `context/policies/BFG-BUSINESS-POLICY-V1.md` and its final decision matrix.
- Added Ready Stock canonical order creation with atomic inventory reservation,
  idempotent release, and fulfillment consumption.
- Added explicit post-PO recoverable cancellation value and defect replacement
  resolution records.
- Added separate refund obligations and auditable payout attempts with partial
  settlement, failure, retry, and authorization boundaries.
- Added deposit refund requests using unallocated available deposit and
  append-only ledger consequences.
- Added Phase 06.7 isolated operational QA coverage.

### Preserved

- Original order, invoice, payment, exception, and deposit history remains
  immutable; Join requests remain retained; no dummy production data was added.
- Customer Visual V4.1, Phase 06.6 loading, and the shared Convex architecture
  remain unchanged except for required policy states.

### QA

- Local policy gate: Vitest 107/107, Convex 71/71, Playwright 108/108 plus
  `/admin/refunds` route checks, TypeScript/build/lint/format PASS.
- Production smoke: customer 75/75 across five responsive widths and
  signed-out admin 36/36 across three protected-route widths.

### Deferred

- Full Admin visual redesign and reporting, Excel export, analytics, CMS,
  settings, notification platform, and payment gateway remain outside Phase
  06.7.

## [homepage-join-v3] — 2026-08-12

### Changed

- Added the mobile-first BFG homepage story, numbered Quick Paths, concise
  How to Order journey, and Join Blessfriends CTA using the existing shell,
  official logo, and Blessy mascot.
- Extended canonical `joinRequests` with required area and primary book
  interest, Indonesian phone normalization, and post-persistence WhatsApp
  continuation configuration.
- Enforced invite-only admission across Clerk presentation, the public
  `/sign-up` route, and Convex `appUsers` provisioning.
- Added safe BFG Back controls, generated/hashed/revocable Secret Catalog
  codes, and server-side failed-attempt tracking without changing financial
  or order domains.

### QA

- Vitest: 98/98 PASS; Convex: 63/63 PASS; lint and TypeScript PASS.
- Production live QA remains blocked until the canonical Clerk/Convex/Vercel
  environment chain is verified without using dummy business data.

## [production-ui-alignment-v1] — 2026-08-11

### Changed

- Forward-merged the current integrated Production V1 product into a hotfix
  branch created from remote `main`; no rollback or old UX-branch merge.
- Restored the official logo/mascot scale, cream/botanical palette, editorial
  customer hierarchy, compact admin shell, responsive navigation, branded
  empty/loading states, and Indonesian product/operational copy.
- Preserved all Phase 01–06.4, dashboard/history, admin customer, authorization,
  ownership, and financial behavior.

### QA

- Added viewport-aware navigation, official-logo, prohibited-copy, overflow,
  protected-route, console, and page-error checks at customer widths 375, 390,
  430, 768, 1440 and admin widths 1024, 1280, 1440.
- `npm run check`: 92/92 Vitest, formatting/lint/typecheck/build PASS.
- `npm run convex:test`: 61/61 PASS.
- Optimized-build responsive route smoke: 108/108 PASS.
- Authenticated customer/admin screenshot acceptance remains blocked by the
  local Clerk instance mismatch and unavailable canonical Convex provisioning.

## [production-v1-convergence] — 2026-08-11

### Changed

- Replaced the Preview/prototype runtime boundary with a Convex-first product
  provider and fail-closed missing-configuration state.
- Removed browser-local business persistence, prototype mode flags/banner/copy,
  local role simulation, and the dead local invoice path.
- Aligned public, customer, and admin shells to the official BFG logo, mascot,
  warm cream/deep green palette, editorial customer typography, and denser admin
  hierarchy from the supplied mockups.
- Reworked public and customer copy to Indonesian-first product language.

### Added

- Added `/account` with needs-attention, active order, invoice/payment, deposit,
  active exception, refund-obligation, and bounded customer-safe activity views.
- Added `/admin/customers` and customer detail using existing server-authorized
  customer/profile/address/order/invoice/exception sources.
- Added an actionable admin operational home and shared dashboard/empty-state
  patterns.
- Added mockup coverage, Production V1 convergence decisions, updated PRD/route
  matrices, and production presentation/runtime guards.

### Preserved

- All Phase 01–06.4 Clerk, RBAC, ownership, catalog, Ready Stock, order, batch,
  tracking, invoice, deposit, payment, exception, profile, address, audit, and
  financial-history invariants.
- Refund obligations remain separate from payout execution. No approved payment,
  invoice snapshot, allocation history, or deposit ledger entry is erased.

### Release boundary

- Deterministic QA passes: 92/92 Vitest, 61/61 Convex tests, zero lint warnings,
  TypeScript/build PASS, and 93/93 responsive Playwright route checks.
- `main` and Production remain untouched. Release is blocked because the linked
  Vercel project has zero Production environment variables; Production Clerk,
  domain, and canonical Convex Production configuration must be added first.

## [phase-06.4-order-exceptions] — 2026-08-11

### Added

- Added item-level `orderExceptions` for OOS, defects, customer cancellation
  requests, and admin cancellation with forward-only review/resolution history.
- Added `/admin/exceptions`, admin order-detail exception context, and
  customer-safe order exception history with server-gated cancellation requests.
- Added partial-quantity blocking, batch-lock/fulfillment guards, audit events,
  ownership/privacy checks, and isolated regression coverage.

### Financial safety

- Added append-only exception financial adjustments and derived invoice
  adjusted-total, overpayment, and refund-obligation projections.
- Reused deposit allocation release semantics and preserved approved payment
  confirmations and all ledger history.
- No cash refund, withdrawal, gateway reversal, replacement, or store credit is
  executed; `refund_due` is an obligation state only.

### Validated

- `npm run check`: format, lint with zero warnings, typecheck, 88 Vitest tests,
  and Next.js build pass.
- `npm run convex:test`: 61 Convex tests pass; `git diff --check` passes.

### Deferred

- Cancellation eligibility, refund disbursement, deposit refund, post-PO
  cancellation, and defect replacement policies remain business decisions.
- Clerk/browser/realtime/concurrency QA remains deferred to stable staging.

## [phase-06.3-batch-roster-operations] — 2026-08-10

### Added

- Added derived admin batch customer rosters, purchase summaries, bounded
  unassigned work queues, and quantity-safe assignment unassign/move controls.
- Added `orders.source` and admin-assisted order creation for existing active
  customers, using the canonical order/item pipeline and server-derived price.
- Added batch lock enforcement at `po_closed`/later shipment stages and audit
  events for assignment and assisted-order operations.

### Security

- Full roster reads and assignment mutations remain admin/owner-only. Customers
  see only owned-order tracking; fake app users and non-account manual customer
  records are not created.
- Secret Catalog access codes/grants, invoice/payment logic, fulfillment
  ownership, `main`, Production, and Convex configuration were not changed.

### Validated

- `npm run check`: format, lint with zero warnings, typecheck, 75 Vitest tests,
  and Next.js build pass.
- `npm run convex:test`: 52 Convex tests pass; `git diff --check` passes.

### Deferred

- Stable-staging runtime/browser QA, supplier-specific procurement/cost policy,
  post-lock correction, and `MANUAL_NON_ACCOUNT_CUSTOMER_POLICY` remain open.

## [phase-06.2-join-access-approval] — 2026-08-10

### Added

- Added the public `/join` Blessfriends request flow and durable Convex
  `joinRequests` admission records with server validation, normalization, and
  active duplicate protection.
- Added `/admin/join-requests` for admin/owner queue review, forward-only
  start-review/approve/reject actions, audit events, and the `ready` manual
  Clerk invitation handoff state.
- Added admission authorization, privacy boundaries, race/state-transition
  tests, public navigation, and Phase 06.2 context documentation.

### Security

- Join requests remain separate from Clerk accounts, `appUsers`, roles,
  ownership, and Secret Catalog grants. Public responses never expose request
  records or duplicate details.
- No invitation URLs, tokens, contact data, or secrets are written to audit
  metadata. Production, `main`, Preview, and staging were not touched.

### Validated

- `npm run check` components pass: format, lint with zero warnings, typecheck,
  75 Vitest tests, and Next.js build.
- `npm run convex:test`: 48 Convex tests pass; `git diff --check` passes.

### Deferred

- Stable-staging runtime/browser QA, Clerk invitation execution/acceptance,
  verified account linking, infrastructure rate limiting, and the
  `JOIN_REQUEST_RETENTION_POLICY` decision.

## [phase-06.1-catalog-ready-stock] — 2026-08-10

### Added

- Added reusable Book Master author/category/publication metadata, global public
  slugs, audited create/update operations, and practical admin list/detail flows.
- Added audited variant editing with per-format unique ISBN and positive integer
  IDR price validation.
- Added per-variant `readyStockInventory` with non-negative quantity and a
  deliberately scoped anonymous public projection.
- Added `/ready-stock` server-backed search/filter/sort, zero/loading/error
  states, and `/ready-stock/[slug]` detail with a contact/help purchase boundary.
- Added the PRD coverage matrix and Phase 06.1 product/catalog/domain records.

### Security

- Draft, special/private, archived, inactive, and zero-stock records remain
  hidden server-side. Ready Stock queries do not read Secret Catalog, access
  code, grant, or catalog-item tables.
- Customers cannot mutate Book Master, variants, publication state, or stock.
  Privileged writes validate invariants and audit the authenticated actor.

### Validated

- `npm run check`: format, lint with zero warnings, typecheck, 71 Vitest tests,
  and Next.js build pass.
- `npm run convex:test`: 44 Convex tests pass; `git diff --check` passes.

### Deferred

- `READY_STOCK_ORDER_RECORDING`, reservation/sold transitions, checkout,
  durable cover upload, stable-staging runtime QA, Production, and `main`.

## [phase-05.1-payment-verification] — 2026-08-10

### Added

- Added integer-IDR `paymentConfirmations` persistence with customer ownership,
  pending-submission uniqueness, review state, reviewer history, and optional
  proof-reference metadata.
- Added atomic admin/owner review transitions and invoice payment projection
  fields for verified manual payments.
- Added customer invoice submission/status feedback and the `/admin/payments`
  review queue/history surface.
- Added authorization, audit, duplicate, stale-approval, rejection/resubmit,
  suspension, and deposit-plus-transfer financial invariant coverage.

### Validated

- `npm run check`: format, lint, typecheck, 65 Vitest tests, and Next.js build
  pass.
- `npm run convex:test`: 38 Convex tests pass; no transient Preview or
  Production deployment was used.

### Deferred

- Real Clerk/staging runtime and authenticated browser QA remain deferred to the
  stable staging gate.
- Payment gateways, bank APIs, webhooks, automatic reconciliation, proof
  uploads, refunds, withdrawals, chargebacks, accounting, Production, and
  `main` remain out of scope.

## [phase-04.1-status-transition] — 2026-08-10

### Changed

- Marked Phase 04.1 implementation **IMPLEMENTED** with **GREEN** local
  validation.
- Retired transient branch-specific Preview `READY` as a Phase 04.1 gate;
  real Clerk and integrated runtime QA is **DEFERRED TO STAGING**.
- Documented the `feat/*` → `develop` → `main` branch model and stable staging
  handoff policy.
- Added `context/implementation/STAGING-QA-PLAN.md` for the deferred runtime
  acceptance backlog.

### Not changed

- Production remains untouched and **NOT READY**.
- No application implementation or staging infrastructure was changed.

## [phase-04.1-preview-verification] — 2026-08-10

### Validated

- [SUPERSEDED] Names-only inspection confirms the Vercel Preview Clerk keys
  and `CONVEX_DEPLOY_KEY`, plus the three project-level Convex Preview default
  names.
- [PREVIEW BUILD] Git-connected Vercel Preview deployment
  `dpl_3psKKup4dxPqK5kAjAiQMmuyRquQ` selected the real branch-isolated Convex
  Preview `robust-cheetah-853` and generated 18 static pages.

### Historical gate (superseded)

- [SUPERSEDED] Convex rejected the transient Preview deployment because
  `CLERK_JWT_ISSUER_DOMAIN` was unset. Real Clerk, invitation, ownership, and
  authenticated browser QA are now intentionally deferred to staging.
  Production and `main` were not changed.

## [phase-04.1-identity-authorization] — 2026-08-08

### Added

- Connected the existing Clerk foundation to Convex with
  `ConvexProviderWithClerk` and a Clerk issuer-based Convex auth config.
- Added `appUsers`, owner bootstrap, customer-default provisioning, centralized
  permissions, server-side authorization helpers, suspension rules, and audit
  events.
- Migrated active ownership from prototype sessions to `appUsers` references
  for catalog grants, orders, tracking, invoices, deposits, and actor fields.
- Added customer profiles, customer addresses with atomic default handling, and
  owner-only `/admin/users` management.
- Added invite-only sign-in/sign-up routes, route guards, authenticated state
  handling, and Clerk-aware Playwright scaffolding without committed auth state.
- Disabled the legacy anonymous Preview identity for active Convex functions.

### Validated

- [REPOSITORY] Format check, lint, typecheck, 59 Vitest tests, Next.js build,
  Convex codegen, and 32 Convex tests pass locally.
- [CONVEX VERIFIED] Development ownership preflight found zero affected
  business records; no migration assignment or deletion was required.
- [BLOCKED] Real Clerk invitation, authenticated browser QA, and current
  branch Preview runtime verification remain pending isolated Preview setup.

### Deferred

- Invitation management, MFA enforcement, Clerk user deletion/password reset,
  Production authentication, Production deployment, and Phase 04.2 hardening.

## [phase-03.2-operations] — 2026-08-06

### Added

- Added persistent batches, catalog-batch links, order-item assignments, shipment-stage history, and separate order
  fulfillment history to Convex.
- Added immutable invoice snapshots with collision-safe prototype invoice numbers, exact IDR deposit requirements,
  draft/issued/void states, and customer ownership filtering.
- Added zero-start deposit accounts, append-only credit/reservation/release/debit/reversal transactions, and atomic
  invoice allocations.
- Connected customer tracking, fulfillment, invoice, and deposit screens plus admin batch/order/invoice operations
  to reactive Convex queries and guarded Preview mutations.

### Validated

- [CONVEX VERIFIED] Convex codegen and 27 Convex tests pass on the isolated Development deployment.
- [REPOSITORY] 51 Vitest tests, lint, typecheck, build, and the complete 60-test Playwright matrix pass across
  375×812, 768×1024, 1024×768, and 1440×900.
- [CONVEX VERIFIED] Branch Preview `preview/feat-convex-operations-persistence-v0-1` is isolated as
  `charming-horse-40`; the four required server-side Preview environment names are configured outside Git.
- [PREVIEW VERIFIED] Vercel Preview `dpl_As6GRhi5NcGWCPALZMTbkMYUstJC` is READY at
  `https://blessing-for-good-a2nl9jhjf-masjaaks-projects.vercel.app`; the build deployed all 19 App Router routes.
- [PREVIEW VERIFIED] `60/60` Playwright tests pass against the deployed Preview, including tracking and deposit
  realtime updates, reload persistence, targeted cleanup, and second-customer isolation.
- [PREVIEW VERIFIED] All Phase 03.1 and Phase 03.2 business tables are empty after cleanup; no seed or dummy business
  data is present. Vercel error-level runtime logs are empty; Convex logs contain only expected unauthenticated
  negative-path entries from route smoke checks.

### Deferred

- Clerk, Production authorization, Production Convex, payment gateway/reconciliation, refund policy, shipping or
  customs calculation, WhatsApp API, and `main` merge remain outside this phase.

## [phase-03.1-convex] — 2026-08-05

### Added

- Added the Phase 03.1 Convex schema for prototype sessions, publishers, books, variants, secret catalogs, access
  grants, catalog items, orders, order-item snapshots, and order status history.
- Added Preview-only server capability checks, expiring token-digest sessions, keyed catalog-code verification, and
  atomic order persistence with server-calculated IDR snapshots.
- Connected the active catalog-to-preorder screens to Convex Preview while retaining an explicit local development
  adapter fallback.
- Added guarded test cleanup scoped to explicit Browser QA records; no seed or dummy business data is deployed.

### Validated

- `npm run check`: 32 tests passed; Convex tests: 8 passed; Convex typecheck/codegen passed.
- Local Vercel Build Output and the remote Preview build passed with Convex deployment and Next.js build integration.
- Vercel Preview `dpl_4BxuvP1MvDzS9kktZyGfTmrmcAGk` is READY at
  `https://blessing-for-good-1zm4ur6w9-masjaaks-projects.vercel.app`.
- `56/56` Playwright tests passed against the new Preview, including reload persistence, cross-browser admin
  visibility, customer isolation, and required viewport projects.
- All 12 implemented routes returned HTTP 200; Preview business tables were empty before and after QA cleanup.

### Deferred

- Clerk, Production authorization, Production Convex, batch/cargo tracking, invoice/deposit persistence, payment,
  uploads, email, WhatsApp API, and `main` merge remain outside this phase.

## [phase-02.2-qa] — 2026-08-05

### Added

- Added Playwright Chromium browser QA at 375×812, 768×1024, 1024×768, and 1440×900.
- Added navigation and interactive UX issue matrices with evidence labels and P0–P3 priorities.
- Added guarded Preview Demo Mode, visible Preview status copy, and browser-local zero-data flow coverage.
- Added the presentation-only `BookCover` fallback; no fake cover art or image persistence was introduced.
- Added generated Playwright artifact ignores and deterministic ESLint ignores for browser reports.

### Validated

- The final Preview passed `56/56` Playwright tests across all four required viewports, including customer and admin prototype flows.
- Navigation, wrong-code feedback, format/ISBN/price changes, quantity, preorder, tracking, status transition, invoice, and append-only ledger interactions passed in a zero-data browser session.
- The final Preview build passed with all 14 App Router routes generated; authenticated CLI root verification returned HTTP 200 and runtime error logs returned no entries.
- Preview environment availability was audited by name only; Production remains untouched.

### Fixed

- Corrected client-bundle environment access so the explicitly configured Preview flag is available in the browser production bundle.
- Removed the admin prototype shortcut from customer primary navigation.
- Corrected mobile footer spacing and the admin mode metric (`Preview` when Demo Mode is active).

### Remaining

- Real authentication, shared persistence, uploads, final policy decisions, and unavailable admin modules remain deferred to later phases.

## [phase-02.1] — 2026-08-05

### Added

- Copied and checksum-mapped four logo candidates, four mascot candidates, eight mobile mockups, and ten admin mockups into the canonical repository.
- Added the BFG asset registry, asset manifest, mockup manifest, visual gap audit, and visual QA report.

### Changed

- Established warm ivory, forest green, sage, peach, gold, and pale-blue visual tokens with editorial heading and compact UI typography fallbacks.
- Integrated reusable `BrandLogo` and `BrandMascot` components, favicon metadata, customer navigation, admin navigation, responsive sidebar fallback, empty states, and anchor screen hierarchy.
- Preserved zero-data startup and existing catalog, order, tracking, invoice, and deposit logic.

### Validated

- `npm run check`: 15 tests passed, lint/typecheck/build green.
- `npx vercel@latest build`: Preview-target Build Output passed.
- Preview `dpl_F1aiDK2SSsFL4NNV931uQqaXHmCj` is READY; 12 routes and five runtime brand assets returned HTTP 200, with no Preview runtime error logs.

### Deferred

- [SUPERSEDED] Browser screenshot, hydration, and console checks were blocked before Phase 02.2 tooling was added;
  the final Phase 02.2 Preview matrix is green.
- Approved book-cover data and unimplemented admin destinations remain out of scope; no mockup sample records were seeded.

## [prototype-v0.1] — 2026-08-05

### Added

- Reconstructed the missing local application tree from the approved implementation brief on branch `prototype/v0.1`.
- Added zero-data catalog unlock, format selection, preorder, status timeline, invoice, and append-only deposit prototype flows.
- Added public community, how-to-order, help, ready-stock empty, customer account, and desktop admin foundations.
- Added prototype assumptions, asset audit, route matrix, open questions, and known limitations.

### Fixed

- Corrected the existing Vercel project from the `Other` preset with `dist` output to the Next.js preset with automatic output detection. The remote build had already completed `next build`; only Vercel's post-build output lookup failed.
- Added `.vercel/` to Git ignore rules so local Vercel metadata and environment files cannot be committed.
- Verified Preview deployment `dpl_HwuopThbRTvjF2YrNZs3K8i3mRGr` and all implemented route responses; Production and `main` were not changed.

### Deferred

- Official brand assets and mockups are absent from the canonical GitHub snapshot; no replacement assets were generated.
- Clerk production authentication, Convex persistence/schema, payment processing, WhatsApp API, and deployment remain deferred.

## [phase-01] — 2026-08-04

### Added

- Local Git baseline and canonical repository guardrails.
- Minimal Next.js App Router foundation with strict TypeScript, ESLint, and Prettier.
- Vitest/React Testing Library foundation, environment validation, test-only fixture guards, and zero-data startup state.
- Fail-closed Clerk/Convex provider boundary using official dependencies without live service connections.

### Changed

- Synchronized source-of-truth precedence with the approved Phase 01 hierarchy.
- Recorded asset, mockup availability, duplicate prompt, and mockup naming status.
- Updated repository status, implementation phase status, and file manifest.

### Deferred

- Phase 02 visual implementation, final styling, production auth wiring, Convex schema, business features, and deployment.

## [1.0.0-docs] — 2026-08-04

### Added

- Product, brand, community, catalog, data, database, security, integration, and operation documentation.
- Feature and screen specifications.
- Zero-data trial policy.
- Convex, Clerk, Cloudflare, and R2 architecture direction.
- Codex phase prompts and implementation gates.

### Known gaps

- Final logo assets are pending.
- Mascot files and official character information are pending.
- Final community copy and order rules require client approval.
- Cancellation, refund, and deposit adjustment policies require confirmation.
- Exact secret-catalog-to-batch relationship requires confirmation.
- Several new screens do not yet have final mockups.
