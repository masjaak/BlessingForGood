import { describe, expect, it } from "vitest";
import {
  BOOK_FORMAT_VALUES,
  BULK_IMPORT_HEADERS,
  BULK_IMPORT_LIMITS,
  bulkImportTransition,
  normalizeBulkImportRow,
  parseBulkImportCsv,
  validateBulkImportFile,
} from "@/lib/bulk-import";

const validRow = {
  publisher: " Walker  Books ",
  title: "The, Quiet Book",
  author: "",
  description: 'A "quiet" description',
  categories: "Children Books; Picture Book; Children Books",
  format: "pb",
  isbn: "978-0-306-40615-7",
  price_idr: "305000",
};

describe("bulk import parser and contract", () => {
  it("parses BOM, quoted commas, escaped quotes, empty optional fields, and CRLF", () => {
    const csv =
      `\uFEFF${BULK_IMPORT_HEADERS.join(",")}\r\n` +
      `"${validRow.publisher}","${validRow.title}",,"${validRow.description.replaceAll('"', '""')}","${validRow.categories}",${validRow.format},${validRow.isbn},${validRow.price_idr}\r\n`;
    const result = parseBulkImportCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.fields).toMatchObject({
      publisher: validRow.publisher,
      title: validRow.title,
      description: validRow.description,
      author: "",
    });
  });

  it("supports commas, quotes, and line endings inside a quoted description", () => {
    const csv =
      `${BULK_IMPORT_HEADERS.join(",")}\n` +
      `Walker Books,Title,"Author","Line one, ""quoted""\r\nline two",,PB,0306406152,305000\n`;
    const result = parseBulkImportCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.fields.description).toBe('Line one, "quoted"\r\nline two');
  });

  it("rejects reordered, missing, and extra headers without guessing", () => {
    for (const headers of [
      [...BULK_IMPORT_HEADERS].reverse(),
      BULK_IMPORT_HEADERS.slice(1),
      [...BULK_IMPORT_HEADERS, "stock"],
    ]) {
      const result = parseBulkImportCsv(`${headers.join(",")}\n`);
      expect(result.errors[0]?.field).toBe("header");
    }
  });

  it("rejects malformed CSV and keeps formula-looking values as plain text", () => {
    const malformed = parseBulkImportCsv(
      `${BULK_IMPORT_HEADERS.join(",")}\nWalker Books,"unfinished,Author,,PB,0306406152,305000`,
    );
    expect(malformed.errors[0]?.code).toBe("MALFORMED_CSV");

    const misplacedQuote = parseBulkImportCsv(
      `${BULK_IMPORT_HEADERS.join(",")}\n"Walker Books"oops,Title,,Description,,PB,0306406152,305000`,
    );
    expect(misplacedQuote.errors[0]?.code).toBe("MALFORMED_CSV");

    const safe = parseBulkImportCsv(
      `${BULK_IMPORT_HEADERS.join(",")}\n"<script>alert(1)</script>","=SUM(A1:A2)","+cmd","@formula",,PB,0306406152,305000\n`,
    );
    expect(safe.errors).toEqual([]);
    expect(safe.rows[0]?.fields.title).toBe("=SUM(A1:A2)");
  });

  it("rejects NUL content before parsing records", () => {
    const result = parseBulkImportCsv(
      `${BULK_IMPORT_HEADERS.join(",")}\nWalker Books,Title,\u0000,,PB,0306406152,305000`,
    );
    expect(result.errors[0]).toMatchObject({ code: "BINARY_CONTENT", field: "file" });
  });

  it("enforces file, row, and Unicode cell limits", () => {
    expect(validateBulkImportFile({ name: "books.xlsx", size: 10, type: "text/csv" })[0]?.code).toBe(
      "UNSUPPORTED_FILE",
    );
    expect(
      validateBulkImportFile({
        name: "books.csv",
        size: BULK_IMPORT_LIMITS.maxBytes + 1,
        type: "text/csv",
      })[0]?.code,
    ).toBe("FILE_TOO_LARGE");
    expect(validateBulkImportFile({ name: "books.csv", size: 10, type: "application/vnd.ms-excel" })).toEqual([]);

    const rows = Array.from({ length: BULK_IMPORT_LIMITS.maxRows + 1 }, (_, index) =>
      ["Walker Books", `Title ${index}`, "", "", "", "PB", "0306406152", "305000"].join(","),
    );
    const result = parseBulkImportCsv(`${BULK_IMPORT_HEADERS.join(",")}\n${rows.join("\n")}`);
    expect(result.errors.some((error) => error.code === "ROW_LIMIT_EXCEEDED")).toBe(true);

    const longCell = "😀".repeat(BULK_IMPORT_LIMITS.maxCellCharacters + 1);
    const longResult = parseBulkImportCsv(
      `${BULK_IMPORT_HEADERS.join(",")}\nWalker Books,Title,,"${longCell}",,PB,0306406152,305000\n`,
    );
    expect(longResult.rows[0]?.errors.some((error) => error.code === "CELL_TOO_LONG")).toBe(true);
  });

  it("normalizes publisher, categories, ISBN, format, and positive integer price", () => {
    expect(normalizeBulkImportRow(validRow, 2)).toMatchObject({
      rowNumber: 2,
      publisher: "Walker Books",
      publisherKey: "walker-books",
      title: "The, Quiet Book",
      format: "PB",
      isbn: "9780306406157",
      priceIdr: 305000,
      categories: ["Children Books", "Picture Book"],
    });
  });

  it("accepts every canonical Book format and preserves its display label", () => {
    for (const format of BOOK_FORMAT_VALUES) {
      const result = normalizeBulkImportRow({ ...validRow, format: format.toLowerCase() }, 2);

      expect(result.errors.filter((error) => error.field === "format")).toEqual([]);
      expect(result.format).toBe(format);
    }
  });

  it("rejects invalid ISBN, money syntax, required fields, and forbidden control values", () => {
    const result = normalizeBulkImportRow(
      {
        ...validRow,
        publisher: "\u0000",
        title: "",
        format: "XX",
        isbn: "9780306406158",
        price_idr: "Rp305.000",
      },
      18,
    );
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["publisher", "title", "format", "isbn", "price_idr"]),
    );
  });
});

describe("bulk import state machine", () => {
  it.each([
    ["IDLE", "CONFIRM_IMPORT"],
    ["VALIDATION_FAILED", "CONFIRM_IMPORT"],
    ["PARSING", "CONFIRM_IMPORT"],
    ["VALIDATING", "CONFIRM_IMPORT"],
    ["READY_FOR_REVIEW", "IMPORT_SUCCESS"],
  ] as const)("rejects %s -> %s", (state, event) => {
    expect(() => bulkImportTransition(state, event)).toThrow("INVALID_IMPORT_TRANSITION");
  });

  it("requires confirmation before importing and exposes terminal states", () => {
    expect(bulkImportTransition("IDLE", "SELECT_FILE")).toBe("FILE_SELECTED");
    expect(bulkImportTransition("FILE_SELECTED", "START_PARSE")).toBe("PARSING");
    expect(bulkImportTransition("PARSING", "PARSE_SUCCESS")).toBe("VALIDATING");
    expect(bulkImportTransition("VALIDATING", "VALIDATE_SUCCESS")).toBe("READY_FOR_REVIEW");
    expect(bulkImportTransition("READY_FOR_REVIEW", "CONFIRM_IMPORT")).toBe("IMPORTING");
    expect(bulkImportTransition("IMPORTING", "IMPORT_SUCCESS")).toBe("COMPLETED");
    expect(bulkImportTransition("IMPORTING", "IMPORT_FAILURE")).toBe("IMPORT_FAILED");
    expect(bulkImportTransition("IMPORT_FAILED", "RESET")).toBe("IDLE");
  });
});
