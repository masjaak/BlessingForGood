# BFG PHASE 08 SOURCE CONTRACT

## Status

`SOURCE_CONTRACT_PREPARED` — `BULK_IMPORT` is the recommended first Phase 08
candidate. Phase 07.1 is `CLOSED + RECONCILED`. Phase 08 implementation is
`NOT_STARTED` and is not authorized by this document alone.

Prepared: 2026-08-16 (Asia/Jakarta)

This contract locks the bounded V1 decisions below. `FUTURE` and
`OUT_OF_SCOPE` items are deliberate boundaries, not implementation gaps.

## Objective

Provide a safe, repeatable Admin workflow for importing product-master data
from a small client spreadsheet export into the canonical BFG Book Master
domain. The workflow validates the whole file, shows an actionable preview,
requires confirmation, and commits only safe new product records.

## Why Phase 08 Exists

The original PRD identifies repetitive spreadsheet re-entry as an operational
problem and requires an Admin dashboard that does not use a spreadsheet as the
system of record. The original upload screen requires catalog-data import with
validation preview. The current BFG baseline has safe single-record publisher,
Book Master, and variant entry, but no bounded bulk-entry path.

The problem is operational scale, not customer transaction migration. Product
Bulk Import must never become a second order, invoice, payment, deposit, refund,
join-request, staff, or audit-history ingestion system.

## Source Documents

### Original source pack

The original source pack was read from
`/Users/masjak/Documents/BLESSINGFORGOOD/BFG WEB/context/`:

- `product/PRD.md` — spreadsheet re-entry problem, Book Master hierarchy,
  variant-level ISBN/price, and the Admin operational objective.
- `product/UX_FLOWS.md` — Admin first-run path from catalog to publisher and
  books; it does not define bulk-file semantics.
- `product/BUSINESS_RULES.md` — publisher/book/variant separation, immutable
  commercial snapshots, IDR, idempotent orders, and no dummy data.
- `product/SCOPE.md` — Admin catalog/books/publishers are in scope; advanced
  analytics and some integrations are deferred.
- `product/SUCCESS_CRITERIA.md` — first-run setup, integer IDR, stable
  snapshots, protected data, usable Admin tables, and actionable errors.
- `product/ROUTES.md` — conceptual `/admin/import` route.
- `product/PERMISSIONS.md` — original staff role model; current reconciled
  application roles supersede the old `operator` label.
- `product/OUT_OF_SCOPE.md` — payment gateway, WhatsApp automation, and
  unrelated operational expansion remain excluded.
- `screens/admin/04-catalog.md` — catalog table, desktop-first Admin, indexed
  tables, confirmation, and audit expectations.
- `screens/admin/05-upload-catalog.md` — `/admin/import`, catalog import, and
  validation preview; it does not define file type or fields.
- `screens/admin/06-batch-cargo-publisher.md` — multi-publisher batch context;
  it does not authorize importing batch or order records.
- `catalog/CATALOG_TAXONOMY.md`, `BOOK_FORMAT_RULES.md`, and
  `BATCH_CARGO_PUBLISHER.md` — publisher → Book Master → variant and the
  variant-level ISBN/price rule.
- `catalog/READY_STOCK_RULES.md` and `SECRET_CATALOG_RULES.md` — customer
  visibility and access consequences that Bulk Import must not bypass.
- `database/DATA_MODEL.md`, `DATA_INVARIANTS.md`, `TRANSACTION_RULES.md`,
  `INDEXES.md`, and `DELETION_POLICY.md` — snapshots, unique identity,
  transaction safety, indexes, and non-destructive correction.
- `security/AUTHORIZATION_RBAC.md`, `FILE_UPLOAD_SECURITY.md`, and
  `AUDIT_LOGGING.md` — server authorization, safe media boundaries, and audit
  metadata exclusions.
- `decisions/DECISIONS.md` and `OPEN_QUESTIONS.md` — approved source
  decisions and unresolved source gaps.

### Current reconciled BFG source

- `context/SOURCE_OF_TRUTH.md` — source precedence, current production
  baseline, Book Master authority, financial/security invariants, and V2 flow.
- `context/DECISION_LOG.md` — current decisions and the deferred bulk-import
  mapping/duplicate/rollback gap.
- `context/implementation/BFG-PHASE-08-CANDIDATES.md` — P1 ordering and the
  explicit need for a Source Contract before implementation.
- `context/implementation/BFG-BASELINE-RECONCILIATION-MATRIX.md`,
  `BFG-ROUTE-INVENTORY-V2.md`, `BFG-STATE-MACHINE-INDEX.md`,
  `BFG-SECURITY-INVARIANTS.md`, `BFG-FINANCIAL-INVARIANTS.md`,
  `BFG-ADMIN-CUSTOMER-SYNC-MATRIX.md`, and
  `BFG-MOCKUP-TRACEABILITY-MATRIX.md` — canonical current behavior and
  visual/authority boundaries.
- `public/mockups/admin/admin dashboard 1.png` — operational shell and
  dashboard entry language.
- `public/mockups/admin/admin dashboard 2.png` — catalog table, `Import Data`
  action, filters, status badges, and dense desktop table grammar.
- `public/mockups/admin/admin dashboard 3.png` — upload/catalog form sections,
  draft/preview/publish action grammar, and visual history. Its cover,
  gallery, external-preview, cargo, catalog, and publish controls are not
  automatically Bulk Import V1 requirements.
- `src/lib/excel-export.ts` — existing CSV export with formula-safe cell
  escaping; it is not an import parser.

### Platform feasibility source

The implementation plan uses the current official Convex limits and
transaction behavior: [Convex limits](https://docs.convex.dev/production/state/limits),
[argument validation](https://docs.convex.dev/functions/validation), and
[transaction guarantees](https://docs.convex.dev/components/using). The
contract keeps V1 far below the current platform ceilings and requires a
final implementation check against the selected deployment class.

## Explicit User / Client Decisions

- Bulk Import is the recommended first Phase 08 P1 candidate because real
  product-entry operations now justify reducing repetitive entry work.
- Source Contract → Visual Contract → Traceability Contract comes before any
  code, schema, parser, dependency, or deployment.
- Product-master import must be separated from transactional data import.
- Existing canonical records must never be silently overwritten.
- Customer publication must be explicit; import success is not publication.
- No dummy Production business data may be created for UAT.
- Payment Gateway and automatic WhatsApp automation remain excluded.
- Current application authority is Clerk + Convex + `appUsers`; the current
  application roles are `admin` and `owner` for this operation. The historical
  source term `operator` is not a new permission.
- Integer IDR, immutable commercial snapshots, reservation invariants,
  server-side authorization, and existing audit architecture remain locked.

## Current Production Baseline

- Phase 07.1: `BFG_PHASE_07_1_PRODUCT_SURFACE_STABILIZED` — `CLOSED + RECONCILED`.
- Baseline reconciliation: `BFG_PHASE_07_1_BASELINE_RECONCILED`.
- Development system: `BFG_AGENT_DEVELOPMENT_SYSTEM_V2_ACTIVE`.
- Convex Development: `content-snake-214`.
- Convex Production: `clean-eel-522`.
- Application baseline before this source-contract documentation: lock commit
  `e2ad4a3`.
- Vitest: `194/194`.
- Convex: `94/94`.
- Playwright: `180/180`.
- TypeScript, ESLint, format, and build: PASS.
- No Phase 08 route, parser, schema, mutation, UI, dependency, import job,
  template file, or implementation test exists.

## Primary Candidate

`BULK IMPORT` — P1, first Phase 08 candidate.

The P0 backlog is empty. Product Gallery / External Preview Metadata,
Advanced Analytics, Backup / Restore Operations, and Cross-domain Admin Search
remain separate candidates and are not folded into this contract.

## Problem

Admin/Owner must repeatedly enter publisher, title, book metadata, format,
ISBN, and price one record at a time when a client spreadsheet already contains
the product list. Bulk Import removes that repetitive product-master re-entry
while preserving canonical Book Master identity and explicit publication.

It does not solve:

- importing customer orders or financial history;
- automatically publishing a spreadsheet;
- setting inventory by overwriting reservations;
- assigning customer access or sending notifications;
- importing cover/gallery or arbitrary external media.

## User Role

Admin and Owner with the existing `books.manage` permission. The backend must
call the canonical permission helper; a hidden or visible button is not an
authorization boundary. Customer, visitor, suspended users, and any identity
without an active `appUsers` record cannot preview or confirm an import.

## Business Objective

Make a small, legitimate client spreadsheet the fastest safe path to draft
Book Master records, with enough preview information for an operator to catch
bad data before any mutation. Keep the canonical database as the only product
source of truth and leave all customer/financial consequences explicit.

## Required Capabilities

1. Download the documented canonical CSV template.
2. Select one UTF-8 CSV file and show parsing/validation progress.
3. Validate the file shape, exact headers, field limits, normalization,
   ISBN identity, publisher matching, Book Master matching, variant matching,
   and price rules on the server.
4. Show a no-write preview with totals, new/existing/no-op counts, warnings,
   and row-level correction guidance.
5. Require an explicit confirmation after the preview.
6. Revalidate the submitted plan in the confirming server mutation.
7. Commit the whole confirmed plan atomically, or commit nothing.
8. Create only safe new product-master records and reuse existing exact
   records as idempotent no-ops.
9. Record the operator and bounded import summary through existing audit
   events, plus the existing per-record audit consequences.
10. Return a result that distinguishes created records, no-op rows, warnings,
    and errors without raw stack traces.
11. Reset the flow without retaining the raw file or product rows as a new
    long-term data model.

## Existing Architecture

| Need | Existing primitive | Contract use |
|---|---|---|
| Publisher create/match | `convex/publishers.ts` | Reuse its normalization/audit consequence through a shared domain primitive; exact normalized match, no fuzzy merge. |
| Book Master create/update | `convex/books.ts` | Create new books as drafts; do not use update for Bulk Import V1. |
| Variant create/update | `convex/bookVariants.ts` | Create new variants through shared validation; new import variants remain inactive until explicit activation. |
| Money/categories/text | `convex/lib/validation.ts` | Reuse `requiredText`, `slugify`, `normalizedCategories`, and `positiveMoney`; add only missing canonical normalization later. |
| Authorization | `convex/lib/auth.ts` | Reuse `requirePermission(ctx, "books.manage")`. |
| Audit | `convex/lib/audit.ts` | Reuse `recordAudit`; no second audit system. |
| Ready Stock | `convex/readyStock.ts` | Do not call from import; inventory remains unchanged. |
| Catalog assignment | `convex/catalogItems.ts` | Do not call from import; assignment remains explicit Admin work. |
| Cover upload | `convex/books.ts`, `convex/lib/storage.ts` | Do not call from import; durable upload remains the proven media path. |
| CSV export | `src/lib/excel-export.ts` | Reuse its formula-safe behavior for any future export; it does not define input parsing. |
| Admin shell | `AdminOperationalPage`, `AdminNav`, `PageHeader` | Reuse current BFG operational layout. |
| Admin controls | `Button`, `Card`, `StatusBadge`, `SkeletonTable`, `ErrorState`, `EmptyState`, `BFGSelect` | Reuse existing visual grammar; no generic SaaS import kit. |
| Current route | `BFG-ROUTE-INVENTORY-V2.md` | `/admin/import` is source-supported but currently absent; future route is `TBD_IMPLEMENTATION` and should be linked from `/admin/books`. |

The current public mutations are not a safe instruction to call one public
mutation from another. Implementation must extract the smallest shared domain
primitives, keep the existing public mutations using them, and have the import
orchestrator use those same primitives. It must not directly insert rows into
`publishers`, `books`, `bookVariants`, or audit tables as a shortcut.

## Data Contract

The complete field-level contract is locked in
[`BFG-BULK-IMPORT-DATA-CONTRACT.md`](BFG-BULK-IMPORT-DATA-CONTRACT.md).

V1 is one row per Book Master variant. Repeating the same publisher and title
for different formats is valid. The canonical columns are:

```text
publisher,title,author,description,categories,format,isbn,price_idr
```

The following are not accepted columns in V1: `publication_status`, `stock`,
`on_hand`, `reserved`, `available`, `catalog`, `catalog_slug`, `batch`,
`deadline`, `cover_url`, `cover_upload`, `gallery`, `preview_url`, `order`,
`invoice`, `payment`, `deposit`, `refund`, `customer`, `admin`, or arbitrary
extra columns.

## State Model

The semantic state machine is UI state plus server mutation outcome; it is not
an import-job table.

| State | Meaning | Allowed next events |
|---|---|---|
| `IDLE` | No selected file or plan. | `SELECT_FILE` |
| `FILE_SELECTED` | A candidate file exists; metadata has passed the immediate client guard. | `START_PARSE`, `RESET`, `SELECT_FILE` |
| `PARSING` | CSV bytes are being parsed without database writes. | `PARSE_SUCCESS`, `PARSE_FAILURE`, `RESET` |
| `VALIDATING` | Server-authoritative shape/domain validation is running without database writes. | `VALIDATE_SUCCESS`, `VALIDATE_FAILURE`, `RESET` |
| `VALIDATION_FAILED` | File or rows are not importable; errors are actionable. | `SELECT_FILE`, `RESET` |
| `READY_FOR_REVIEW` | The complete server validation plan is previewable and no writes occurred. | `CONFIRM_IMPORT`, `SELECT_FILE`, `RESET` |
| `IMPORTING` | The confirmed plan is being committed by one authorized mutation. | `IMPORT_SUCCESS`, `IMPORT_FAILURE` |
| `COMPLETED` | The atomic commit succeeded; result counts and audit confirmation are shown. | `SELECT_FILE`, `RESET` |
| `IMPORT_FAILED` | The commit failed; the transaction has no partial product writes. | `SELECT_FILE`, `CONFIRM_IMPORT`, `RESET` |

### Events and guards

| Event | Required guard | Transition |
|---|---|---|
| `SELECT_FILE` | File is supported and within immediate size bounds. | `IDLE`/terminal/error → `FILE_SELECTED` |
| `START_PARSE` | A selected file exists. | `FILE_SELECTED` → `PARSING` |
| `PARSE_SUCCESS` | CSV syntax, encoding, and row shape are readable. | `PARSING` → `VALIDATING` |
| `PARSE_FAILURE` | Parser returns a safe, user-facing parse error. | `PARSING` → `VALIDATION_FAILED` |
| `VALIDATE_SUCCESS` | Authorized user, exact headers, limits, valid rows, and safe duplicate plan. | `VALIDATING` → `READY_FOR_REVIEW` |
| `VALIDATE_FAILURE` | One or more file/row errors are collected. | `VALIDATING` → `VALIDATION_FAILED` |
| `CONFIRM_IMPORT` | Active Admin/Owner, confirmation action, unchanged supported plan, server revalidation. | `READY_FOR_REVIEW`/retryable `IMPORT_FAILED` → `IMPORTING` |
| `IMPORT_SUCCESS` | The canonical mutation returns a committed result. | `IMPORTING` → `COMPLETED` |
| `IMPORT_FAILURE` | Mutation throws or the server detects a concurrent conflict. | `IMPORTING` → `IMPORT_FAILED` |
| `RESET` | None. | Any state → `IDLE` |

### Invalid transitions

- `IDLE → IMPORTING` is invalid: a file, validation, preview, and confirmation
  are required.
- `VALIDATION_FAILED → IMPORTING` is invalid: the complete file must pass
  validation first.
- `READY_FOR_REVIEW → COMPLETED` without `CONFIRM_IMPORT` and a successful
  import is invalid.
- An unauthorized user cannot reach `CONFIRM_IMPORT` or the confirming
  mutation, even if the UI state is forged.
- `PARSING → IMPORTING`, `VALIDATING → IMPORTING`, and `IMPORT_FAILED →
  COMPLETED` without a new successful mutation are invalid.

## Authorization

- Route and UI may hide the feature from non-staff users, but the server must
  require an active user with `books.manage` for validation that reads private
  product data and for the confirming mutation.
- `customer`, visitor, missing `appUsers`, and suspended users fail closed.
- Owner-only system surfaces are not required; Admin and Owner use the existing
  Books permission boundary.
- The import payload is an allow-listed object. Spreadsheet columns cannot
  select arbitrary tables, fields, IDs, status values, or mutation names.

## Validation

### File and header validation

- V1 accepts CSV only: UTF-8, optional UTF-8 BOM, comma delimiter, quoted
  fields, CRLF or LF line endings, `.csv` extension.
- Accepted MIME declarations are `text/csv`, `application/csv`, or the common
  Excel CSV declaration only when the extension and content are CSV. MIME is
  advisory; content parsing is authoritative.
- `.xlsx`, `.xls`, macro-enabled files, multiple worksheets, and formulas are
  future/out of scope for V1.
- Maximum raw file size: `2 MiB`.
- Maximum data rows: `200` (header excluded).
- Maximum cell text: `5,000` Unicode characters; field-specific limits in the
  data contract are stricter where the destination is smaller.
- Header set and canonical order must exactly match the template. Duplicate,
  missing, unknown, or reordered headers fail before row validation.
- Trailing blank lines may be ignored; a partially populated data row is an
  error, not a blank row.

### Row validation

- Normalize before matching; retain the first valid display spelling for new
  records.
- ISBN is required, normalized, and checksum-validated before uniqueness
  checks.
- `price_idr` is a positive safe integer with no currency symbol, decimal,
  thousands separator, sign, or non-numeric text.
- `format` is one of the current canonical values: `BB`, `PB`, or `HB`.
- Publisher and title are required; optional author, description, and category
  values are bounded and stored as text, never interpreted as HTML.
- Exact duplicate ISBNs within one file fail. Repeated publisher/title rows
  are allowed only when they describe distinct variants with consistent book
  metadata.
- Existing exact canonical records are no-op rows; any identity or commercial
  mismatch is an error, never an update or merge.

### Preview summary

The preview must show, at minimum:

- total data rows;
- valid rows and invalid rows;
- new publishers and existing publishers;
- new Book Masters and existing Book Masters;
- new variants and idempotent no-op rows;
- duplicate/conflict rows;
- warnings, including new publisher/book creation and inactive-entity
  corrections required outside the import;
- the explicit result that preview performed zero mutations.

### Error handling

Every validation error is rendered as:

```text
Row: spreadsheet row number (header is row 1)
Field: canonical column
Value: safely escaped, length-limited display value
Problem: stable human-readable explanation
Correction: concrete next action
```

Examples:

```text
Row 18 · isbn · 978… · ISBN already exists for another variant · edit the row or use Book Master manually; import never overwrites it.
Row 22 · price_idr · Rp 175.000 · price must be a positive integer IDR without symbols or separators · enter 175000.
Row 31 · publisher · walker books · exact publisher key matches an inactive publisher · reactivate the publisher before importing.
```

Raw stack traces, database IDs, access-code material, and private environment
values are not shown to the operator.

## Audit Requirements

- Use existing `recordAudit` and `auditEvents`; do not add a second audit
  system.
- Existing shared publisher/book/variant primitives record their per-record
  create consequences.
- A successful confirm records one bounded `bulk_import.completed` event with
  the operator from `actorUserId`, a non-reversible import fingerprint, file
  type, total rows, created counts, no-op count, updated count (`0` in V1), and
  warning count.
- Do not store raw file contents, full row values, access codes, tokens,
  credentials, or unnecessary personal data in audit metadata.
- Preview-only validation does not write an audit row because it is a no-write
  query. A failed atomic import does not create product writes; a later
  operational logging decision must not weaken that guarantee.

## Admin → Customer Consequences

| Imported result | Admin consequence | Customer consequence |
|---|---|---|
| New publisher | Active publisher master record. | No direct customer surface. |
| New Book Master | Draft, active master record with no media. | Not visible. |
| New variant | Existing format/ISBN/price domain record, inactive until explicit activation. | Not orderable or visible through customer projections. |
| Existing exact row | No-op; no record is changed. | No change. |
| Publication | Never set by import. Admin must use canonical Book Master publication action. | Visible only after server publication/projection rules pass. |
| Ready Stock | Never set by import. Admin must use explicit inventory workflow. | Visible only after publication, active variant, and positive `onHand - reserved`. |
| Secret Catalog | Never assigned by import. Admin must explicitly add a variant. | No catalog access or customer notification is created. |
| Cover/media | Never imported. | No media consequence. |
| Transactional data | Rejected as an unknown/forbidden field or unsupported scope. | No order, invoice, payment, deposit, refund, exception, or notification consequence. |

No customer notification is created per imported book. A single Admin-facing
completion result is sufficient; customer notification is not source-defined.

## Visual Contract

The flow should use the existing BFG Admin operational surface:

- `AdminOperationalPage`, `AdminNav`, and `PageHeader` provide the route shell;
- the natural entry is the existing `/admin/books` surface with `Import Buku`
  action; the source-supported `/admin/import` route is
  `TBD_IMPLEMENTATION` until code is authorized;
- the upload state uses an existing BFG `Card`/form frame, native file input,
  clear file constraints, and a visible `Download template` action;
- preview uses existing `Card` summary frames, `StatusBadge`, the canonical
  Admin table treatment, and the existing BFG button hierarchy;
- row errors use the same table density and status grammar, with an inline
  correction panel or table detail rather than raw technical output;
- confirmation stays in the same coherent flow and uses existing BFG controls;
  no unrelated wizard framework or generic SaaS import design is introduced;
- `CoverUploadField` and media/gallery controls are not reused because media
  import is explicitly out of scope;
- the visual reference is BFG’s cream/green operational shell and the catalog
  table/form sections in the inspected mockups, with sample “My Bookshelf”
  data and branding replaced by current BFG assets and no fake records.

## Responsive Requirements

Admin is desktop-first. Rendered QA for the future implementation is required
at `1440`, `1280`, and `1024` widths.

- At 1440, upload, preview summary, and table should fit the existing Admin
  workspace rhythm without inventing a dashboard.
- At 1280, the table remains readable and the primary confirmation action is
  visible without header wrapping.
- At 1024, the table may use horizontal scrolling inside the existing table
  frame; the page must not silently hide error columns or actions.
- Mobile is not a primary optimization target, but the native file control,
  keyboard path, focus states, error text, and confirmation must remain
  accessible.

## Explicit Non-goals

- No orders, invoices, payments, deposits, refunds, exceptions, Join Requests,
  Admin users, or audit-history import.
- No XLSX/XLS parser or spreadsheet dependency in V1.
- No Ready Stock quantity import or direct inventory overwrite.
- No Secret Catalog assignment, batch/cargo assignment, deadline, or customer
  access generation.
- No publication-state column or automatic publish.
- No cover upload, gallery, arbitrary external URL, Amazon/Instagram/YouTube
  preview metadata, or external media fetch.
- No fuzzy publisher matching, automatic typo correction, merge UI, or
  destructive update behavior.
- No partial import, per-row commit, background import-job infrastructure,
  long-term raw-file retention, or notification fan-out.
- No new dependency, route, parser, Convex schema, mutation, UI, template
  artifact, or actual implementation test in this task.

## Security Constraints

- Validate identity, active BFG user, `books.manage`, allowed columns, lengths,
  encoding, file limits, and canonical data on the backend.
- Treat all spreadsheet strings as data. Never evaluate formulas, HTML, scripts,
  URLs, or spreadsheet objects. Future exports must reuse the existing
  formula-safe `toExcelCsv` helper.
- Reject unknown fields to prevent mass assignment.
- Do not accept storage IDs, Convex IDs, status transitions, permissions, or
  arbitrary destination tables from the file.
- Do not log raw file contents or sensitive values. File names and fingerprints
  are untrusted metadata and must be bounded/hashed before audit use.
- A concurrent change between preview and confirm causes server revalidation to
  fail safely; it must not produce a partial commit.

## Financial Constraints

- Price is positive integer IDR only.
- Import never creates or edits orders, invoices, payment confirmations,
  deposit ledger rows, refund obligations/payouts, exceptions, or historical
  snapshots.
- Existing order and invoice snapshots remain immutable.
- Import never changes `onHand`, `reserved`, or `available` stock and never
  calls a reservation or fulfillment helper.
- No payment gateway or automatic settlement consequence is allowed.

## Data Integrity Constraints

- ISBN is the global identity key for `bookVariants` after normalization.
- A Book Master is matched by normalized publisher + normalized title, never by
  title alone.
- A variant is also unique by Book Master + format; conflicting existing
  variants fail instead of being overwritten.
- One normalized publisher key maps to one canonical publisher. Existing
  inactive publishers are not silently reactivated.
- New product records are drafted/inactive for customer publication purposes.
- Exact re-upload is idempotent through canonical ISBN and exact-content
  matching; no import fingerprint table is needed for V1.
- Corrections after import use normal edit/archive/deactivation controls and
  preserve audit/history. Bulk deletion is not rollback.

## Production Constraints

- Development and Production Convex deployments remain separated.
- No Production import pilot is run in this task.
- Future initial limits are `2 MiB`, `200` data rows, `5,000` Unicode
  characters per cell, and eight allowed columns. Implementation must verify
  these limits against the selected Convex deployment class and lower them if
  the measured transaction budget requires it; it must not silently switch to
  partial commits.
- The one-mutation atomic path is intentionally bounded. Current official
  Convex limits include a 1-second query/mutation compute limit, 16 MiB
  function argument/return ceilings, transaction read/write ceilings, and
  deployment-class write throughput limits. The V1 cap leaves a practical
  margin and is not an enterprise-scale promise.
- Real UAT uses legitimate client records only; no dummy Production data.

## Success Criteria

Future implementation acceptance is measurable:

- Admin can reach `Import Buku` from `/admin/books` and download the canonical
  CSV template.
- A valid file within the limits reaches a preview with accurate totals,
  publisher/book/variant/no-op counts, and no database writes.
- A malformed, invalid, duplicate, unauthorized, oversized, or unknown-column
  file produces actionable errors and zero writes.
- Confirming a valid plan creates canonical publisher/Book Master/variant
  records atomically and records audit consequences.
- Existing exact records are idempotent no-ops; ISBN/variant conflicts are
  never silently updated, skipped, or merged.
- Imported records remain customer-hidden until explicit publication,
  activation, inventory setup, or catalog assignment through existing flows.
- Retry/re-upload creates no accidental duplicates and does not change
  historical finance data.
- No customer notification is emitted per row.
- The complete flow passes local tests, 1024/1280/1440 rendered QA, and a
  small authorized real pilot.

## Required Tests

The future implementation must add the smallest complete regression set:

- CSV encoding, quoting, line endings, blank-row, header-order, unknown-field,
  MIME/extension, file-size, row-count, and cell-length tests;
- normalization and ISBN-10/ISBN-13 check-digit tests;
- integer IDR and forbidden currency-format tests;
- publisher exact-match, whitespace/case normalization, inactive publisher,
  typo/no-fuzzy-match, and in-file duplicate tests;
- Book Master + publisher matching, metadata conflict, slug collision, variant
  format, and global ISBN conflict tests;
- preview zero-write test;
- all-or-nothing rollback test when a late row fails or a concurrent conflict
  appears;
- exact re-upload/no-op and changed-existing-record/error tests;
- direct unauthorized Admin/customer/suspended-user backend tests;
- audit metadata safety and per-record audit consequence tests;
- no stock/catalog/media/publication/transaction side-effect tests;
- state-machine invalid-transition tests for every invalid transition above;
- UI loading, parse error, validation error, preview, confirmation, progress,
  completion, import failure, reset, keyboard, and accessible file-input tests;
- Playwright route and responsive checks at 1024/1280/1440.

New test file locations are `TBD_IMPLEMENTATION`; existing product, policy,
authorization, storage, and audit tests are reusable regression anchors.

## Required Real UAT

Do not run this pilot in the current task. After implementation and deployment,
use one small intentional client spreadsheet containing three to five legitimate
books:

- one new publisher;
- one existing publisher;
- one new Book Master;
- one additional variant on an existing Book Master, if the final
  implementation supports that idempotent/new-variant path;
- one duplicate ISBN conflict;
- one intentional validation error.

Run the same file first in the authorized Development/staging workflow, then a
small Production pilot only with an authorized Admin/Owner identity and real
operational product records. Record preview counts, zero-write invalid result,
atomic success, audit result, hidden customer projection, explicit activation
consequences, and safe re-upload. Never seed mockup values or dummy business
records.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Duplicate ISBN | Medium | High | Normalize/checksum ISBN; global identity lookup; exact no-op only; mismatch is an error. |
| Duplicate publisher | Medium | Medium | Exact normalized slug match; one in-file publisher plan; no fuzzy merge. |
| Wrong price | Medium | High | Positive integer IDR only; preview; existing mismatch errors; no historical updates. |
| Accidental publication | Medium | High | No publication column; new books draft; new variants inactive; explicit Admin activation. |
| Inventory corruption | Low | Critical | No stock columns or inventory mutation; explicit Ready Stock workflow only. |
| Catalog misassignment | Low | High | No catalog column or assignment in V1; explicit post-import action only. |
| Partial import | Medium | Critical | Validate whole file; one confirmed atomic mutation; no valid-row partial mode. |
| Operator retry | Medium | High | Canonical ISBN/idempotent exact-content no-op; mismatch errors; no fingerprint infrastructure required. |
| Huge file | Medium | High | 2 MiB/200-row/5,000-cell limits; reject before mutation; no silent batching. |
| Malformed spreadsheet | High | Medium | Strict CSV parser, exact headers, row-level errors, safe reset/retry. |
| Unauthorized mass mutation | Low | Critical | Backend `books.manage`, allow-listed fields, no client-only authorization. |
| Audit gaps | Low | High | Reuse shared audit primitive plus one bounded import summary event. |
| Wrong customer-visible data | Medium | Critical | Draft/inactive defaults, server projections, explicit publication/catalog/stock gates, pilot verification. |
| Formula/script payload | Low | High | Treat cells as text, reject unsupported structures, escape any future export with existing helper. |

## Open Questions

There are `0` material open product questions for Bulk Import V1. The
recommendations below are adopted as the contract; they are not implementation
improvisation. No unresolved `OPEN_PRODUCT_DECISION` remains for V1; future
enhancements are explicitly classified as `FUTURE` or require a separate
source contract:

| Topic | Recommendation | Why | Trade-off | Backup |
|---|---|---|---|---|
| CSV or XLSX | CSV only for V1. | Source is silent; current stack already exports CSV and CSV keeps parsing/attack surface bounded. | Operators must save spreadsheet workbooks as UTF-8 CSV; no formulas or multiple sheets. | Add XLSX only after a separate format contract and operational evidence. |
| Catalog assignment | Exclude from V1. | Source does not define catalog lookup, closed-catalog behavior, or customer access consequences. | A second explicit Admin step is required. | Define a separate catalog-assignment contract later. |
| Stock | Exclude from V1. | `onHand`, `reserved`, and `available` have reservation invariants. | Initial stock is entered through the existing inventory workflow. | Add a separate inventory-adjustment contract with ledger/concurrency rules. |
| Existing record update | No update/merge in V1. | Source requires safe product entry but does not authorize overwrite semantics. | Corrections remain manual and slower. | Add explicit update/merge policy after real import usage. |
| Cover/media | Exclude from V1. | Durable upload is proven and external preview metadata is a separate P1 candidate. | Media is attached after import. | Use the existing validated storage flow under its own contract. |
| Import history | One audit summary, no import-job table. | Source requires auditability, not a new operational history domain. | Long-term row-by-row replay UI is absent. | Add a job table only when audit evidence shows the summary is insufficient. |

## Blockers

No blocker prevents source-contract preparation. Implementation must wait for a
separate Phase 08 implementation prompt/approval. Production pilot acceptance
also requires an authorized real operator identity and legitimate client
records; that is an acceptance prerequisite, not permission to create dummy
data.

## Codebase Memory

### Reusable domain logic

- `publishers.create` / `update` already enforce `books.manage`, required text,
  slug uniqueness, and audit.
- `books.create` / `update` already enforce active publisher, title/slug,
  categories, publication status, and audit.
- `bookVariants.create` / `update` already enforce Book Master identity,
  format uniqueness, ISBN uniqueness, positive IDR, availability, and audit.
- `readyStock.setQuantity` preserves `reservedQuantity`; it must not be used
  by Bulk Import.
- `catalogItems.add` is the explicit catalog assignment; it must not be used
  by Bulk Import.
- `recordAudit`, `requirePermission`, `normalizedCategories`, `positiveMoney`,
  `requiredText`, and `slugify` are the existing shared primitives.

### Required new architecture

Only the minimum new orchestration is expected after approval:

- a bounded CSV parsing/normalization boundary;
- a read-only server validation/preview path;
- a single atomic confirm path;
- shared domain primitives extracted only where the current public mutations
  need reuse;
- a small Admin flow using existing shell/table/button primitives.

`TBD_IMPLEMENTATION` marks new route/function/test locations. No import-job
table, background worker, dependency, media path, or transaction subsystem is
justified by the V1 contract.

### Ponytail findings

- Reuse existing permission, validation, audit, Book Master, and Admin table
  primitives.
- Orchestrate canonical domain consequences; do not duplicate them with
  direct table inserts.
- Use CSV because the source is silent and existing CSV export is enough for a
  bounded first version; do not add `xlsx`/`papaparse` before evidence requires
  them.
- Use one atomic mutation at the bounded row cap; do not build partial batches,
  resumable jobs, queues, or a durable import-job model without a measured
  limit problem.
- Keep media, stock, catalog assignment, and publication as explicit normal
  Admin actions.

## Implementation Entry Gate

Phase 08 Bulk Import implementation may begin only when all of the following
remain true:

```text
SOURCE: RESOLVED
SCOPE: LOCKED
FILE FORMAT: LOCKED
COLUMN CONTRACT: LOCKED
DUPLICATE POLICY: LOCKED
PUBLISHER MATCHING: LOCKED
BOOK / VARIANT MATCHING: LOCKED
PRICE POLICY: LOCKED
PUBLICATION POLICY: LOCKED
STOCK POLICY: LOCKED
CATALOG POLICY: LOCKED
PREVIEW: LOCKED
PARTIAL / ATOMIC: LOCKED
ROLLBACK: LOCKED
IDEMPOTENCY: LOCKED
AUTHORIZATION: LOCKED
AUDIT: LOCKED
SECURITY: LOCKED
VISUAL CONTRACT: LOCKED
STATE MACHINE: LOCKED
TRACEABILITY: READY
OPEN MATERIAL QUESTIONS: 0
IMPLEMENTATION: NOT STARTED UNTIL SEPARATE PROMPT
```

The field-level contract, policy, and traceability documents are:

- [`BFG-BULK-IMPORT-DATA-CONTRACT.md`](BFG-BULK-IMPORT-DATA-CONTRACT.md)
- [`BFG-BULK-IMPORT-POLICY.md`](BFG-BULK-IMPORT-POLICY.md)
- [`BFG-PHASE-08-BULK-IMPORT-TRACEABILITY.md`](BFG-PHASE-08-BULK-IMPORT-TRACEABILITY.md)
