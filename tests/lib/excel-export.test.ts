import { describe, expect, it } from "vitest";
import { toExcelCsv } from "@/lib/excel-export";

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
