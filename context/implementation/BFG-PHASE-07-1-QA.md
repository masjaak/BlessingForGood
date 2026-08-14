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
- Owner-only staff invitations/claim, role/status controls, immutable audit view, settings, and Admin-managed published
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

- Vitest: `163/163`, 33 files, PASS.
- Convex Vitest: `94/94`, 16 files, PASS.
- Convex CLI schema/codegen check: BLOCKED. The configured CLI identity does not have access to canonical Development
  `content-snake-214`; the command stopped before changing any deployment. No alternate project was selected.
- TypeScript: PASS.
- ESLint: PASS.
- Format check: PASS.
- Production build: PASS; 38 static pages generated and all dynamic routes compiled.
- `git diff --check`: PASS.
- No new runtime dependency.

## Rendered QA

- Playwright route/viewport inventory: 155 checks.
- Customer: 19 checks × 5 projects (375/390/430/768/1440).
- Admin signed-out gates: 20 routes × 3 projects (1024/1280/1440).
- Capped run: 152 PASS; three Admin-1024 tests timed out waiting on the Clerk development widget under concurrent
  load. The exact `/admin/audit`, `/admin/inbox`, and `/admin/reports` checks then passed 3/3 sequentially with one
  worker and retries disabled. No product assertion was suppressed by retry.
- Ready Stock loading assertion was corrected to its real accessible loading region; all five widths then passed and
  screenshots show the canonical zero-data state rather than a skeleton.
- Representative customer images at 375, 390, and 1440 were inspected visually; no horizontal overflow or console/page
  error was recorded.
- Authenticated Admin and populated Customer image comparison is not complete. The local Clerk instance has one user
  with no role metadata and no designated Customer/Owner test identities are configured.

## Codebase Memory post-diff

- Full index refreshed after the final commit: 2,709 nodes / 7,452 edges; no skipped source files.
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
