export const BULK_IMPORT_HEADERS = [
  "publisher",
  "title",
  "author",
  "description",
  "categories",
  "format",
  "isbn",
  "price_idr",
] as const;

export type BulkImportHeader = (typeof BULK_IMPORT_HEADERS)[number];
export type BulkImportFormat = "BB" | "PB" | "HB";
export type BulkImportFields = Record<BulkImportHeader, string>;

export const BULK_IMPORT_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxRows: 200,
  maxCellCharacters: 5_000,
} as const;

export type BulkImportError = {
  code: string;
  rowNumber: number;
  field: string;
  value: string;
  message: string;
  correction: string;
  severity: "validation" | "conflict";
};

export type ParsedBulkImportRow = {
  rowNumber: number;
  fields: BulkImportFields;
  errors: BulkImportError[];
};

export type ParsedBulkImportCsv = {
  headersValid: boolean;
  rows: ParsedBulkImportRow[];
  errors: BulkImportError[];
};

export type BulkImportFileMetadata = {
  name: string;
  size: number;
  type: string;
};

export type NormalizedBulkImportRow = {
  rowNumber: number;
  publisher: string;
  publisherKey: string;
  title: string;
  titleKey: string;
  author?: string;
  description?: string;
  categories: string[];
  format: BulkImportFormat;
  isbn: string;
  priceIdr: number;
  errors: BulkImportError[];
};

export type BulkImportState =
  | "IDLE"
  | "FILE_SELECTED"
  | "PARSING"
  | "VALIDATING"
  | "VALIDATION_FAILED"
  | "READY_FOR_REVIEW"
  | "IMPORTING"
  | "COMPLETED"
  | "IMPORT_FAILED";

export type BulkImportEvent =
  | "SELECT_FILE"
  | "START_PARSE"
  | "PARSE_SUCCESS"
  | "PARSE_FAILURE"
  | "VALIDATE_SUCCESS"
  | "VALIDATE_FAILURE"
  | "CONFIRM_IMPORT"
  | "IMPORT_SUCCESS"
  | "IMPORT_FAILURE"
  | "RESET";

const acceptedMimeTypes = new Set(["", "text/csv", "application/csv", "application/vnd.ms-excel"]);

function error(
  rowNumber: number,
  field: string,
  value: string,
  code: string,
  message: string,
  correction: string,
  severity: BulkImportError["severity"] = "validation",
): BulkImportError {
  return {
    rowNumber,
    field,
    value: displayValue(value),
    code,
    message,
    correction,
    severity,
  };
}

function displayValue(value: string): string {
  const normalized = value.replaceAll("\r", "\\r").replaceAll("\n", "\\n");
  const characters = Array.from(normalized);
  return characters.length > 120 ? `${characters.slice(0, 117).join("")}…` : normalized;
}

function characterLength(value: string): number {
  return Array.from(value).length;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isForbiddenControl(value: string, allowLineBreaks = false): boolean {
  const candidate = allowLineBreaks ? value.replace(/[\r\n]/gu, "") : value;
  return /[\u0000-\u001F\u007F]/u.test(candidate);
}

function blankRecord(fields: string[]): boolean {
  return fields.length === 1 && fields[0] === "";
}

function parseRecords(csv: string): { records: string[][]; malformed: boolean } {
  const records: string[][] = [];
  let fields: string[] = [];
  let value = "";
  let quoted = false;
  let quoteClosed = false;
  let fieldStarted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        value += character;
      }
      continue;
    }

    if (quoteClosed) {
      if (character === ",") {
        fields.push(value);
        value = "";
        fieldStarted = false;
        quoteClosed = false;
        continue;
      }
      if (character === "\r" || character === "\n") {
        fields.push(value);
        if (!blankRecord(fields)) records.push(fields);
        fields = [];
        value = "";
        fieldStarted = false;
        quoteClosed = false;
        if (character === "\r" && csv[index + 1] === "\n") index += 1;
        continue;
      }
      return { records, malformed: true };
    }

    if (character === '"') {
      if (fieldStarted || value.length) return { records, malformed: true };
      quoted = true;
      fieldStarted = true;
      continue;
    }
    if (character === ",") {
      fields.push(value);
      value = "";
      fieldStarted = false;
      continue;
    }
    if (character === "\r" || character === "\n") {
      fields.push(value);
      if (!blankRecord(fields)) records.push(fields);
      fields = [];
      value = "";
      fieldStarted = false;
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      continue;
    }
    value += character;
    fieldStarted = true;
  }

  if (quoted) return { records, malformed: true };
  if (fields.length || value.length || fieldStarted) {
    fields.push(value);
    if (!blankRecord(fields)) records.push(fields);
  }
  return { records, malformed: false };
}

function emptyFields(): BulkImportFields {
  return Object.fromEntries(BULK_IMPORT_HEADERS.map((header) => [header, ""])) as BulkImportFields;
}

export function validateBulkImportFile(metadata: BulkImportFileMetadata): BulkImportError[] {
  const errors: BulkImportError[] = [];
  if (!metadata.name.toLowerCase().endsWith(".csv")) {
    errors.push(
      error(1, "file", metadata.name, "UNSUPPORTED_FILE", "file must be a .csv file", "save the spreadsheet as CSV"),
    );
  }
  if (!Number.isSafeInteger(metadata.size) || metadata.size < 0 || metadata.size > BULK_IMPORT_LIMITS.maxBytes) {
    errors.push(
      error(
        1,
        "file",
        String(metadata.size),
        "FILE_TOO_LARGE",
        "file must be no larger than 2 MiB",
        "choose a smaller CSV file",
      ),
    );
  }
  if (!acceptedMimeTypes.has(metadata.type.toLowerCase())) {
    errors.push(
      error(
        1,
        "file",
        metadata.type,
        "UNSUPPORTED_MIME",
        "file type is not a supported CSV declaration",
        "choose a UTF-8 CSV file",
      ),
    );
  }
  return errors;
}

export function parseBulkImportCsv(csv: string): ParsedBulkImportCsv {
  if (csv.includes("\u0000")) {
    return {
      headersValid: false,
      rows: [],
      errors: [
        error(
          1,
          "file",
          "binary content",
          "BINARY_CONTENT",
          "CSV contains binary content",
          "save the source as UTF-8 CSV without binary or NUL data",
        ),
      ],
    };
  }
  if (utf8ByteLength(csv) > BULK_IMPORT_LIMITS.maxBytes) {
    return {
      headersValid: false,
      rows: [],
      errors: [
        error(
          1,
          "file",
          String(utf8ByteLength(csv)),
          "FILE_TOO_LARGE",
          "file must be no larger than 2 MiB",
          "choose a smaller CSV file",
        ),
      ],
    };
  }

  const input = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const parsed = parseRecords(input);
  if (parsed.malformed) {
    return {
      headersValid: false,
      rows: [],
      errors: [
        error(
          1,
          "file",
          "",
          "MALFORMED_CSV",
          "CSV contains an unfinished or misplaced quote",
          "close quoted fields and try again",
        ),
      ],
    };
  }
  const [headers, ...data] = parsed.records;
  if (
    !headers ||
    headers.length !== BULK_IMPORT_HEADERS.length ||
    headers.some((header, index) => header !== BULK_IMPORT_HEADERS[index])
  ) {
    return {
      headersValid: false,
      rows: [],
      errors: [
        error(
          1,
          "header",
          headers?.join(",") || "",
          "INVALID_HEADER",
          "header must exactly match the canonical eight columns and order",
          `use: ${BULK_IMPORT_HEADERS.join(",")}`,
        ),
      ],
    };
  }

  const errors: BulkImportError[] = [];
  const rows: ParsedBulkImportRow[] = [];
  if (data.length > BULK_IMPORT_LIMITS.maxRows) {
    errors.push(
      error(
        1,
        "row",
        String(data.length),
        "ROW_LIMIT_EXCEEDED",
        "CSV may contain at most 200 data rows",
        "remove rows until the file has 200 data rows or fewer",
      ),
    );
  }

  data.forEach((record, index) => {
    const rowNumber = index + 2;
    const rowErrors: BulkImportError[] = [];
    if (record.length !== BULK_IMPORT_HEADERS.length) {
      rowErrors.push(
        error(
          rowNumber,
          "row",
          record.join(","),
          "COLUMN_COUNT_MISMATCH",
          "row must contain exactly eight columns",
          "use the downloaded template and keep every column",
        ),
      );
    }
    const fields = emptyFields();
    BULK_IMPORT_HEADERS.forEach((header, fieldIndex) => {
      const cell = record[fieldIndex] ?? "";
      fields[header] = cell;
      if (characterLength(cell) > BULK_IMPORT_LIMITS.maxCellCharacters) {
        rowErrors.push(
          error(
            rowNumber,
            header,
            cell,
            "CELL_TOO_LONG",
            "cell must contain at most 5,000 Unicode characters",
            "shorten this cell before importing",
          ),
        );
      }
      if (isForbiddenControl(cell, header === "description")) {
        rowErrors.push(
          error(
            rowNumber,
            header,
            cell,
            "CONTROL_CHARACTER",
            "cell contains an unsupported control character",
            "remove control characters and keep the value as plain text",
          ),
        );
      }
    });
    rows.push({ rowNumber, fields, errors: rowErrors });
  });

  return { headersValid: true, rows, errors };
}

export function normalizeBulkText(value: string, allowLineBreaks = false): string {
  const normalized = value.normalize("NFKC");
  return allowLineBreaks ? normalized.replace(/\r\n?/gu, "\n").trim() : normalized.trim().replace(/\s+/gu, " ");
}

export function publisherKey(value: string): string {
  return normalizeBulkText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isbnCheckDigit(value: string): boolean {
  if (/^\d{9}[\dX]$/u.test(value)) {
    return (
      [...value].reduce(
        (sum, character, index) => sum + (character === "X" ? 10 : Number(character)) * (10 - index),
        0,
      ) %
        11 ===
      0
    );
  }
  if (/^\d{13}$/u.test(value)) {
    return [...value].reduce((sum, character, index) => sum + Number(character) * (index % 2 ? 3 : 1), 0) % 10 === 0;
  }
  return false;
}

export function normalizeIsbn(value: string): string {
  const normalized = value.normalize("NFKC").replace(/[\s-]/gu, "").toUpperCase();
  if (!isbnCheckDigit(normalized)) return "";
  return normalized;
}

function sameStringSet(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function normalizeBulkImportRow(fields: BulkImportFields, rowNumber: number): NormalizedBulkImportRow {
  const errors: BulkImportError[] = [];
  const publisher = normalizeBulkText(fields.publisher);
  const publisherKeyValue = publisherKey(fields.publisher);
  const title = normalizeBulkText(fields.title);
  const titleKey = normalizeBulkText(fields.title).toLowerCase();
  const author = normalizeBulkText(fields.author) || undefined;
  const description = normalizeBulkText(fields.description, true) || undefined;
  const categories = [
    ...new Set(
      fields.categories
        .split(";")
        .map((value) => normalizeBulkText(value))
        .filter(Boolean),
    ),
  ];
  const formatValue = normalizeBulkText(fields.format).toUpperCase();
  const isbn = normalizeIsbn(fields.isbn);
  const priceText = fields.price_idr.trim();
  const priceIdr = /^\d+$/u.test(priceText) ? Number(priceText) : 0;

  if (!publisher)
    errors.push(
      error(
        rowNumber,
        "publisher",
        fields.publisher,
        "REQUIRED_VALUE",
        "publisher is required",
        "enter a publisher name",
      ),
    );
  if (!publisherKeyValue)
    errors.push(
      error(
        rowNumber,
        "publisher",
        fields.publisher,
        "INVALID_PUBLISHER",
        "publisher is invalid",
        "use letters and words that form a publisher name",
      ),
    );
  if (characterLength(publisher) > 160)
    errors.push(
      error(
        rowNumber,
        "publisher",
        publisher,
        "FIELD_TOO_LONG",
        "publisher must contain at most 160 characters",
        "shorten the publisher name",
      ),
    );
  if (!title)
    errors.push(error(rowNumber, "title", fields.title, "REQUIRED_VALUE", "title is required", "enter a book title"));
  if (characterLength(title) > 300)
    errors.push(
      error(
        rowNumber,
        "title",
        title,
        "FIELD_TOO_LONG",
        "title must contain at most 300 characters",
        "shorten the book title",
      ),
    );
  if (author && characterLength(author) > 200)
    errors.push(
      error(
        rowNumber,
        "author",
        author,
        "FIELD_TOO_LONG",
        "author must contain at most 200 characters",
        "shorten the author value",
      ),
    );
  if (description && characterLength(description) > BULK_IMPORT_LIMITS.maxCellCharacters)
    errors.push(
      error(
        rowNumber,
        "description",
        description,
        "FIELD_TOO_LONG",
        "description must contain at most 5,000 characters",
        "shorten the description",
      ),
    );
  if (categories.length > 12 || categories.some((category) => characterLength(category) > 60)) {
    errors.push(
      error(
        rowNumber,
        "categories",
        fields.categories,
        "INVALID_CATEGORIES",
        "categories may contain at most 12 values of 60 characters each",
        "separate short category names with semicolons",
      ),
    );
  }
  if (!["BB", "PB", "HB"].includes(formatValue))
    errors.push(
      error(
        rowNumber,
        "format",
        fields.format,
        "INVALID_FORMAT",
        "format must be BB, PB, or HB",
        "enter BB, PB, or HB",
      ),
    );
  if (!isbn)
    errors.push(
      error(
        rowNumber,
        "isbn",
        fields.isbn,
        "INVALID_ISBN",
        "ISBN format or check digit is invalid",
        "enter a valid ISBN-10 or ISBN-13",
      ),
    );
  if (!/^\d+$/u.test(priceText) || !Number.isSafeInteger(priceIdr) || priceIdr < 1) {
    errors.push(
      error(
        rowNumber,
        "price_idr",
        fields.price_idr,
        "INVALID_PRICE",
        "price_idr must be a positive integer IDR without symbols or separators",
        "enter digits only, for example 305000",
      ),
    );
  }

  return {
    rowNumber,
    publisher,
    publisherKey: publisherKeyValue,
    title,
    titleKey,
    author,
    description,
    categories,
    format: formatValue as BulkImportFormat,
    isbn,
    priceIdr,
    errors,
  };
}

export function equalCategories(left: string[], right: string[]): boolean {
  const normalizedLeft = left.map((value) => normalizeBulkText(value)).filter(Boolean);
  const normalizedRight = right.map((value) => normalizeBulkText(value)).filter(Boolean);
  return sameStringSet([...new Set(normalizedLeft)], [...new Set(normalizedRight)]);
}

export function equalOptionalText(left: string | undefined, right: string | undefined, description = false): boolean {
  return normalizeBulkText(left || "", description) === normalizeBulkText(right || "", description);
}

export function bulkImportTransition(state: BulkImportState, event: BulkImportEvent): BulkImportState {
  if (event === "RESET") return "IDLE";
  const transitions: Partial<Record<BulkImportState, Partial<Record<BulkImportEvent, BulkImportState>>>> = {
    IDLE: { SELECT_FILE: "FILE_SELECTED" },
    FILE_SELECTED: { START_PARSE: "PARSING", SELECT_FILE: "FILE_SELECTED" },
    PARSING: { PARSE_SUCCESS: "VALIDATING", PARSE_FAILURE: "VALIDATION_FAILED" },
    VALIDATING: { VALIDATE_SUCCESS: "READY_FOR_REVIEW", VALIDATE_FAILURE: "VALIDATION_FAILED" },
    VALIDATION_FAILED: { SELECT_FILE: "FILE_SELECTED" },
    READY_FOR_REVIEW: { CONFIRM_IMPORT: "IMPORTING", SELECT_FILE: "FILE_SELECTED" },
    IMPORTING: { IMPORT_SUCCESS: "COMPLETED", IMPORT_FAILURE: "IMPORT_FAILED" },
    COMPLETED: { SELECT_FILE: "FILE_SELECTED" },
    IMPORT_FAILED: { SELECT_FILE: "FILE_SELECTED", CONFIRM_IMPORT: "IMPORTING" },
  };
  const next = transitions[state]?.[event];
  if (!next) throw new Error("INVALID_IMPORT_TRANSITION");
  return next;
}
