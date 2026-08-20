# BFG PHASE 08 BULK IMPORT TRACEABILITY

Status: `PRODUCTION_DEPLOYED_PILOT_DEFERRED_BY_USER`
Implementation marker: `BFG_PHASE_08_BULK_IMPORT_V1_PRODUCTION_DEPLOYED_PILOT_DEFERRED_BY_USER`
Prepared and implemented: 2026-08-16 (Asia/Jakarta)

This document maps the locked Phase 08 Source Contract to the implementation.
The contract remains requirement authority; this file records evidence and
known acceptance gaps.

## Requirement-to-Implementation Matrix

| Requirement            | Implementation                                                                                                                                           | Evidence                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Natural Admin entry    | `Admin Books` has one secondary `Import Buku` action to `/admin/import`; no new top-level nav                                                            | Playwright route checks at 1024/1280/1440                |
| One coherent journey   | Stateful page renders Upload → Validasi → Pratinjau → Konfirmasi → Proses → Hasil                                                                        | `src/components/admin-bulk-import.tsx`; component test   |
| Exact CSV contract     | Eight exact headers, UTF-8 fatal decode, optional BOM, `.csv`, 2 MiB, 200 rows, 5,000 Unicode chars/cell                                                 | `convex/lib/bulkImport.ts`; parser tests                 |
| CSV correctness        | Quoted fields, commas, escaped quotes, multiline fields, CRLF/LF, empty optional cells, malformed-quote rejection                                        | `tests/lib/bulk-import.test.ts`                          |
| Zero-write preview     | `api.bulkImport.preview` only reads and returns a bounded plan; `previewWrites: 0`                                                                       | `convex/bulkImport.test.ts`                              |
| Server authority       | Preview and confirm call `requirePermission`; confirm reparses/replans from current database state                                                       | authorization and stale-preview tests                    |
| Atomic confirm         | One `api.bulkImport.confirm` mutation applies canonical inserts or throws before partial success can commit                                              | Convex transaction behavior; confirmation tests          |
| Domain reuse           | Shared `insertPublisher`, `insertBook`, `insertVariant` helpers route ordinary creates and import writes; audit reuses `recordAudit`                     | `convex/lib/productDomain.ts`; domain regression suite   |
| Identity and conflicts | NFKC publisher matching, publisher+title Book Master identity, normalized global ISBN, book+format uniqueness, whole-file conflict                       | Convex matching/conflict tests                           |
| Idempotency            | Exact existing publisher/book/format/ISBN/price is `Tanpa perubahan`; retry creates no duplicate                                                         | Convex retry test                                        |
| Publication safety     | New Book Master is draft/active; new variant is inactive; no publication input is accepted                                                               | Convex projection test                                   |
| Non-consequences       | No Ready Stock, Catalog, media, order, invoice, payment, deposit, refund, notification, or transaction writes                                            | schema/test count assertions and code review             |
| Audit                  | Per-record canonical create events plus one bounded `bulk_import.completed` summary with fingerprint/counts; no raw CSV                                  | audit test                                               |
| Visual grammar         | Current `AdminOperationalPage`, `PageHeader`, `Card`, `Button`, `StatusBadge`, custom hidden file input, contained table overflow, Indonesian-first copy | approved Admin mockup review; component and route checks |

## Field Traceability

| CSV field     | Canonical destination      | Rule                                                                        |
| ------------- | -------------------------- | --------------------------------------------------------------------------- |
| `publisher`   | `publishers.name/slug`     | NFKC, trim, collapsed whitespace, canonical slug key; inactive match fails  |
| `title`       | `books.title/slug`         | Required; Book Master identity is normalized publisher + normalized title   |
| `author`      | `books.author`             | Optional text; existing metadata conflicts, never silent overwrite          |
| `description` | `books.description`        | Optional bounded plain text; quoted/newline CSV content remains text        |
| `categories`  | `books.categories`         | Optional semicolon-separated normalized set; no category entity mutation    |
| `format`      | `bookVariants.format`      | Required allowlist: `BB`, `PB`, `HB`                                        |
| `isbn`        | `bookVariants.isbn`        | Required normalized ISBN-10/ISBN-13 with check digit; global conflict fails |
| `price_idr`   | `bookVariants.priceAmount` | Required positive safe integer digits only; currency is canonical `IDR`     |

## State Traceability

| State               | Entry/event               | UI/backend consequence                          | Test                     |
| ------------------- | ------------------------- | ----------------------------------------------- | ------------------------ |
| `IDLE`              | reset/initial             | Upload frame and template; no write             | component/state tests    |
| `FILE_SELECTED`     | `SELECT_FILE`             | Filename, size, replace/remove, validate        | component test           |
| `PARSING`           | `START_PARSE`             | Read-only operation loading; no fake percentage | state test               |
| `VALIDATING`        | `PARSE_SUCCESS`           | Server preview query; no confirm                | component/server flow    |
| `VALIDATION_FAILED` | parse/validation failure  | Errors remain available; no partial import      | parser/whole-file tests  |
| `READY_FOR_REVIEW`  | server validation success | Summary/table/confirmation; button guarded      | zero-write/preview tests |
| `IMPORTING`         | explicit `CONFIRM_IMPORT` | Disabled operation loading                      | state test               |
| `COMPLETED`         | `IMPORT_SUCCESS`          | Result counts and Admin next actions            | confirm test             |
| `IMPORT_FAILED`     | `IMPORT_FAILURE`          | Safe failure and revalidation/reset path        | stale/conflict test      |

Invalid transitions are rejected by `bulkImportTransition`, including
confirmation from `IDLE`, `VALIDATION_FAILED`, `PARSING`, and `VALIDATING`, and
success without confirmation. Backend authorization prevents unauthorized
preview or confirm regardless of UI state.

## Security and Consequence Traceability

- Authentication, active status, role, and `books.manage` are enforced in both
  public Convex functions; frontend guards are only reachability UX.
- Parsed row input is explicitly allow-listed by the eight canonical headers;
  arbitrary object fields are never spread into a write.
- Preview returns only row summaries, bounded values, warnings, and errors; no
  raw CSV or internal database payload is returned.
- The confirm mutation rebuilds the plan against current state, so a preview
  made at T1 cannot authorize a conflicting write at T2.
- New products remain outside customer projections until normal publication,
  activation, stock, or catalog workflows are intentionally performed.

## Code Map

| Concern                   | Location                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Admin route               | `src/app/admin/import/page.tsx`                                                                                                        |
| Admin flow                | `src/components/admin-bulk-import.tsx`                                                                                                 |
| Shared parser/rules/state | `convex/lib/bulkImport.ts`, `src/lib/bulk-import.ts`                                                                                   |
| Server preview/confirm    | `convex/bulkImport.ts`                                                                                                                 |
| Shared canonical inserts  | `convex/lib/productDomain.ts`                                                                                                          |
| Permission/audit          | `convex/lib/auth.ts`, `convex/lib/audit.ts`                                                                                            |
| Navigation entry          | `src/components/admin-books.tsx`                                                                                                       |
| Tests                     | `tests/lib/bulk-import.test.ts`, `tests/components/admin-bulk-import.test.tsx`, `convex/bulkImport.test.ts`, `tests/e2e/smoke.spec.ts` |

No schema, import-job table, parser dependency, queue, background job, file
retention path, or customer direct UI was added.

## Acceptance Evidence

- Vitest: `216/216`.
- Convex: `102/102`, including the locked 200-row preview shape.
- Playwright: existing `180/180` baseline plus three `/admin/import`
  signed-out route checks at 1024/1280/1440.
- TypeScript, ESLint, Format, Build, and `git diff --check`: PASS.
- Convex runtime review: 2 MiB/200-row input is below the verified Convex
  function argument, return, transaction, and write limits; the implementation
  keeps preview bounded and performs one transaction at confirm.
- Production deployment: Vercel `dpl_4dqW87MonmEnkPsiqa9VuvdKrUTi` (`READY`),
  Convex `clean-eel-522`.
- Remaining acceptance: authenticated rendered import states and a legitimate
  3–5-book Production pilot. No dummy Production data is permitted.

## User Decision Update — 2026-08-20

The Bulk Import V1 Production pilot is explicitly deferred by the user. The
implementation, locked CSV contract, parser, atomic confirm path, audit rules,
and deployed behavior remain unchanged. Final Production acceptance is not
claimed, and this deferral does not block the separately approved spacing and
Product Media source-contract milestone.

## Traceability Verdict

`TRACEABILITY: PRODUCTION_DEPLOYED_PILOT_DEFERRED_BY_USER`.
Bulk Import V1 is implemented, locally verified, and deployed; Phase 08
remains active, its final pilot is not accepted, and no Bulk Import code is
changed by the current milestone.
