---
title: Project Changelog
status: approved
owner: MasJak
last_updated: 2026-08-30
source: conversation
---

# Changelog

## [secret-catalog-production-uat-bugfix] — 2026-08-30

### Fixed

- Corrected global Secret Catalog unlock to start on the eligible Catalog that
  generated the code, restoring that Catalog's existing customer-safe books
  while preserving the global eligible-Catalog set and strict per-Catalog
  reads. Customer search/filter/order behavior is unchanged.
- Added a local BFG copy toast that appears only after Clipboard API success;
  rejected writes show error feedback without a false success or Activity row.
- Aligned the scoped Catalog settings row using the existing BFG grid grammar
  and verified access/member/discovery controls at the required breakpoints.
  Pelanggan, Produk, and Publisher remain BFGSelect controls.

### QA

- Focused and full local tests, TypeScript, ESLint, formatting, build, Convex
  check, and rendered 390/768/1440 geometry pass. Commit
  `14e6f105af4483e5a499e5fc494f14b107648710` is deployed as Vercel
  `dpl_7Nwiqh3e8ywWozqsKa4vhJQaeVgr`; its configured build deployed Convex
  Production `clean-eel-522` with no deleted indexes. Public post-deploy route
  and BFGSelect checks ran; authenticated business UAT remains pending. No
  credentials or Production business data were introduced.

## [secret-catalog-global-access-code] — 2026-08-30

### Changed

- Removed the active `Periode Akses Bersama` Admin path and its manual period
  configuration. Historical period rows and valid legacy sessions remain only
  for compatibility; no migration deletes persisted data.
- Extended the existing secure generated access-code path with a global scope:
  one current digest-only code opens all eligible open/unexpired Secret
  Catalogs, with existing one-time raw display, expiry, rotation, revoke,
  session, membership, authorization, and rate-limit behavior preserved.
- Kept the existing Customer Catalog selector with neutral Secret Catalog copy
  so one validated session can move among eligible Catalogs. Aligned only the
  affected Catalog settings, access-code, and member form grids with existing
  BFG primitives and breakpoints.

### QA

- Focused access/UI checks and the full Convex/frontend suites pass locally;
  TypeScript, ESLint, formatting, build, Convex check, diff checks, and the
  rendered form fixture pass at 390/768/1440. Commit `42339ab` is deployed as
  Vercel `dpl_CcQAaYQCH32oiKy7zoPR3ARqaGk6`, aliased to the canonical domain;
  the configured build path deployed Convex Production `clean-eel-522` and
  public smoke checks pass. Authenticated business UAT remains pending.

## [secret-catalog-discovery-access-period] — 2026-08-30

> Historical record: the shared access-period model in this entry is
> superseded by the global generated-code decision above.

### Added

- Added Customer Catalog context with title, derived Jakarta deadline status,
  date-only Close Order, Catalog ETA, and available-book count.
- Added scoped Customer title/ISBN search, canonical Publisher filtering,
  result counts, reset/empty states, and clean cover/title/ISBN card hierarchy
  while preserving existing format, quantity, detail, and preorder controls.
- Added Admin Book Master search by title, Publisher, ISBN, and author plus
  current-Catalog search/filter tracking without changing add/remove mutations.
- Added an additive shared access-period model so multiple linked Catalogs can
  use one digest-only code; existing authentication, membership, authorization,
  and signed-out scoped gateway boundaries remain in force.

### QA

- Focused and full deterministic checks pass locally: 75 Vitest files / 431
  tests, TypeScript, ESLint, format, Convex check, audit, build, and diff
  checks. Responsive stylesheet geometry passes at 390/768/1440.
- Commit `45ac1bb` is deployed to Vercel Production as
  `dpl_ETVTjVtvB6RdKRBcRNR4SJgRwjXv`, aliased to the canonical
  domain; the existing build path deployed Convex Production `clean-eel-522`.
  Public homepage, Catalog gateway, robots, and sitemap smoke checks pass.
- Authenticated application rendering and Production business UAT remain
  pending without a Clerk publishable key/session or safe business fixture.

## [admin-action-deadline-tuning] — 2026-08-29

### Fixed

- Framed confirmed operational Admin mutation/lifecycle actions with the
  existing BFG `secondary`/`danger` Button variants without changing behavior.
- Changed relevant Catalog and Batch deadline inputs/displays to calendar-date
  UX while retaining UTC timestamp storage.
- Made Catalog-to-Batch deadline compatibility compare the existing
  `Asia/Jakarta` calendar date, so same-day minute differences no longer cause
  a false mismatch.

### QA

- Added date-adapter, same-day deadline, and Admin rendered-control regressions.
- Full frontend/Convex Vitest suites, TypeScript, ESLint, format, build,
  Convex check, and diff checks pass. Commit `a3200dd` is deployed through the
  canonical Vercel Production path; authenticated Admin UAT remains pending
  without an authorized session or safe fixture.

## [clerk-identity-routing-invitation-lifecycle] — 2026-08-28

### Fixed

- Separated Clerk identity existence from BFG membership during Admin
  approval. Existing Clerk identities use sign-in/reconciliation; only truly
  new identities receive a signup invitation.
- Kept one pending invitation per current admission and made explicit resend
  revoke the current ticket before creating one replacement. Clerk invitation
  creation remains `ignoreExisting: false`.
- Replaced the blanket signed-in invitation mismatch with a comparison between
  the current verified primary Clerk email and the current ticket/admission
  email. Historical subjects do not produce a false same-email mismatch, while
  different-account protection remains.

### QA

- Added Convex and component regressions for identity routing, idempotent
  approval, resend, same-email/different-subject, different-email mismatch,
  and removed-member reapply. Production Clerk configuration and authenticated
  existing/new-user UAT remain pending without authorized credentials/mailbox.

## [removed-member-admin-projection] — 2026-08-27

### Fixed

- Removed Join Requests no longer appear in the default or status-filtered
  Admin `Permintaan bergabung` operational projection.
- Preserved the Join Request, appUser, invitation, removal metadata, and
  audit history; the current approved-admission resolver remains separate and
  available to invitation/membership reconciliation.

### QA

- Added removal-list, reapply, and current-approved-invitation regression
  coverage. Full local deterministic gates pass. Vercel Production
  `dpl_EjkNaZvd6i4QsvjoRi8TziG3S8LT` is `READY`; the affected signed-out Admin
  route smoke passed at 1024/1280/1440 and public viewport smoke passed at
  390/768/1440. Authenticated Production UAT remains pending.

## [membership-removal-reapply-closure] — 2026-08-27

### Added

- Added the Admin `Remove member` action and confirmation on approved Join
  Request membership cards.
- Added the canonical `removed` membership tombstone, historical admission
  removal metadata, one semantic audit event, and best-effort revocation of
  pending Clerk invitations.
- Excluded removed admissions from duplicate prevention and authentication
  reconciliation so the same email can submit a fresh request without
  allowing an old approval to reactivate the membership.
- Preserved the existing appUser/member code for same-subject rejoin and kept
  a new Clerk subject as a separate historical appUser.

### QA

- Full Vitest (69 files, 366 tests), Convex checks, TypeScript, ESLint,
  formatting, production build, audit, and diff checks pass locally. Convex
  Production, Vercel Production, and public smoke are green. Authenticated
  Admin/customer lifecycle retest still requires an authorized real account.

## [membership-admission-root-closure] — 2026-08-27

### Fixed

- Repaired the Clerk-to-Convex admission boundary for Production JWTs that
  authenticate the correct Clerk subject but omit the email claim. The root
  product provider now resolves that subject's verified primary email through
  the server-only Clerk Backend SDK, then invokes the existing canonical
  `users.ensureCurrentUser` reconciliation transaction.
- Kept verified-email, account-mismatch, privileged-role, suspension, and
  session-switch protections fail-closed. Clerk lookup failures remain
  retryable and do not become a false `Gabung Blessfriends` state.
- Carried one privacy-safe invitation correlation ID from ticket acceptance
  through Convex authentication and membership reconciliation.

### Regression evidence

- Commit `5ca0bf4` correctly began forwarding Convex's requested Clerk JWT
  template, but the configured Production template supplies the required
  audience and subject without an email claim. The later admission code
  required that missing claim before it could find the approved Join Request.
- Production correlation `9b79020d-2520-4975-8621-7a97bd39c2be` reached
  `ensure_started` with an authenticated subject, `trustedEmail=null`, no
  `appUser`, and then failed `ADMISSION_REQUIRED` before reconciliation.

### QA

- Full Vitest `68 files / 356 tests`, TypeScript, ESLint, Format, Build,
  Convex Development check, `npm audit --omit=dev` (`0 vulnerabilities`), and
  `git diff --check` pass. Local Playwright remains unavailable because this
  checkout intentionally has no Clerk publishable key.
- Convex Production `clean-eel-522` and Vercel Production deployment
  `dpl_43Vv7DsfARCs69FBdNJDhbZhQQgc` are READY. Production public Playwright
  passed `215/215`; seven network/Clerk CDN suspensions recovered on retry.
- A legitimate live journey reached Admin approval and
  `INVITATION_CREATED`. The invitee did not open/accept the invitation during
  the observation window, so Customer activation and the real Ready Stock
  order remain explicitly pending rather than inferred from automated tests.

## [real-invitation-ticket-p0] — 2026-08-27

### Changed

- Routed BFG-created Clerk invitations through the invite-only ticket-aware
  `/sign-up` flow and added explicit account-mismatch sign-out/restart
  recovery, preventing a stale signed-in account from being used for another
  invite.
- Kept `users.ensureCurrentUser` as the single membership bootstrap path,
  added approved activation-pending state, and recorded privacy-safe
  reconciliation diagnostics.

### QA

- Full Vitest, TypeScript, ESLint, Format, Build, Convex Development check,
  `npm audit --omit=dev`, and `git diff --check` pass.
- Production retest is required because the real 27 August recording
  superseded the previous deterministic closure; no fake identity or business
  data was used.

## [customer-account-responsive-navigation] — 2026-08-26

### Changed

- Added a mobile Account hub with the existing Profile, Address, Activity,
  Clerk account-management, and Clerk sign-out actions.
- Kept the customer five-item bottom navigation and desktop header intact;
  mobile content now reserves the existing bottom-nav safe area.

### QA

- Focused Account component coverage and the responsive geometry matrix pass
  across portrait, landscape, tablet, and desktop widths.
- Full deterministic Vitest, TypeScript, ESLint, Format, Build, Convex check,
  `npm audit --omit=dev`, and `git diff --check` pass.
- Vercel Production deployment `dpl_8eCvpvaYy4MBRrsoNvLCBcv5tiQp` is READY;
  public signed-out Account smoke passed `8/8` at 375, 390, 430, and 1440px.

## [final-yellow-unknown-closure] — 2026-08-26

### Changed

- Admin Join approval now starts one private server-side Clerk Backend SDK
  reconciliation. Existing identities and pending invitations are reused;
  failures are safe and retryable; repeated approval is idempotent.
- `/join` now follows canonical `appUsers.role/status`: active and suspended
  Customers never see the new-request form, while Admin/Owner remains outside
  Customer mutation authority. Trusted invitation acceptance provisions the
  active Customer app user.
- Reconciled the eight `coverPresentation` assertions to the current intentional
  transformed artwork/clipped frame contract, preserving cover upload and
  presentation behavior.

### QA

- Full Vitest: `60 files / 315 tests`; full current Playwright: `284/284`.
- TypeScript, ESLint, Format, Build, Convex Development check,
  `git diff --check`, and `npm audit --omit=dev` (`0 vulnerabilities`) pass.
- Canonical Vercel Production deployment
  `dpl_459z5nNtK56GBrn8whG793oHP9VT` is ready at
  `https://www.blessingforgood.com`; no fake Production identity or business
  data was created.

## [operational-reconciliation] — 2026-08-26

### Changed

- Kept Ready Stock Customer-only at the server and made Admin/Owner customer
  surfaces route to the existing Admin-assisted order path.
- Clarified Secret Catalog `Batas pemesanan`, added guarded reopen, authorized
  Secret Book Detail media/content projection, and exposed derived linked
  Catalog eligibility counts in Batch operations.
- Added empty-Roster PO-lock protection, safe Batch error copy, and explicit
  Roster/Assignment/Purchase Summary guidance without adding a second order or
  tracking system.
- Added server-guarded hard deletion only for unused draft/pristine product and
  operational records; historical and financial records keep lifecycle actions.
- Routed destructive/state-changing UI actions through the shared BFG
  confirmation dialog and preserved content-aware shared Button geometry.

### QA

- Full Vitest: `59 files / 306 tests`; TypeScript, ESLint, Format, Build,
  Convex Development check, `git diff --check`, and `npm audit --omit=dev`
  (`0` vulnerabilities) pass.
- Convex Production `clean-eel-522` and Vercel Production
  `dpl_BW8uYMyoKLWyPqXM7chQv2JwMtKK` are ready. Public HTTP smoke returned
  `200`; Playwright passed `276/284`, with eight known preserved Cover/Gallery
  framing assertion failures. New Button geometry passed `8/8` supported
  customer viewports. No fake Production identity or business data was used.

## [client-uat-round-3] — 2026-08-25

### Changed

- Preserved invite-only Clerk Google sign-in with supported opaque-sign-up
  prevention, Indonesian unregistered-account guidance, and a single aligned
  auth shell with Join/alternate-account actions.
- Kept Join Request submission public for signed-out visitors, mapped known
  duplicate/validation/rate-limit states to safe copy, and expanded Book
  Interest while retaining legacy values.
- Added an additive Activity audience projection so the shared Admin/Customer
  feed preserves unread/read parity without leaking Admin notices into the
  customer surface.

### QA

- Full Vitest: `287/287`; TypeScript, ESLint, Prettier, production build,
  Convex Development check, `git diff --check`, and `npm audit --omit=dev`
  (`0`) pass.
- Local rendered browser QA is blocked by the intentionally missing Clerk
  publishable key; managed-key Production public smoke passed `40/40`, the
  Activity matrix passed `8/8`, and no fake credential or Production business
  record was used.

## [client-uat-round-2-maintenance] — 2026-08-24

### Changed

- Normalized legitimate JPEG MIME aliases across the existing secure Cover and
  Gallery upload pipeline without weakening byte, extension, dimension,
  ownership, claim, or rate-limit validation.
- Kept Ready Stock atomic reservation canonical while adding safe customer error
  copy and exposing the existing Admin-assisted order path for active BFG
  Customers.
- Added narrow Clerk/Cloudflare challenge CSP origins, clearer shared Activity
  unread/read semantics, and stronger BFG Secondary button tokens.
- Added normalized Batch ETA Cargo month, stable Customer `memberCode`,
  Publisher-grouped derived purchase CSV, and optional variant supplier GBP
  minor price.

### QA

- Focused regression suites: 74/74.
- Full suite: 277/277 after the final additive member-code view assertion.
- TypeScript, ESLint, Prettier, production build, Convex Development check, and
  `npm audit --omit=dev` pass.
- Production/device closure remains blocked by authorized Clerk/Convex/Vercel
  access, approved business data, and Android/iOS availability.

## [maintenance-product-logic-uat-correction] — 2026-08-22

### Changed

- Added a state-driven Admin Order → Invoice CTA that reuses the existing
  Finance create/issue path.
- Made shared Activity unread state visible with a BFG tint, accent, dot,
  `Baru`, stronger title, and accessible `Belum dibaca` text while preserving
  backend read semantics.
- Added shared `ActionGroup` spacing/wrapping for conditional actions.
- Replaced new human invoice identifiers with server-generated
  `BFG-INV-YYMMDD-XXXX`, plus a bounded audited legacy-reference preview and
  idempotent backfill mutation that preserves internal identity and money.
- Made Master Book Save report data-backed success/error, persist after query
  refresh, and remain separate from explicit Publish.
- Locked the current commerce clarification in source docs and verified
  multi-Publisher Secret Catalog/Batch behavior with shared close-date guards
  and access-safe Customer projection.

### QA boundary

- Local deterministic maintenance coverage was added. Production deployment,
  backfill, and authenticated live recheck remain release gates until the
  integrated canonical state is deployed and verified.

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
