export type DepositRequirementMode = "none" | "fixed" | "percentage";

function safeNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
}

export function calculateDepositRequired(totalAmount: number, mode: DepositRequirementMode, value?: number): number {
  safeNonNegativeInteger(totalAmount, "invoice total");
  if (mode === "none") return 0;
  if (mode === "fixed") {
    if (value === undefined || !Number.isSafeInteger(value) || value < 0 || value > totalAmount) {
      throw new Error("deposit requirement amount is invalid");
    }
    return value;
  }
  if (value === undefined || !Number.isSafeInteger(value) || value < 0 || value > 10000) {
    throw new Error("percentage basis points are invalid");
  }
  return Number((BigInt(totalAmount) * BigInt(value) + BigInt(5000)) / BigInt(10000));
}

export function outstandingAmount(totalAmount: number, allocatedAmount: number): number {
  safeNonNegativeInteger(totalAmount, "invoice total");
  if (!Number.isSafeInteger(allocatedAmount) || allocatedAmount < 0 || allocatedAmount > totalAmount) {
    throw new Error("allocated amount is invalid");
  }
  return totalAmount - allocatedAmount;
}
