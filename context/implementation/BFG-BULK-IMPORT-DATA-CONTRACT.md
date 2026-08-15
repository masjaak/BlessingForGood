# BFG BULK IMPORT DATA CONTRACT

Status: `LOCKED FOR BULK IMPORT V1`
Phase 08: `SOURCE CONTRACT PREPARED; IMPLEMENTATION NOT STARTED`
Prepared: 2026-08-16 (Asia/Jakarta)

This is a product-master contract. One data row represents one Book Master
variant. No row represents an order, invoice, payment, deposit, refund,
exception, customer, staff user, audit-history event, batch, or catalog access
grant.

## File Contract

| Item | V1 rule |
|---|---|
| Canonical format | UTF-8 CSV, optional UTF-8 BOM, comma delimiter, quoted fields allowed, LF or CRLF line endings. |
| Extension | `.csv` only. |
| Accepted MIME | `text/csv`, `application/csv`, or a common Excel CSV MIME when the content and extension are still CSV. |
| Rejected formats | `.xlsx`, `.xls`, macro-enabled workbooks, multiple worksheets, formulas, and arbitrary spreadsheet objects. |
| Maximum raw file size | `2 MiB`. |
| Maximum data rows | `200`, excluding the header. |
| Maximum cell text | `5,000` Unicode characters; destination-specific limits below also apply. |
| Header policy | Exact canonical set and order; duplicate, missing, unknown, or reordered headers fail. |
| Blank rows | Trailing blank lines may be ignored; an incomplete data row is invalid. |
| Template | Required future capability: download the exact header row and one clearly marked non-production example row. No template file is generated in this task. |

The current source is silent on file format. CSV is adopted for V1 because it
is the smallest interoperable export from the client’s spreadsheet workflow,
the current code already has CSV export, and it avoids adding an XLSX parser and
its larger type/macro surface. XLSX is a future format contract, not a hidden
V1 fallback.

## Canonical Headers

The header row must be exactly:

```csv
publisher,title,author,description,categories,format,isbn,price_idr
```

CSV field values are data. They are never evaluated as formulas, HTML, scripts,
URLs, or code.

## Scope Classification

| Product concept | Classification | V1 rule |
|---|---|---|
| Publisher | `IN_SCOPE` | Match/create by exact normalized canonical key. |
| Book Master | `IN_SCOPE` | Match by publisher + normalized title; create as draft when absent. |
| Author | `IN_SCOPE` | Optional text field on `books`; not a standalone imported entity. |
| Category | `IN_SCOPE` | Optional semicolon-separated values stored in `books.categories`; no category table or taxonomy mutation. |
| Variant | `IN_SCOPE` | One row per `BB`, `PB`, or `HB` variant. |
| ISBN | `IN_SCOPE` | Required global variant identity after normalization and checksum validation. |
| Price | `IN_SCOPE` | Required positive integer IDR in `price_idr`. |
| Publication status | `OUT_OF_SCOPE` / system-managed | No column; new Book Masters are `draft`; new variants are inactive until explicit Admin activation. |
| Ready Stock quantity | `OUT_OF_SCOPE` / future | No stock column; import never changes `onHand`, `reserved`, or `available`. |
| Secret Catalog assignment | `OUT_OF_SCOPE` / future | No catalog column; explicit post-import assignment only. |
| Batch/cargo assignment | `OUT_OF_SCOPE` / future | No batch column; import does not create shipment relationships. |
| Cover/gallery/external preview | `OUT_OF_SCOPE` | Existing validated media flow and separate Product Gallery candidate govern media. |

## Field Contract

| Column | Data type | Required? | Example format | Normalization | Validation | Canonical destination | Duplicate key | Error message |
|---|---|---:|---|---|---|---|---|---|
| `publisher` | UTF-8 text | Yes | `Walker Books` | Unicode NFKC, trim outer whitespace, collapse internal whitespace; matching key is the existing BFG slug form. Preserve first valid display spelling for a new record. | Non-empty, max 160 characters, no NUL/control characters, exact key must not resolve to multiple records; inactive match is rejected. | `publishers.name`, `publishers.slug`, `isActive=true` for a new publisher. | Normalized publisher slug. | `publisher is required` / `publisher matches an inactive publisher` / `publisher match is ambiguous`. |
| `title` | UTF-8 text | Yes | `The Way Home for Wolf` | NFKC, trim/collapse whitespace for display; lower/collapsed key for matching. | Non-empty, max 300 characters, no NUL/control characters. | `books.title`, slug derived only for a new Book Master. | Normalized publisher key + normalized title key. | `title is required` / `book identity is ambiguous` / `book metadata conflicts with the existing record`. |
| `author` | UTF-8 text | No | `Rachel Bright` | Empty becomes absent; NFKC, trim/collapse whitespace. | Max 200 characters; text only; no HTML interpretation. If supplied for an existing Book Master, it must match the stored value. | `books.author`. | Part of existing Book Master metadata comparison; never an identity key. | `author conflicts with the existing Book Master`. |
| `description` | UTF-8 text | No | `A short synopsis` | Empty becomes absent; normalize line endings to LF; trim outer whitespace. | Max 5,000 characters; text only; no HTML/script execution. If supplied for an existing Book Master, it must match the stored value. | `books.description`. | Part of existing Book Master metadata comparison; never an identity key. | `description conflicts with the existing Book Master`. |
| `categories` | Semicolon-separated UTF-8 text | No | `Children Books; Picture Book` | Split on `;`, trim, deduplicate exact normalized values, preserve first display spelling. | At most 12 values; each value max 60 characters; no NUL/control characters. If supplied for an existing Book Master, it must match the stored set. | `books.categories`. | Part of existing Book Master metadata comparison; never an identity key. | `categories are invalid` / `categories conflict with the existing Book Master`. |
| `format` | Enum text | Yes | `BB`, `PB`, or `HB` | Trim and uppercase. | Must be one of the current canonical `BB`, `PB`, `HB` values. | `bookVariants.format`. | Book Master + format. | `format must be BB, PB, or HB` / `variant already exists for this Book Master`. |
| `isbn` | ISBN-10 or ISBN-13 text | Yes | `978-0-306-40615-7` | Remove spaces and hyphens; uppercase ISBN-10 `X`; retain leading zeroes. | Must be valid ISBN-10 or ISBN-13 with a valid check digit; max normalized length 13; globally unique after normalization. | `bookVariants.isbn`. | Global normalized ISBN; secondary Book Master + format. | `ISBN is required` / `ISBN format or check digit is invalid` / `ISBN already exists for another variant`. |
| `price_idr` | Decimal text accepted only as integer digits | Yes | `175000` | Trim only; convert the digit string to a safe integer. | Positive safe integer; digits only; reject `Rp`, `.`, `,`, decimals, signs, whitespace separators, and garbage. | `bookVariants.priceAmount`; currency is system-managed `IDR`. | Existing variant’s immutable import comparison; never an update key. | `price_idr must be a positive integer IDR without symbols or separators`. |

## Normalization and Identity

### Publisher matching

1. Apply Unicode NFKC, trim, and collapse whitespace.
2. Build the same lower-case slug key used by the existing BFG publisher
   identity (`Walker Books`, `walker books`, and `Walker  Books` resolve to
   `walker-books`).
3. Match exactly on that key.
4. Reuse one active existing publisher.
5. Reuse one new publisher plan for repeated keys in the same file.
6. Reject an inactive match; do not silently reactivate it.
7. Do not fuzzy-match or auto-correct typos. A typo is a new-publisher warning
   in preview and requires explicit confirmation; an actual key collision is
   an error.
8. If more than one existing record resolves to the key, fail the whole file
   with an ambiguity error; do not merge publishers.

### Book matching

1. ISBN is checked first against the global variant index.
2. If the ISBN is new, match a Book Master by normalized publisher key plus
   normalized title key.
3. Title alone is never sufficient.
4. A matching existing Book Master may receive a new format/ISBN variant only
   if supplied optional metadata is absent or exactly matches the stored
   metadata.
5. A new Book Master gets a canonical slug derived from the title. A collision
   with a different publisher/title identity is an error, not an automatic
   rename or merge.
6. Multiple existing Book Masters with the same normalized identity are an
   ambiguity error requiring manual cleanup.

### Variant matching

- A normalized ISBN already attached to the same canonical variant with the
  same book, format, and price is an idempotent no-op.
- The canonical stored ISBN value for a new record is the normalized ISBN
  without spaces or hyphens. Existing stored values must be compared through
  the same normalization before identity lookup; malformed or multiply
  matching existing values are an import-blocking data-integrity error, not an
  excuse for a silent migration.
- A normalized ISBN attached to another variant is `ISBN_ALREADY_EXISTS` and
  the row is invalid.
- A Book Master + format already exists with a different ISBN is
  `DUPLICATE_VARIANT` and the row is invalid.
- Repeated normalized ISBNs within one file always fail, even if the repeated
  rows are textually identical. Re-uploading a completed file is handled by
  canonical existing-record no-op matching, not by accepting duplicate rows in
  one file.
- V1 never updates, merges, rehomes, or deletes an existing variant.

## System-Managed Destination Values

New records use these values regardless of spreadsheet content:

| Destination | New import value | Reason |
|---|---|---|
| `books.publicationStatus` | `draft` | Spreadsheet success cannot publish customer data. |
| `books.isActive` | `true` | Draft is the reversible master state; archive remains an explicit Admin action. |
| `bookVariants.isAvailable` | `false` | A new variant on an already-published Book Master must not leak to customers. |
| `bookVariants.currency` | `IDR` | Product contract uses integer IDR. |
| cover fields | absent | Media is not part of V1. |
| inventory fields | unchanged/absent | Ready Stock invariants are not part of product import. |
| catalog fields | unchanged/absent | Customer access is never generated by import. |

An exact existing row remains unchanged regardless of its current lifecycle
state. Import does not activate an existing inactive variant or demote an
existing published Book Master.

## Duplicate and Existing-Record Matrix

| Situation | Preview result | Confirm result |
|---|---|---|
| New publisher key | New publisher + warning. | Create once through canonical domain logic. |
| Existing active publisher key | Existing publisher. | Reuse; no update. |
| Existing inactive publisher key | Error. | Zero-write whole-file failure. |
| New publisher/title identity | New draft Book Master. | Create once through canonical domain logic. |
| Existing publisher/title, new format/ISBN | Existing Book Master + new variant. | Create inactive variant; no Book Master overwrite. |
| Existing exact ISBN/book/format/price | Idempotent no-op row. | No mutation. |
| Existing ISBN with any mismatch | Error. | Zero-write whole-file failure. |
| Existing Book Master + format with another ISBN | Error. | Zero-write whole-file failure. |
| Same ISBN repeated in file | Error on every repeated row. | Zero-write whole-file failure. |
| Same publisher/title repeated for distinct consistent formats | Valid grouped Book Master plan. | One Book Master and one variant per format. |
| Optional metadata differs from existing Book Master | Error. | Zero-write whole-file failure. |
| Existing identity is ambiguous | Error. | Zero-write whole-file failure. |

## Customer and Financial Consequences

- No imported value is customer-visible immediately.
- New draft books are absent from Ready Stock and Secret Catalog projections.
- New inactive variants are absent from customer projections even when their
  Book Master already has `published` status.
- Admin must explicitly publish/mark the Book Master, activate the variant,
  set Ready Stock quantity through the existing guarded flow, or assign the
  variant to a Secret Catalog through the existing guarded flow.
- Catalog assignment never creates a code, grant, or session.
- Import never creates orders, reservation rows, invoices, payments, deposits,
  refund obligations, exceptions, notifications, or historical snapshots.

## Validation and Error Semantics

The server returns a deterministic preview plan and row errors. Each error
contains the spreadsheet row number, canonical field, safely bounded value,
stable problem code/message, and recommended correction. Unknown fields and
unsupported rows are rejected rather than ignored.

The client may parse for immediate feedback, but the server is authoritative.
The confirm mutation receives only the allow-listed normalized plan, checks the
file/plan limits, repeats the identity and duplicate checks, and aborts on any
change since preview.

## Security and Export Boundary

- Text is rendered as text; no HTML or script string is interpreted.
- No file bytes are retained as a product record.
- The existing `src/lib/excel-export.ts` formula-safe escaping is required for
  any future export of imported text.
- A future XLSX parser, if approved, must reject macros and external links and
  must map only to this same allow-listed contract.

## Implementation Boundary

This document defines the input contract only. It does not add the template,
parser, route, schema, mutation, UI, dependency, or implementation tests.
