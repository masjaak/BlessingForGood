import { describe, expect, it } from "vitest";
import { orderAnalyticsCsvRows } from "@/lib/analytics-export";
import { toExcelCsv } from "@/lib/excel-export";

describe("order analytics export", () => {
  it("emits one operational row per ordered format with the requested columns", () => {
    const rows = orderAnalyticsCsvRows([
      {
        customerName: "Blessy 6608",
        publisherName: "Publisher A",
        isbn: "9780002000001",
        bookTitle: "Book A",
        format: "HB",
        quantity: 1,
        catalogName: "CARGO 2",
        closeDate: Date.parse("2026-10-10T23:59:59.999+07:00"),
        supplierPriceGbpMinor: 1499,
        unitPriceAmount: 255000,
      },
      {
        customerName: "Blessy 6608",
        publisherName: "Publisher B",
        isbn: "9780002000003",
        bookTitle: "Book B",
        format: "PB",
        quantity: 2,
        catalogName: "CARGO 2",
        closeDate: Date.parse("2026-10-10T23:59:59.999+07:00"),
        supplierPriceGbpMinor: null,
        unitPriceAmount: 170000,
      },
    ]);

    expect(rows).toEqual([
      [
        "NAMA CUSTOMER",
        "PUBLISHER",
        "ISBN",
        "JUDUL",
        "FORMAT",
        "QTY",
        "NAMA CARGO",
        "TANGGAL CLOSE",
        "HARGA GBP",
        "HARGA IDR",
      ],
      ["Blessy 6608", "Publisher A", "9780002000001", "Book A", "HB", 1, "CARGO 2", "10 Okt 2026", "14.99", 255000],
      ["Blessy 6608", "Publisher B", "9780002000003", "Book B", "PB", 2, "CARGO 2", "10 Okt 2026", "", 170000],
    ]);
    expect(toExcelCsv(rows)).not.toContain("Referensi pesanan");
    expect(toExcelCsv(rows)).not.toContain("Total IDR");
  });

  it("keeps optional GBP and close date machine-safe when absent", () => {
    const csv = toExcelCsv(
      orderAnalyticsCsvRows([
        {
          customerName: "Customer",
          publisherName: "Publisher",
          isbn: "9781788417373",
          bookTitle: 'Book, "quoted"',
          format: "BB",
          quantity: 1,
          catalogName: null,
          closeDate: null,
          supplierPriceGbpMinor: null,
          unitPriceAmount: 125000,
        },
      ]),
    );

    expect(csv).toContain('Customer,Publisher,9781788417373,"Book, ""quoted""",BB,1,,,,125000');
    expect(csv).not.toContain("undefined");
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("NaN");
  });

  it("keeps customer identity and cargo identity independent in the generated CSV", () => {
    const csv = toExcelCsv(
      orderAnalyticsCsvRows([
        {
          customerName: "Customer A",
          publisherName: "Publisher A",
          isbn: "9780000000001",
          bookTitle: "Book A",
          format: "HB",
          quantity: 1,
          catalogName: "Cargo A",
          closeDate: null,
          supplierPriceGbpMinor: null,
          unitPriceAmount: 100000,
        },
        {
          customerName: "Customer B",
          publisherName: "Publisher B",
          isbn: "9780000000002",
          bookTitle: "Book B",
          format: "PB",
          quantity: 2,
          catalogName: "Cargo A",
          closeDate: null,
          supplierPriceGbpMinor: null,
          unitPriceAmount: 110000,
        },
        {
          customerName: "Customer A",
          publisherName: "Publisher C",
          isbn: "9780000000003",
          bookTitle: "Book C",
          format: "BB",
          quantity: 1,
          catalogName: "Cargo B",
          closeDate: null,
          supplierPriceGbpMinor: null,
          unitPriceAmount: 120000,
        },
      ]),
    );
    const parsedRows = csv
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n")
      .map((line) => line.split(","));

    expect(parsedRows[0]).toEqual([
      "NAMA CUSTOMER",
      "PUBLISHER",
      "ISBN",
      "JUDUL",
      "FORMAT",
      "QTY",
      "NAMA CARGO",
      "TANGGAL CLOSE",
      "HARGA GBP",
      "HARGA IDR",
    ]);
    expect(parsedRows.slice(1).map((row) => [row[0], row[6]])).toEqual([
      ["Customer A", "Cargo A"],
      ["Customer B", "Cargo A"],
      ["Customer A", "Cargo B"],
    ]);
  });
});
