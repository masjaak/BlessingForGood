# BFG Phase 07.1 QA

Reconciled: 2026-08-14
Starting commit: `8392d2212844fc888e12904e680a240420d219b0`
Status: `LOCAL_ENGINEERING_PASS__PRODUCTION_AND_REAL_UAT_PENDING`
Phase 08: `NOT STARTED`

## Source and conflict acceptance

- Original PRD/UX/business rules/routes/scope/success criteria and approved policy/security/financial records were read
  before implementation.
- Ten Admin and eight Customer approved PNGs were opened and visually audited.
- Canonical conflict record: `context/SOURCE_OF_TRUTH.md`.
- Secret Catalog final model is hybrid: secure anonymous scoped code session plus explicit authenticated member grant.
- Inbox is persistent operational messaging, not chat.
- WhatsApp API automation and payment gateway remain excluded.

## Implemented reconciliation delta

- Reachable Catalog detail and Access Management: Draft create/edit/open/close, assign/remove existing variants,
  generate/copy/revoke expiring digest-only codes, safe history metadata, member grant/revoke.
- Durable validated cover, payment-proof, and deposit-proof uploads through Convex storage. Server validation trusts
  storage metadata, not client-declared MIME, and caps files at 5 MB.
- Event-backed owned Notifications and operational Inbox for Admin and Customer with unread counts, read state, safe
  destination, and header affordances.
- Customer batch list/detail and batch-open/status notifications.
- Deposit top-up submission/review/approve/reject, atomic ledger credit, audited manual adjustment, and owned history.
- Order search/status filter, bounded order/invoice/batch report, Excel-compatible UTF-8 CSV export with formula-injection
  protection, sales overview, batch status/performance view, and period filter.
- Admin System access with Owner-only staff invitations/claim and role controls,
  immutable audit view, operational settings, and Admin-managed published
  content.
- Publisher maintenance and canonical Draft catalog creation now reuse existing domain mutations. Duplicate inline
  catalog code controls and the legacy product-creating catalog bundle form were removed from the Admin list surface.

## State and security QA

- State machines are documented in `BFG-PHASE-07-1-STATE-MACHINES.md` for access, notifications/Inbox, publication,
  batch, deposit/payment, and Join.
- Recipient ownership is enforced server-side for Notification/Inbox query and read mutation.
- Customer proofs/covers validate authoritative storage metadata; private proof URLs are returned only by authorized
  own/Admin queries.
- Catalog Admin metadata never returns digests or plaintext codes. Plaintext is returned once by generation only.
- Deposit approval is transactional and state-gated, so a resolved top-up cannot credit twice.
- Existing order snapshots, append-only financial ledger behavior, refund/exception logic, and Ready Stock reservation
  rules remain intact.

## TDD and engineering gates

Focused reconciliation suite after the trust-boundary refactor:

- 4 files, 18 tests: PASS.
- Covers catalog metadata/revoke/grant/item assignment, notification/Inbox ownership/read, reports/audit, deadline,
  cover upload, top-up/adjustment, payment proof, content/settings, staff invitation, and publisher maintenance.

Full current baseline:

- Vitest: `166/166`, 35 files, PASS.
- Convex Vitest: `94/94`, 16 files, PASS.
- Convex CLI schema/codegen check: BLOCKED. The configured CLI identity does not have access to canonical Development
  `content-snake-214`; the command stopped before changing any deployment. No alternate project was selected.
- TypeScript: PASS.
- ESLint: PASS.
- Format check: PASS.
- Production build: PASS; 38 static pages generated and all dynamic routes compiled.
- `git diff --check`: PASS.
- No new runtime dependency.

### Final operational completeness delta

- Added `BFG-ADMIN-SECTION-OPERATIONAL-MATRIX.md` covering all 17 required
  Admin sections and the requested action, state, authorization, consequence,
  and Production-verification fields.
- Invoice queue now supports direct create-and-issue and issue-from-queue;
  Customer detail links to invoice creation and deposit management.
- Book detail previews a selected cover before the existing durable, validated
  storage save/replace operation.
- Sidebar icon/text alignment now uses one shared fixed wrapper and the UI
  regression suite checks that every Admin navigation row has it.
- Local action coverage remains `UNKNOWN=0`, `DEAD_ACTION=0`; Production
  verification remains `NO` for these changes.

## Rendered QA

- Playwright route/viewport inventory: 155 checks.
- Customer: 19 checks × 5 projects (375/390/430/768/1440).
- Admin signed-out gates: 20 routes × 3 projects (1024/1280/1440).
- Capped run: 153 PASS; two transient checks failed on their first concurrent
  attempt: Customer `/community` observed a stale local Convex
  `contentBlocks:getPublished` function response, and Admin-1024 Notifications
  received Clerk's 409 concurrency response. Both exact checks passed
  sequentially with one worker and retries disabled. No product assertion was
  suppressed by retry.
- Ready Stock loading assertion was corrected to its real accessible loading region; all five widths then passed and
  screenshots show the canonical zero-data state rather than a skeleton.
- Representative customer images at 375, 390, and 1440 were inspected visually; no horizontal overflow or console/page
  error was recorded.
- Authenticated Admin and populated Customer image comparison is not complete. The local Clerk instance has one user
  with no role metadata and no designated Customer/Owner test identities are configured.

## Codebase Memory post-diff

- The prior reconciliation Codebase Memory index covered 2,709 nodes / 7,452
  edges with no skipped source files. This final delta rechecked the impacted
  Admin invoice, book, customer, navigation, and shared-cover callers with
  repository symbol search; no Convex/schema files changed.
- Blast radius from `8392d22`: 166 changed seed symbols, 71 impacted symbols, not truncated.
- Impact is concentrated in `convex`, Admin/Customer routes, shared UI/shell, and prototype operation adapters.
- Expected security/financial reach: auth helpers, deposit ledger/accounts, order exceptions/refunds, user RBAC, and
  Ready Stock inventory. These were included in the full regression.
- Three pre-existing parse-partial JSX locations were manually read (`account/page`, `account/orders/page`,
  `admin/page`); no hidden Phase 07.1 change or unclassified action was found there.

## Ponytail final review

- Reused existing Convex mutations, `SiteShell`, Admin navigation, UI primitives, native file/date/search controls,
  browser Blob download, and existing permission/audit helpers.
- Removed duplicate Catalog list access controls and the composite create-bundle UI path.
- Centralized three upload trust boundaries in one 16-line storage validator because the same security rule applies to
  covers, payment proofs, and top-up proofs.
- Applied report periods in the canonical database index before the 2,000-row cap; a red/green scale regression proves
  older valid windows cannot be hidden by newer rows.
- Kept bounded scans with explicit ceilings for operational reports and batch projections; add rollups/pagination only
  when real volume reaches those recorded limits.
- Skipped full chat, payment gateway, WhatsApp automation, bulk import, gallery, global search, and advanced analytics
  because their contracts are excluded/unapproved.

## Production acceptance boundary

No dummy Production data was created. No Production publisher, product, stock, catalog, access code/grant, order,
invoice, payment, deposit, notification, or Inbox record was mutated during local QA.

Still required before Phase 07.1 closure:

1. Restore authorized Convex CLI access, run schema/codegen acceptance against canonical Development, then deploy the
   reconciled commit to canonical Convex Production and Vercel Production.
2. Use one intentional real Owner/Admin, one admitted real Customer, and one real client product.
3. Admin creates/uploads/publishes the product and assigns Ready Stock or Secret Catalog; Customer verifies projection.
4. Admin generates/copies access, Customer unlocks, Admin revokes, and access consequence is observed.
5. Execute one safe real Admin and Customer notification plus representative Inbox event and verify cross-customer denial.
6. Capture authenticated Admin at 1024/1280/1440 and populated Customer at 375/390/430/1440 against the mockups.

Until those gates pass: `CLIENT PRODUCT ENTRY = NOT SAFE`, `PHASE 08 READINESS = NO`, and
`BFG_PHASE_07_1_PRODUCT_SURFACE_STABILIZED` must not be declared.

## Phase 07.1 visual system convergence pass — 2026-08-15

### Source and baseline

- Current Git baseline was verified at `99db772`; `origin/main` matched before
  implementation.
- Canonical Convex Development `content-snake-214` passed `npm run convex:check`
  and remained the target for local verification. Canonical Convex Production
  remains `clean-eel-522`; no backend source changed.
- The current Vercel Production baseline was verified as
  `dpl_35MpBhZJeKmdmEKYb6HLhLxnddVC` before this pass.
- All 10 Admin and all 8 Customer approved mockups were opened directly.
  `Logo-1` remains the runtime official mark.

### Visual implementation

- Shared tokens now define layout, semantic spacing relationships, typography,
  button sizes, frame types, sidebar rhythm, and mobile bottom-navigation
  breathing room.
- The logo optical wrapper is centralized in `BrandLogo`, with an explicit
  visible-overflow exception for auth and splash presentations.
- Page-aware skeletons now share the final shell and route-specific archetypes.
  Dashboard preserves four metric regions and six corresponding operational
  regions; Ready Stock, Batch, Orders, Catalogs, Finance, Settings, and
  Customer list/detail variants use their final structural grammar.
- Catalog forms, lists, detail, access management, assigned books, and order
  summary now declare semantic `Card` frames. Existing business actions and
  data contracts are unchanged.

### Engineering validation

- Focused visual component tests: `20/20 PASS`.
- Full Vitest: `175/175 PASS` across 36 files.
- Convex tests: `94/94 PASS` across 16 files.
- `npm run convex:check`: PASS; Convex functions ready against
  `content-snake-214`.
- `npm run check`: PASS (format, ESLint, TypeScript, tests, production build;
  38 routes).
- Playwright browser matrix: `155/155 PASS` across Customer
  `375/390/430/768/1440` and Admin signed-out `1024/1280/1440`.
- `git diff --check`: PASS. No Convex or schema diff was detected.

### Rendered acceptance boundary

Local public/locked and signed-out rendered evidence is under
`artifacts/visual-convergence/`, including before/after screenshots and the
auth logo crop regression fix. The local implementation is ready for
authenticated visual acceptance. Production populated Admin and Customer
screenshots at the required widths remain `BLOCKED_BY_EXTERNAL`: no designated
QA identities or safe real records are available, and no bypass or fabricated
Production data was used.

Current verdict: `LOCAL_VISUAL_SYSTEM_READY`;
`PRODUCTION_AUTHENTICATED_VISUAL_ACCEPTANCE_BLOCKED`;
`PHASE_08_LOCKED`.

## Phase 07.1 Production delivery verdict — 2026-08-15

- Runtime visual commit: `6a84bc0`; documentation follow-up commit:
  `9bb0093`.
- Vercel Production: `dpl_CsHVTKox5LVhhKQYZPG8TV1y2fk9`, `READY`, aliased to
  `www.blessingforgood.com`, `blessingforgood.com`,
  `blessingforgood.vercel.app`, and the project aliases.
- Canonical Convex Production: `clean-eel-522`. Vercel's existing build hook
  deployed the unchanged functions; no `convex/` or schema change was part of
  this pass.
- Vercel-authenticated curl of `/` returned HTTP 200, BFG HTML, and the
  expected signed-out Clerk status. Direct Playwright capture of the deployment
  URL showed Vercel Deployment Protection instead of the app; the custom
  domain was not DNS-resolvable from this shell. This is an environment access
  boundary, not a visual PASS.
- No authenticated Admin or populated Customer Production screenshot was
  fabricated, bypassed, or replaced with dummy business data.

Production verdict: `PUBLIC_BUILD_DELIVERED`;
`REAL_PRODUCTION_VISUAL_ACCEPTANCE_BLOCKED`;
`PHASE_07_1_NOT_CLOSED`;
`PHASE_08_LOCKED`.
