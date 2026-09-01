import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  BOOK_FORMAT_VALUES,
  BULK_IMPORT_LIMITS,
  equalCategories,
  equalOptionalText,
  normalizeBulkImportRow,
  normalizeBulkText,
  normalizeIsbn,
  parseBulkImportCsv,
  publisherKey,
  type BulkImportError,
  type NormalizedBulkImportRow,
} from "./lib/bulkImport";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { insertBook, insertPublisher, insertVariant } from "./lib/productDomain";
import { enforceRateLimit } from "./lib/rateLimit";

const importArgs = {
  csv: v.string(),
  fileName: v.string(),
  mimeType: v.optional(v.string()),
};

type ReadCtx = QueryCtx | MutationCtx;
type Book = Doc<"books">;
type Variant = Doc<"bookVariants">;
type RowStatus = "ready" | "no_change" | "warning" | "conflict" | "invalid";

type BookMetadata = {
  author?: string;
  description?: string;
  categories: string[];
};

type PlannedRow = {
  normalized: NormalizedBulkImportRow;
  publisherKey: string;
  publisherName: string;
  publisherId?: Id<"publishers">;
  publisherIsNew: boolean;
  bookKey: string;
  bookId?: Id<"books">;
  bookIsNew: boolean;
  bookMetadata: BookMetadata;
  action: "create" | "noop";
  warnings: string[];
  errors: BulkImportError[];
  status: RowStatus;
};

type BulkImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newPublishers: number;
  existingPublishers: number;
  newBooks: number;
  existingBooks: number;
  newVariants: number;
  noOpRows: number;
  warnings: number;
  conflicts: number;
  previewWrites: number;
};

type ImportPlan = {
  fingerprint: string;
  fileErrors: BulkImportError[];
  rows: PlannedRow[];
  summary: BulkImportSummary;
};

function safeError(
  rowNumber: number,
  field: string,
  value: string,
  code: string,
  message: string,
  correction: string,
  severity: BulkImportError["severity"] = "conflict",
): BulkImportError {
  const characters = Array.from(value.replaceAll("\r", "\\r").replaceAll("\n", "\\n"));
  return {
    rowNumber,
    field,
    value: characters.length > 120 ? `${characters.slice(0, 117).join("")}…` : characters.join(""),
    code,
    message,
    correction,
    severity,
  };
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    const group = grouped.get(groupKey) || [];
    group.push(value);
    grouped.set(groupKey, group);
  }
  return grouped;
}

function bookIdentityKey(publisherSlug: string, title: string): string {
  return `${publisherSlug}::${normalizeBulkText(title).toLowerCase()}`;
}

function formatMetadata(metadata: BookMetadata): BookMetadata {
  return {
    author: metadata.author ? normalizeBulkText(metadata.author) : undefined,
    description: metadata.description ? normalizeBulkText(metadata.description, true) : undefined,
    categories: metadata.categories.map((value) => normalizeBulkText(value)).filter(Boolean),
  };
}

function metadataConflict(
  row: NormalizedBulkImportRow,
  field: "author" | "description" | "categories",
  value: string,
  message: string,
): BulkImportError {
  return safeError(
    row.rowNumber,
    field,
    value,
    "BOOK_METADATA_CONFLICT",
    message,
    "use the existing Book Master value or edit it manually",
  );
}

function addGroupMetadata(
  row: NormalizedBulkImportRow,
  metadata: BookMetadata,
  supplied: { author: boolean; description: boolean; categories: boolean },
  errors: BulkImportError[],
) {
  if (row.author !== undefined) {
    if (supplied.author && !equalOptionalText(row.author, metadata.author)) {
      errors.push(
        metadataConflict(row, "author", row.author, "author conflicts with another row for this Book Master"),
      );
    } else if (!supplied.author) {
      metadata.author = row.author;
      supplied.author = true;
    }
  }
  if (row.description !== undefined) {
    if (supplied.description && !equalOptionalText(row.description, metadata.description, true)) {
      errors.push(
        metadataConflict(
          row,
          "description",
          row.description,
          "description conflicts with another row for this Book Master",
        ),
      );
    } else if (!supplied.description) {
      metadata.description = row.description;
      supplied.description = true;
    }
  }
  if (row.categories.length) {
    if (supplied.categories && !equalCategories(row.categories, metadata.categories)) {
      errors.push(
        metadataConflict(
          row,
          "categories",
          row.categories.join("; "),
          "categories conflict with another row for this Book Master",
        ),
      );
    } else if (!supplied.categories) {
      metadata.categories = row.categories;
      supplied.categories = true;
    }
  }
}

function existingBookMetadataErrors(row: NormalizedBulkImportRow, book: Book): BulkImportError[] {
  const errors: BulkImportError[] = [];
  if (row.author !== undefined && !equalOptionalText(row.author, book.author)) {
    errors.push(metadataConflict(row, "author", row.author, "author conflicts with the existing Book Master"));
  }
  if (row.description !== undefined && !equalOptionalText(row.description, book.description, true)) {
    errors.push(
      metadataConflict(row, "description", row.description, "description conflicts with the existing Book Master"),
    );
  }
  if (row.categories.length && !equalCategories(row.categories, book.categories)) {
    errors.push(
      metadataConflict(
        row,
        "categories",
        row.categories.join("; "),
        "categories conflict with the existing Book Master",
      ),
    );
  }
  return errors;
}

function publicRow(row: PlannedRow) {
  return {
    rowNumber: row.normalized.rowNumber,
    publisher: row.normalized.publisher,
    title: row.normalized.title,
    format: BOOK_FORMAT_VALUES.includes(row.normalized.format) ? row.normalized.format : "—",
    isbn: row.normalized.isbn,
    priceIdr: row.normalized.priceIdr || null,
    status: row.status,
    warnings: row.warnings,
    errors: row.errors,
  };
}

function emptyPlan(csv: string, fileErrors: BulkImportError[], totalRows = 0): ImportPlan {
  return {
    fingerprint: fingerprint(csv),
    fileErrors,
    rows: [],
    summary: {
      totalRows,
      validRows: 0,
      invalidRows: fileErrors.length ? 1 : 0,
      newPublishers: 0,
      existingPublishers: 0,
      newBooks: 0,
      existingBooks: 0,
      newVariants: 0,
      noOpRows: 0,
      warnings: 0,
      conflicts: 0,
      previewWrites: 0,
    },
  };
}

async function buildPlan(ctx: ReadCtx, csv: string, fileName: string, mimeType = ""): Promise<ImportPlan> {
  const byteSize = new TextEncoder().encode(csv).byteLength;
  const fileErrors: BulkImportError[] = [];
  if (!fileName.toLowerCase().endsWith(".csv")) {
    fileErrors.push(
      safeError(
        1,
        "file",
        fileName,
        "UNSUPPORTED_FILE",
        "file must be a .csv file",
        "save the spreadsheet as CSV",
        "validation",
      ),
    );
  }
  if (!Number.isSafeInteger(byteSize) || byteSize > BULK_IMPORT_LIMITS.maxBytes) {
    fileErrors.push(
      safeError(
        1,
        "file",
        String(byteSize),
        "FILE_TOO_LARGE",
        "file must be no larger than 2 MiB",
        "choose a smaller CSV file",
        "validation",
      ),
    );
  }
  if (mimeType && !["text/csv", "application/csv", "application/vnd.ms-excel"].includes(mimeType.toLowerCase())) {
    fileErrors.push(
      safeError(
        1,
        "file",
        mimeType,
        "UNSUPPORTED_MIME",
        "file type is not a supported CSV declaration",
        "choose a UTF-8 CSV file",
        "validation",
      ),
    );
  }
  if (fileErrors.length) return emptyPlan(csv, fileErrors);

  const parsed = parseBulkImportCsv(csv);
  if (!parsed.headersValid || parsed.errors.length) return emptyPlan(csv, parsed.errors, parsed.rows.length);

  // ponytail: one bounded master scan keeps preview and confirm deterministic.
  // Add identity indexes before the catalog nears Convex read limits.
  const [publishers, books, variants] = await Promise.all([
    ctx.db.query("publishers").collect(),
    ctx.db.query("books").collect(),
    ctx.db.query("bookVariants").collect(),
  ]);
  const publishersById = new Map(publishers.map((publisher) => [publisher._id, publisher]));
  const publishersByKey = groupBy(publishers, (publisher) => publisherKey(publisher.name));
  const booksByIdentity = groupBy(books, (book) => {
    const publisher = publishersById.get(book.publisherId);
    return bookIdentityKey(publisher ? publisherKey(publisher.name) : "", book.title);
  });
  const booksBySlug = groupBy(books, (book) => book.slug);
  const booksById = new Map(books.map((book) => [String(book._id), book]));
  const variantsByIsbn = new Map<string, Variant[]>();
  const variantsByBookFormat = new Map<string, Variant[]>();
  const existingIntegrityErrors: BulkImportError[] = [];
  for (const variant of variants) {
    const normalizedIsbn = normalizeIsbn(variant.isbn);
    if (!normalizedIsbn) {
      existingIntegrityErrors.push(
        safeError(
          1,
          "isbn",
          variant.isbn,
          "EXISTING_INVALID_ISBN",
          "existing ISBN data is invalid",
          "correct the existing variant before importing",
        ),
      );
    } else {
      const isbnGroup = variantsByIsbn.get(normalizedIsbn) || [];
      isbnGroup.push(variant);
      variantsByIsbn.set(normalizedIsbn, isbnGroup);
    }
    const formatKey = `${variant.bookId}::${variant.format}`;
    const formatGroup = variantsByBookFormat.get(formatKey) || [];
    formatGroup.push(variant);
    variantsByBookFormat.set(formatKey, formatGroup);
  }
  if (existingIntegrityErrors.length) fileErrors.push(...existingIntegrityErrors);

  const normalizedRows = parsed.rows.map((parsedRow) => {
    const normalized = normalizeBulkImportRow(parsedRow.fields, parsedRow.rowNumber);
    return { normalized, errors: [...parsedRow.errors, ...normalized.errors] };
  });
  const isbnRows = groupBy(
    normalizedRows.filter(({ normalized }) => normalized.isbn),
    ({ normalized }) => normalized.isbn,
  );
  for (const rows of isbnRows.values()) {
    if (rows.length < 2) continue;
    for (const row of rows) {
      row.errors.push(
        safeError(
          row.normalized.rowNumber,
          "isbn",
          row.normalized.isbn,
          "DUPLICATE_ISBN_IN_FILE",
          "ISBN is repeated in this file",
          "keep one row for this ISBN and import each format only once",
        ),
      );
    }
  }

  const groups = new Map<
    string,
    {
      publisherName: string;
      title: string;
      metadata: BookMetadata;
      supplied: { author: boolean; description: boolean; categories: boolean };
    }
  >();
  for (const { normalized, errors } of normalizedRows) {
    if (errors.length) continue;
    const key = bookIdentityKey(normalized.publisherKey, normalized.title);
    const group = groups.get(key) || {
      publisherName: normalized.publisher,
      title: normalized.title,
      metadata: { author: undefined, description: undefined, categories: [] },
      supplied: { author: false, description: false, categories: false },
    };
    addGroupMetadata(normalized, group.metadata, group.supplied, errors);
    groups.set(key, group);
  }

  const formatRows = groupBy(
    normalizedRows.filter(({ normalized }) => normalized.publisherKey && normalized.titleKey && normalized.format),
    ({ normalized }) => bookIdentityKey(normalized.publisherKey, normalized.title) + `::${normalized.format}`,
  );
  for (const rows of formatRows.values()) {
    if (rows.length < 2) continue;
    for (const row of rows) {
      row.errors.push(
        safeError(
          row.normalized.rowNumber,
          "format",
          row.normalized.format,
          "DUPLICATE_VARIANT_IN_FILE",
          "the same Book Master and format is repeated in this file",
          "keep one row for each format and ISBN",
        ),
      );
    }
  }

  const plannedRows: PlannedRow[] = [];
  for (const { normalized, errors: initialErrors } of normalizedRows) {
    const errors = [...initialErrors];
    const publisherMatches = publishersByKey.get(normalized.publisherKey) || [];
    const publisher = publisherMatches[0];
    const publisherId = publisher?._id;
    let publisherIsNew = !publisher;
    if (publisherMatches.length > 1) {
      errors.push(
        safeError(
          normalized.rowNumber,
          "publisher",
          normalized.publisher,
          "AMBIGUOUS_PUBLISHER",
          "publisher matches more than one existing record",
          "resolve duplicate publisher records manually",
        ),
      );
    } else if (publisher && !publisher.isActive) {
      errors.push(
        safeError(
          normalized.rowNumber,
          "publisher",
          normalized.publisher,
          "INACTIVE_PUBLISHER",
          "publisher matches an inactive publisher",
          "reactivate the publisher manually before importing",
        ),
      );
    }

    const bookKey = bookIdentityKey(normalized.publisherKey, normalized.title);
    const bookMatches = booksByIdentity.get(bookKey) || [];
    const book = bookMatches[0];
    let bookId = book?._id;
    let bookIsNew = !book;
    const metadata = formatMetadata(
      groups.get(bookKey)?.metadata || {
        author: normalized.author,
        description: normalized.description,
        categories: normalized.categories,
      },
    );
    if (bookMatches.length > 1) {
      errors.push(
        safeError(
          normalized.rowNumber,
          "title",
          normalized.title,
          "AMBIGUOUS_BOOK",
          "Book Master identity matches more than one record",
          "resolve duplicate Book Masters manually",
        ),
      );
    } else if (book) {
      publisherIsNew = false;
      bookIsNew = false;
      bookId = book._id;
      errors.push(...existingBookMetadataErrors(normalized, book));
      if (!book.isActive) {
        errors.push(
          safeError(
            normalized.rowNumber,
            "title",
            normalized.title,
            "INACTIVE_BOOK",
            "Book Master is inactive",
            "activate or correct the Book Master manually before importing",
          ),
        );
      }
    } else {
      const slug = publisherKey(normalized.title);
      const slugMatches = booksBySlug.get(slug) || [];
      if (slugMatches.length) {
        errors.push(
          safeError(
            normalized.rowNumber,
            "title",
            normalized.title,
            "BOOK_SLUG_CONFLICT",
            "book slug belongs to a different Book Master identity",
            "resolve the existing slug manually before importing",
          ),
        );
      }
    }

    let action: PlannedRow["action"] = "create";
    const isbnMatches = variantsByIsbn.get(normalized.isbn) || [];
    if (isbnMatches.length > 1) {
      errors.push(
        safeError(
          normalized.rowNumber,
          "isbn",
          normalized.isbn,
          "AMBIGUOUS_ISBN",
          "ISBN is attached to more than one existing variant",
          "resolve duplicate ISBN records manually",
        ),
      );
    } else if (isbnMatches[0]) {
      const existingVariant = isbnMatches[0];
      const existingBook = booksById.get(String(existingVariant.bookId));
      const sameBook = Boolean(
        existingBook && bookIdentityKey(normalized.publisherKey, existingBook.title) === bookKey,
      );
      if (!sameBook) {
        errors.push(
          safeError(
            normalized.rowNumber,
            "isbn",
            normalized.isbn,
            "ISBN_ALREADY_EXISTS",
            "ISBN is already used by another Book Master",
            "edit the row or use the existing Book Master manually; import never overwrites it",
          ),
        );
      } else if (existingVariant.format !== normalized.format) {
        errors.push(
          safeError(
            normalized.rowNumber,
            "format",
            normalized.format,
            "ISBN_FORMAT_CONFLICT",
            "ISBN already exists with a different format",
            "use the existing format or correct the ISBN",
          ),
        );
      } else if (existingVariant.priceAmount !== normalized.priceIdr) {
        errors.push(
          safeError(
            normalized.rowNumber,
            "price_idr",
            String(normalized.priceIdr),
            "ISBN_PRICE_CONFLICT",
            "existing ISBN has a different price",
            "use the existing price or correct the row; import never updates prices",
          ),
        );
      } else {
        action = "noop";
        bookId = existingVariant.bookId;
      }
    } else if (bookId) {
      const formatMatches = variantsByBookFormat.get(`${bookId}::${normalized.format}`) || [];
      if (formatMatches.length) {
        errors.push(
          safeError(
            normalized.rowNumber,
            "format",
            normalized.format,
            "DUPLICATE_VARIANT",
            "this Book Master already has this format with another ISBN",
            "use the existing variant or choose another format",
          ),
        );
      }
    }

    const warnings = publisherIsNew || bookIsNew ? ["penerbit atau Book Master baru akan dibuat"] : [];
    const status: RowStatus = errors.length
      ? errors.some((item) => item.severity === "conflict")
        ? "conflict"
        : "invalid"
      : action === "noop"
        ? "no_change"
        : warnings.length
          ? "warning"
          : "ready";
    plannedRows.push({
      normalized,
      publisherKey: normalized.publisherKey,
      publisherName: normalized.publisher,
      publisherId,
      publisherIsNew,
      bookKey,
      bookId,
      bookIsNew,
      bookMetadata: metadata,
      action,
      warnings,
      errors,
      status,
    });
  }

  const validRows = plannedRows.filter((row) => row.errors.length === 0);
  const newPublisherKeys = new Set(validRows.filter((row) => row.publisherIsNew).map((row) => row.publisherKey));
  const existingPublisherKeys = new Set(validRows.filter((row) => !row.publisherIsNew).map((row) => row.publisherKey));
  const newBookKeys = new Set(validRows.filter((row) => row.bookIsNew).map((row) => row.bookKey));
  const existingBookKeys = new Set(validRows.filter((row) => !row.bookIsNew).map((row) => row.bookKey));
  const conflictRows = plannedRows.filter((row) => row.errors.some((item) => item.severity === "conflict")).length;
  return {
    fingerprint: fingerprint(csv),
    fileErrors,
    rows: plannedRows,
    summary: {
      totalRows: plannedRows.length,
      validRows: validRows.length,
      invalidRows: plannedRows.length - validRows.length + (fileErrors.length ? 1 : 0),
      newPublishers: newPublisherKeys.size,
      existingPublishers: existingPublisherKeys.size,
      newBooks: newBookKeys.size,
      existingBooks: existingBookKeys.size,
      newVariants: validRows.filter((row) => row.action === "create").length,
      noOpRows: validRows.filter((row) => row.action === "noop").length,
      warnings: validRows.filter((row) => row.warnings.length).length,
      conflicts: conflictRows,
      previewWrites: 0,
    },
  };
}

function publicPlan(plan: ImportPlan) {
  return {
    summary: plan.summary,
    rows: plan.rows.map(publicRow),
    errors: plan.fileErrors,
  };
}

function assertImportable(plan: ImportPlan) {
  if (plan.fileErrors.length || plan.rows.some((row) => row.errors.length)) {
    fail("BULK_IMPORT_VALIDATION_FAILED", "Import gagal karena file atau baris belum valid");
  }
}

async function applyPlan(ctx: MutationCtx, actorUserId: Id<"appUsers">, plan: ImportPlan) {
  const publisherIds = new Map<string, Id<"publishers">>();
  const bookIds = new Map<string, Id<"books">>();
  let createdPublishers = 0;
  let createdBooks = 0;
  let createdVariants = 0;

  for (const row of plan.rows) {
    if (row.action === "noop") continue;
    let publisherId = row.publisherId || publisherIds.get(row.publisherKey);
    if (!publisherId) {
      publisherId = await insertPublisher(ctx, actorUserId, row.publisherName);
      publisherIds.set(row.publisherKey, publisherId);
      createdPublishers += 1;
    }
    let bookId = row.bookId || bookIds.get(row.bookKey);
    if (!bookId) {
      bookId = await insertBook(ctx, actorUserId, {
        publisherId,
        title: row.normalized.title,
        author: row.bookMetadata.author,
        description: row.bookMetadata.description,
        categories: row.bookMetadata.categories,
      });
      bookIds.set(row.bookKey, bookId);
      createdBooks += 1;
    }
    await insertVariant(ctx, actorUserId, {
      bookId,
      format: row.normalized.format,
      isbn: row.normalized.isbn,
      priceAmount: row.normalized.priceIdr,
      isAvailable: false,
    });
    createdVariants += 1;
  }

  const result = {
    totalRows: plan.summary.totalRows,
    createdPublishers,
    createdBooks,
    createdVariants,
    noOpRows: plan.summary.noOpRows,
    updated: 0,
    warnings: plan.summary.warnings,
    fingerprint: plan.fingerprint,
  };
  await recordAudit(ctx, actorUserId, "bulk_import.completed", "bulkImport", plan.fingerprint, {
    fingerprint: plan.fingerprint,
    fileType: "csv",
    totalRows: String(result.totalRows),
    createdPublishers: String(result.createdPublishers),
    createdBooks: String(result.createdBooks),
    createdVariants: String(result.createdVariants),
    noOpCount: String(result.noOpRows),
    updatedCount: "0",
    warningCount: String(result.warnings),
  });
  return { summary: result };
}

export const preview = query({
  args: importArgs,
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    return publicPlan(await buildPlan(ctx, args.csv, args.fileName, args.mimeType || ""));
  },
});

export const confirm = mutation({
  args: importArgs,
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    await enforceRateLimit(ctx, "bulkImportConfirmUser", String(user._id));
    const plan = await buildPlan(ctx, args.csv, args.fileName, args.mimeType || "");
    assertImportable(plan);
    return applyPlan(ctx, user._id, plan);
  },
});
