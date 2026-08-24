import { describe, expect, it } from "vitest";
import { purchaseSummaryCsvRows, toExcelCsv } from "@/lib/excel-export";

describe("Excel-compatible export", () => {
  it("emits a UTF-8 BOM and safely quotes delimiters, quotes, and formulas", () => {
    expect(
      toExcelCsv([
        ["Order", "Customer"],
        ["=1+1", 'Ada, "Reader"'],
      ]),
    ).toBe('\uFEFFOrder,Customer\r\n"\'=1+1","Ada, ""Reader"""');
  });
});

describe("publisher purchase export", () => {
  it("groups derived purchase rows by publisher and keeps GBP in integer pence", () => {
    expect(
      purchaseSummaryCsvRows([
        {
          publisherName: "Publisher B",
          isbn: "9782",
          bookTitle: "Zebra",
          format: "PB",
          quantity: 2,
          supplierPriceGbpMinor: 1299,
          unitPriceAmount: 210000,
        },
        {
          publisherName: "Publisher A",
          isbn: "9781",
          bookTitle: "Alpha",
          format: "HB",
          quantity: 1,
          supplierPriceGbpMinor: null,
          unitPriceAmount: 180000,
        },
      ]),
    ).toEqual([
      ["Publisher", "ISBN", "Judul", "Format", "Qty", "Harga GBP", "Harga IDR"],
      ["Publisher A", "", "", "", "", "", ""],
      ["Publisher A", "9781", "Alpha", "HB", 1, "", 180000],
      ["Publisher B", "", "", "", "", "", ""],
      ["Publisher B", "9782", "Zebra", "PB", 2, 1299, 210000],
    ]);
  });
});
