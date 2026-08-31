import { describe, expect, it } from "vitest";
import { percentageToBasisPoints } from "@/lib/percentage";

describe("percentage input contract", () => {
  it("converts human percentages to canonical basis points", () => {
    expect([0, 10, 25, 50, 100].map(percentageToBasisPoints)).toEqual([0, 1000, 2500, 5000, 10000]);
    expect(() => percentageToBasisPoints(-1)).toThrow();
    expect(() => percentageToBasisPoints(101)).toThrow();
    expect(() => percentageToBasisPoints(Number.NaN)).toThrow();
    expect(() => percentageToBasisPoints(12.345)).toThrow();
  });
});
