import { describe, expect, it } from "vitest";
import { orderAnalyticsCsvRows } from "@/lib/analytics-export";
import { toExcelCsv } from "@/lib/excel-export";

describe("order analytics export", () => {
  it("emits one operational row per ordered format with the requested columns", () => {
    const rows = orderAnalyticsCsvRows([
      {
        customerName: "Blessy 6608",
        publisherName: "Publisher A",
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
      ["NAMA", "PUBLISHER", "JUDUL", "FORMAT", "QTY", "NAMA CARGO", "TANGGAL CLOSE", "HARGA GBP", "HARGA IDR"],
      ["Blessy 6608", "Publisher A", "Book A", "HB", 1, "CARGO 2", "10 Okt 2026", "14.99", 255000],
      ["Blessy 6608", "Publisher B", "Book B", "PB", 2, "CARGO 2", "10 Okt 2026", "", 170000],
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

    expect(csv).toContain('Customer,Publisher,"Book, ""quoted""",BB,1,,,,125000');
    expect(csv).not.toContain("undefined");
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("NaN");
  });
});
