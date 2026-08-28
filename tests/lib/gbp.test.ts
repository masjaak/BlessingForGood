import { describe, expect, it } from "vitest";
import { formatGbpMinor, normalizeGbpInput, parseGbpMinor } from "@/lib/gbp";

describe("GBP minor-unit conversion", () => {
  it.each([
    ["9", 900],
    ["9.9", 990],
    ["9.99", 999],
    ["8.99", 899],
    ["18.99", 1899],
    ["19.99", 1999],
  ])("parses %s pounds as %s pence", (input, expected) => {
    expect(parseGbpMinor(input)).toBe(expected);
  });

  it("normalizes a mobile comma separator before parsing", () => {
    expect(normalizeGbpInput("19,99")).toBe("19.99");
    expect(parseGbpMinor("19,99")).toBe(1999);
  });

  it("formats stored pence with a dot and two fractional digits", () => {
    expect(formatGbpMinor(899)).toBe("8.99");
    expect(formatGbpMinor(1999)).toBe("19.99");
  });

  it("rejects more than two fractional digits", () => {
    expect(() => parseGbpMinor("19.999")).toThrow(/maksimal 2 desimal/);
  });
});
