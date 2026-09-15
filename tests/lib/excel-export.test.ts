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
  it("groups derived purchase rows by publisher and exports GBP as pounds", () => {
    const items = [
      {
        publisherName: "Publisher B",
        isbn: "9781788417373",
        bookTitle: "Zebra",
        format: "PB",
        quantity: 2,
        supplierPriceGbpMinor: 1299,
        unitPriceAmount: 210000,
      },
      {
        publisherName: "Publisher A",
        isbn: "9780000000001",
        bookTitle: "Alpha",
        format: "HB",
        quantity: 1,
        supplierPriceGbpMinor: null,
        unitPriceAmount: 180000,
      },
    ];
    const context = {
      batchName: "September Procurement",
      cargoName: "September Procurement",
      closeDate: Date.parse("2026-09-01T12:00:00.000Z"),
    };
    expect(purchaseSummaryCsvRows(items, context)).toEqual([
      [
        "NAMA BATCH",
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
      ["September Procurement", "Publisher A", "", "", "", "", "September Procurement", "1 Sep 2026", "", ""],
      [
        "September Procurement",
        "Publisher A",
        "9780000000001",
        "Alpha",
        "HB",
        1,
        "September Procurement",
        "1 Sep 2026",
        "",
        180000,
      ],
      ["September Procurement", "Publisher B", "", "", "", "", "September Procurement", "1 Sep 2026", "", ""],
      [
        "September Procurement",
        "Publisher B",
        "9781788417373",
        "Zebra",
        "PB",
        2,
        "September Procurement",
        "1 Sep 2026",
        "12.99",
        210000,
      ],
    ]);
    expect(toExcelCsv(purchaseSummaryCsvRows(items, context)).slice(1).split("\r\n")).toEqual([
      "NAMA BATCH,PUBLISHER,ISBN,JUDUL,FORMAT,QTY,NAMA CARGO,TANGGAL CLOSE,HARGA GBP,HARGA IDR",
      "September Procurement,Publisher A,,,,,September Procurement,1 Sep 2026,,",
      "September Procurement,Publisher A,9780000000001,Alpha,HB,1,September Procurement,1 Sep 2026,,180000",
      "September Procurement,Publisher B,,,,,September Procurement,1 Sep 2026,,",
      "September Procurement,Publisher B,9781788417373,Zebra,PB,2,September Procurement,1 Sep 2026,12.99,210000",
    ]);
  });

  it("leaves missing cargo and close date blank while keeping ISBN as exact CSV text", () => {
    const csv = toExcelCsv(
      purchaseSummaryCsvRows(
        [
          {
            publisherName: "Publisher",
            isbn: "9781788417373",
            bookTitle: "Exact ISBN",
            format: "BB",
            quantity: 2,
            supplierPriceGbpMinor: null,
            unitPriceAmount: 125000,
          },
        ],
        { batchName: "Batch", cargoName: null, closeDate: null },
      ),
    );

    expect(csv).toContain("Batch,Publisher,9781788417373,Exact ISBN,BB,2,,,");
    expect(csv).not.toContain("9.78178E+12");
  });
});
