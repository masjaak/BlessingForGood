# BFG BULK IMPORT POLICY

Status: `LOCKED FOR BULK IMPORT V1`
Phase 08: `SOURCE CONTRACT PREPARED; IMPLEMENTATION NOT STARTED`
Prepared: 2026-08-16 (Asia/Jakarta)

This policy is the decision authority for the future Bulk Import
implementation. It applies only to product-master CSV import.

## Scope

### Allowed

- publisher master records;
- Book Master title metadata;
- optional author and category values stored on Book Master;
- variant format, ISBN, and integer IDR price.

### Forbidden

- orders, invoices, payments, deposit ledger entries, refunds, exceptions,
  Join Requests, Admin users, or audit-history rows;
- Ready Stock `onHand`, `reserved`, or `available` values;
- Secret Catalog assignment, access codes, grants, sessions, or customer
  notifications;
- batch/cargo links or deadlines;
- cover uploads, gallery media, and arbitrary external preview URLs;
- publication-state input or automatic publication;
- arbitrary columns, Convex IDs, status values, or mass-assignment payloads.

## File and Plan Policy

- CSV only for V1, with the exact header contract in
  [`BFG-BULK-IMPORT-DATA-CONTRACT.md`](BFG-BULK-IMPORT-DATA-CONTRACT.md).
- Maximum file size is 2 MiB, maximum data rows are 200, and maximum cell text
  is 5,000 Unicode characters.
- The client may parse for immediate UX, but only server validation creates the
  import plan.
- Preview creates no database writes and does not retain the raw file.
- Confirm submits an allow-listed normalized plan, not arbitrary spreadsheet
  objects or destination IDs.

## Atomic / Partial

The policy is **all or nothing**:

```text
parse
→ validate the whole file
→ preview with zero writes
→ explicit Admin/Owner confirmation
→ server revalidation
→ one atomic Convex mutation
→ completed or rolled back
```

There is no valid-row partial mode and no batched transaction mode in V1. A
single invalid row, duplicate, conflict, authorization failure, concurrent
change, or transaction-limit failure rejects the complete plan. Convex mutation
transaction semantics provide the required rollback of writes when the
mutation fails. The bounded 200-row cap is part of this policy; it is not a
promise to support enterprise-scale files.

## Duplicate Policy

### Publisher

- Normalize with Unicode NFKC, outer trim, collapsed whitespace, and the
  canonical BFG slug key.
- Exact normalized matches reuse the active publisher.
- Repeated new keys in one file share one planned publisher.
- Inactive matches are errors; import never reactivates them.
- Fuzzy matching, typo correction, and merge are not performed.

### Book Master

- Match by normalized publisher key + normalized title key.
- Never match by title alone.
- A new ISBN may add a new variant to an existing matched Book Master when its
  format is not already present and supplied metadata is consistent.
- Existing identity ambiguity or metadata conflict rejects the whole file.
- Existing Book Masters are never updated, rehomed, merged, or demoted by
  import.

### Variant and ISBN

- Normalize ISBN by removing spaces/hyphens, uppercasing ISBN-10 `X`, retaining
  leading zeroes, and validating the ISBN-10/ISBN-13 check digit.
- ISBN is globally unique across all `bookVariants`.
- Book Master + format is also unique.
- An exact existing ISBN/book/format/price is an idempotent no-op.
- An existing ISBN with any mismatch is an error, never SKIP, UPDATE, or MERGE.
- A repeated ISBN inside the same file is an error even if its rows are equal.
- V1 has no implicit update policy.

## Idempotency

Re-uploading the same completed CSV must not create duplicates. Idempotency is
provided by canonical identity and exact-content comparison:

- existing exact rows become no-ops;
- new rows create once;
- existing rows with changed identity or commercial values fail and require
  manual correction;
- no import-fingerprint table or background job is needed for V1;
- an audit fingerprint may identify the completed import without storing raw
  file contents.

If a first confirm fails, Convex rolls back its writes. Retrying the same file
therefore sees the original state and is safe. If another Admin creates a
conflicting record between preview and retry, server revalidation returns an
actionable conflict and commits nothing.

## Publication Safety

- Import never accepts `publication_status`.
- New Book Masters are `draft`.
- New variants are inactive until explicit Admin activation, including variants
  added to an already-published Book Master.
- Import success is not customer publication.
- Publishing/activation must use existing canonical Admin domain actions and
  their state/audit consequences.

This rule prevents a bad spreadsheet from immediately entering customer
projections, Ready Stock, or Secret Catalog surfaces.

## Ready Stock Policy

Stock import is out of scope for V1. Bulk Import must not call
`readyStock.setQuantity` and must not patch inventory directly. The existing
`onHand - reserved` and reservation/fulfillment invariants remain untouched.

Initial stock or an inventory correction is a separate explicit Admin action.
If future product requirements demand inventory import, it needs a new source
contract for adjustment semantics, concurrency, reservation history, and audit;
it cannot be added as a column by implementation improvisation.

## Catalog Policy

Secret Catalog assignment is out of scope for V1. Bulk Import must not call
`catalogItems.add`, create a catalog, create an access code, grant access, or
generate a customer session.

After import, an authorized Admin may explicitly assign an active variant to a
catalog through the existing catalog workflow. A closed/missing catalog,
publication state, catalog price override, and customer access then follow the
canonical catalog rules. No spreadsheet row creates customer access.

## Rollback Policy

Rollback has two meanings and they must not be conflated:

1. **Before confirm:** preview is no-write, so there is nothing to roll back.
2. **During confirm:** one atomic mutation either commits the full plan or
   throws and commits nothing.
3. **After success:** there is no blind bulk delete. If an imported record is
   wrong, use existing edit, inactive, archive, or publication controls while
   preserving audit/history. If the record has gained a catalog, inventory,
   order, invoice, or other relationship, hard deletion is unsafe.

V1 does not add a bulk “undo import” action or a deletion cascade. A future
reversal workflow requires its own source and data-contract decision.

## Retry and Failure Policy

- `VALIDATION_FAILED`: no write occurred; correct the file and select it again.
- `IMPORT_FAILED`: the confirm mutation failed; product writes are rolled back;
  show a safe error and allow retry after revalidation.
- A concurrent publisher/book/variant conflict is a normal actionable error,
  not permission to partially continue.
- Network retry of a successful request must resolve through canonical ISBN
  no-op matching; it must not create a second variant.
- Raw server stack traces are never shown.

## Authorization

- Import is available only to active Admin/Owner users with `books.manage`.
- Use `requirePermission` on every server preview read and confirm mutation.
- Route guards are UX only; direct Convex calls must fail for visitors,
  customers, missing users, suspended users, and unauthorized roles.
- The source contract does not create a new `operator` role or permission.

## Audit

Use the existing append-only `auditEvents` and `recordAudit`:

- shared publisher/book/variant domain primitives record their existing
  per-record create actions;
- successful confirmation records `bulk_import.completed` with the operator
  (`actorUserId`), audit timestamp, bounded fingerprint, CSV type, total rows,
  created publisher/book/variant counts, no-op count, updated count (`0`),
  and warning count;
- no raw CSV, full row values, secrets, credentials, storage values, or
  unnecessary customer data are stored;
- preview-only validation does not create a fake audit event;
- there is no separate import-history table in V1.

## Customer Visibility and Notifications

- Publisher creation has no direct customer projection.
- Draft books and inactive variants are hidden from customer-safe projections.
- Explicit publication, activation, inventory setup, and catalog assignment are
  separate server-authorized consequences.
- No per-book customer notification is generated.
- No access code, catalog grant, order, invoice, payment, deposit, refund,
  exception, or Inbox/Notification row is created by import.

## Security

- Allow-list exactly eight columns; reject unknown fields before domain logic.
- Validate UTF-8, CSV structure, size, rows, cell lengths, NUL/control content,
  ISBN, format, and integer IDR on the server.
- Treat strings as text and escape them in any future export using the existing
  formula-safe CSV helper.
- Do not accept file paths, storage IDs, Convex IDs, function names, roles,
  publication statuses, inventory quantities, or catalog IDs from the file.
- Do not retain raw files or put raw values into logs/audit.
- Confirm always revalidates because preview data can become stale.

## Financial and Data Integrity Safety

- Only positive integer IDR variant prices are imported.
- No historical order/invoice/payment/deposit/refund value is changed.
- No stock reservation or fulfillment history is touched.
- ISBN and Book Master + format uniqueness are checked before every commit.
- Existing canonical records are never silently replaced.
- Corrections are status/edited/superseding-record actions, not destructive
  rewrites of history.

## Retention and Import History

V1 retains no raw input file, row payload, or dedicated import job. The existing
append-only audit summary is the minimum durable evidence; filename is not
retained, and validation errors remain preview-only. The UI may retain the
preview in memory until reset or completion, but a refresh discards it.

If operators later need searchable import history, replay, resumable batches,
or downloadable error archives, that is a separate requirement and must not be
smuggled into V1 as infrastructure.

## Implementation Boundary

This policy does not implement a route, parser, dependency, schema, mutation,
UI, template, import job, or actual implementation tests.
