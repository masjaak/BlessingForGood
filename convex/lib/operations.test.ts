/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";
import { canTransitionFulfillment } from "./fulfillmentTransitions";
import { calculateDepositRequired } from "./invoiceCalculations";
import { inverseLedgerDeltas, ledgerDeltas } from "./depositLedger";
import { canTransitionShipment } from "./shipmentTransitions";

describe("BFG operation state machines", () => {
  it("accepts only the first or explicitly skipped forward shipment stage", () => {
    expect(canTransitionShipment(undefined, "po_closed")).toBe(true);
    expect(canTransitionShipment(undefined, "customs")).toBe(false);
    expect(canTransitionShipment("po_closed", "ordered_to_supplier")).toBe(true);
    expect(canTransitionShipment("po_closed", "customs")).toBe(false);
    expect(canTransitionShipment("po_closed", "customs", true)).toBe(true);
    expect(canTransitionShipment("customs", "po_closed", true)).toBe(false);
  });

  it("accepts only the next fulfillment stage", () => {
    expect(canTransitionFulfillment(undefined, "awaiting_payment")).toBe(true);
    expect(canTransitionFulfillment("awaiting_payment", "awaiting_address")).toBe(true);
    expect(canTransitionFulfillment("awaiting_payment", "packing")).toBe(false);
    expect(canTransitionFulfillment("shipped", "packing")).toBe(false);
  });
});

describe("BFG exact financial helpers", () => {
  it("calculates none, fixed, and basis-point deposit requirements", () => {
    expect(calculateDepositRequired(250001, "none")).toBe(0);
    expect(calculateDepositRequired(250001, "fixed", 50000)).toBe(50000);
    expect(calculateDepositRequired(250001, "percentage", 3333)).toBe(83325);
    expect(calculateDepositRequired(1, "percentage", 5000)).toBe(1);
  });

  it("rejects invalid requirements", () => {
    expect(() => calculateDepositRequired(100, "fixed", 101)).toThrow("deposit requirement");
    expect(() => calculateDepositRequired(100, "percentage", 10001)).toThrow("basis points");
    expect(() => calculateDepositRequired(100, "percentage", 12.5)).toThrow("basis points");
  });

  it("makes reversal deltas exact inverses", () => {
    for (const type of ["credit", "reservation", "release", "debit"] as const) {
      expect(inverseLedgerDeltas(ledgerDeltas(type, 500))).toEqual({
        availableDelta: -ledgerDeltas(type, 500).availableDelta,
        reservedDelta: -ledgerDeltas(type, 500).reservedDelta,
      });
    }
  });
});
