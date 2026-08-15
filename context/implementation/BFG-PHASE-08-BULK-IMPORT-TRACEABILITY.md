# BFG PHASE 08 BULK IMPORT TRACEABILITY

Status: `READY FOR IMPLEMENTATION PLANNING`
Implementation: `NOT STARTED`
Prepared: 2026-08-16 (Asia/Jakarta)

Unknown future code locations are intentionally marked `TBD_IMPLEMENTATION`.
Existing functions below are reusable authority, not permission to bypass their
domain consequences with direct table inserts.

## Requirement-to-Consequence Matrix

| Source requirement | Bulk Import capability | Admin route | UI state | Domain mutation | Validation | Authorization | Audit | Customer consequence | Test | Production acceptance |
|---|---|---|---|---|---|---|---|---|---|---|
| `product/PRD.md`: reduce spreadsheet re-entry and keep the web system as source of truth | Bounded product-master CSV import | `/admin/import` `TBD_IMPLEMENTATION`; linked from `/admin/books` | Upload → validate → preview → confirm → result | Import orchestrator `TBD_IMPLEMENTATION` using shared publisher/book/variant primitives | Full file and row contract | `requirePermission(ctx, "books.manage")` | `bulk_import.completed` plus per-record events | New records remain hidden until explicit Admin lifecycle actions | Parser, orchestration, authorization, projection tests `TBD_IMPLEMENTATION` | Authorized 3–5 book real pilot; no dummy Production records |
| `screens/admin/05-upload-catalog.md`: import catalog data with validation preview | Template, CSV selection, server validation, no-write preview | `/admin/import` `TBD_IMPLEMENTATION` | `FILE_SELECTED`, `PARSING`, `VALIDATING`, `VALIDATION_FAILED`, `READY_FOR_REVIEW` | Read-only validation query `TBD_IMPLEMENTATION` | Exact headers, limits, normalization, error rows | Staff permission on server | No preview mutation/audit row | No customer change during preview | Zero-write preview test `TBD_IMPLEMENTATION` | Preview counts match the intentional file |
| `product/ROUTES.md`: conceptual `/admin/import` | Natural operational entry from Books, not Settings | `/admin/books` → `/admin/import` `TBD_IMPLEMENTATION` | Route loading, denied, empty, error, ready | No domain write for navigation | Route guard plus backend permission | Admin/Owner only | None for navigation | Customer routes unchanged | Route reachability and direct-call denial | 1024/1280/1440 route QA |
| `catalog/CATALOG_TAXONOMY.md`: publisher → Book → variant → ISBN/price | One row per variant; repeated Book identity groups variants | Same | Preview grouping and counts | `publishers`, `books`, `bookVariants` shared primitives `TBD_IMPLEMENTATION` | Publisher/title/format/ISBN/price rules | `books.manage` | Existing create events | Draft/inactive product only | Identity/variant tests | Admin can inspect created drafts |
| `catalog/BOOK_FORMAT_RULES.md`: ISBN and price belong to format | Required `format`, `isbn`, `price_idr` columns | Same | Row validation and no-op/conflict status | Variant creation `TBD_IMPLEMENTATION` | BB/PB/HB; ISBN checksum/global identity; positive integer IDR | `books.manage` | `book_variant.created` on creation | No order/invoice snapshot is created | ISBN/price/format tests | No historical financial data changes |
| `product/BUSINESS_RULES.md`: idempotency and immutable commercial snapshots | Exact existing canonical row becomes no-op; mismatch errors | Same | Preview warning/error and result counts | Atomic confirm `TBD_IMPLEMENTATION` | Existing ISBN and Book Master + format checks | Server revalidation | Summary fingerprint/counts | Existing customer data unchanged | Re-upload/conflict tests | Same file twice creates no duplicates |
| `database/DATA_INVARIANTS.md` and current schema | Global ISBN identity, active publisher, valid Book Master relation | Same | Row errors before confirm | Shared domain primitives `TBD_IMPLEMENTATION` | Indexed identity checks; no direct inserts | `books.manage` | Per-record audit | Projection gates remain canonical | Invariant tests | Customer-safe projection remains unchanged until activation |
| `database/TRANSACTION_RULES.md` and official Convex transaction contract | Validate whole plan, then one atomic mutation | Same | `IMPORTING`, `COMPLETED`, `IMPORT_FAILED` | One Convex mutation `TBD_IMPLEMENTATION` | Revalidate on confirm; fail on any conflict/limit | Permission checked inside mutation | Commit summary only on success | Zero partial product state | Late-row rollback test | Atomic real pilot evidence |
| `context/implementation/BFG-SECURITY-INVARIANTS.md` | No client-only authority, no mass assignment | Same | Denied and error states | Existing auth helper plus import boundary `TBD_IMPLEMENTATION` | Allow-listed fields, bounded values, safe text | Active Admin/Owner with `books.manage` | No secrets in metadata | No private data leakage | Direct unauthorized calls | Authorized role-scoped pilot |
| `context/implementation/BFG-FINANCIAL-INVARIANTS.md` | Product price only; no transactional import | Same | Price validation/error | No invoice/order/payment/deposit/refund mutation | Integer IDR; no negative/decimal/symbol input | `books.manage` | No financial audit consequence | Historical snapshots untouched | Financial side-effect tests | Finance records reconcile before/after |
| `context/security/FILE_UPLOAD_SECURITY.md` and current cover flow | No cover/media import | Same | No media controls in V1 | No storage mutation | No URL/storage ID columns | `books.manage` does not expand media scope | No storage metadata | No media visibility | Rejected-column tests | Separate media flow remains proven |
| `context/implementation/BFG-MOCKUP-TRACEABILITY-MATRIX.md` and Admin mockups 1–3 | Reuse BFG shell, catalog table, section cards, summary/status grammar | `/admin/books` entry; `/admin/import` `TBD_IMPLEMENTATION` | Coherent single flow, not six disconnected pages | UI-only future implementation `TBD_IMPLEMENTATION` | Accessible native file input and visible limits | Same server permission | Result/audit confirmation | No fake sample data | Component/Playwright visual tests `TBD_IMPLEMENTATION` | 1024/1280/1440 rendered comparison |
| `BFG-PHASE-08-CANDIDATES.md`: Bulk Import is P1 | First Phase 08 source contract | Same | Contract state only | No implementation in this task | Entry gate below | Separate implementation approval | Decision log | No Phase 08 customer changes | Full current regression remains green | Real pilot after implementation |

## Field Traceability

| Canonical field | Source basis | Destination | Identity/consequence | Implementation location |
|---|---|---|---|---|
| `publisher` | Catalog taxonomy; Admin catalog/upload source | `publishers.name/slug` | Exact normalized publisher key; inactive match rejects | Existing `convex/publishers.ts`; orchestration `TBD_IMPLEMENTATION` |
| `title` | PRD, catalog taxonomy, Book Master source | `books.title/slug` | Publisher + normalized title identity; title alone is invalid | Existing `convex/books.ts`; orchestration `TBD_IMPLEMENTATION` |
| `author` | Book Master metadata and upload mockup | `books.author` | Optional descriptive text; mismatch never overwrites | Existing `convex/books.ts`; `TBD_IMPLEMENTATION` |
| `description` | Book Master metadata and upload mockup | `books.description` | Optional descriptive text; no HTML execution | Existing `convex/books.ts`; `TBD_IMPLEMENTATION` |
| `categories` | Current schema/catalog surface | `books.categories` | Optional normalized set; no category entity mutation | `convex/lib/validation.ts`; `TBD_IMPLEMENTATION` |
| `format` | Book Format Rules | `bookVariants.format` | Book + format duplicate key | Existing `convex/bookVariants.ts`; `TBD_IMPLEMENTATION` |
| `isbn` | Book Format Rules and current schema index | `bookVariants.isbn` | Global normalized ISBN identity | Existing `convex/bookVariants.ts`; missing canonical normalization `TBD_IMPLEMENTATION` |
| `price_idr` | Financial invariants and Book Format Rules | `bookVariants.priceAmount`, system `IDR` | Positive safe integer; no history mutation | `convex/lib/validation.ts`; existing variant domain logic; `TBD_IMPLEMENTATION` |

## State Traceability

| State | Source/user intent | UI consequence | Backend consequence | Test requirement |
|---|---|---|---|---|
| `IDLE` | No file selected | Empty upload frame and template action | None | Initial/reset state |
| `FILE_SELECTED` | Operator selected candidate file | File name, limits, replace/reset | None | File guard |
| `PARSING` | File is being read | Progress/skeleton; controls disabled | None | Loading/abort |
| `VALIDATING` | Canonical validation runs | Validation progress; no confirm yet | Read-only query only | Server plan |
| `VALIDATION_FAILED` | File/row cannot be imported | Error table with row/field/value/problem/fix | No writes | Zero-write/error recovery |
| `READY_FOR_REVIEW` | Operator can inspect safe plan | Counts, warnings, preview table, confirm | No writes | Preview accuracy |
| `IMPORTING` | Operator confirmed | Progress; duplicate submit disabled | One authorized atomic mutation | Direct-call guard |
| `COMPLETED` | Full commit succeeded | Created/no-op/result summary and next Admin actions | Product + audit records committed | Projection/audit |
| `IMPORT_FAILED` | Commit failed | Safe error, retry/reset | Transaction rolled back | Late failure/rollback |

## Required Future Code Map

These locations are intentionally not invented:

| Concern | Current/reusable location | New location |
|---|---|---|
| Admin route | No active route; conceptual `/admin/import` in `product/ROUTES.md` | `TBD_IMPLEMENTATION` |
| CSV parser | No existing import parser | `TBD_IMPLEMENTATION` |
| Server preview | No existing import function | `TBD_IMPLEMENTATION` |
| Atomic confirm | No existing import mutation | `TBD_IMPLEMENTATION` |
| Publisher/book/variant primitives | `convex/publishers.ts`, `convex/books.ts`, `convex/bookVariants.ts` | Extract smallest shared helpers only if needed; `TBD_IMPLEMENTATION` |
| Audit | `convex/lib/audit.ts`, `auditEvents` table | Reuse; no new audit system |
| Permissions | `convex/lib/auth.ts` | Reuse `books.manage`; no new role |
| Template | No artifact yet | `TBD_IMPLEMENTATION` after approval |
| State machine | No implementation yet | `TBD_IMPLEMENTATION` |
| Tests | Existing product/policy/auth/audit tests | New files `TBD_IMPLEMENTATION` |

## Production Acceptance Trace

Before calling the implementation complete, the future agent must provide:

1. local full regression with no baseline-count regression;
2. local visual QA at 1024/1280/1440;
3. Development/staging pilot with an intentional 3–5 book client file;
4. invalid-file zero-write evidence;
5. atomic success and same-file retry evidence;
6. audit evidence without raw values/secrets;
7. Admin projection showing draft/inactive records;
8. customer projection proof that no record leaks before explicit activation;
9. explicit publication/stock/catalog follow-up only through canonical actions;
10. Production pilot with real operational records and an authorized role;
11. context/status/decision updates and a clean pushed `main`.

## Traceability Verdict

`TRACEABILITY: READY` for a separate implementation prompt. No implementation
route, parser, schema, mutation, UI, dependency, template, import job, or
actual implementation test was created by this task.
