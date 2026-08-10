export type DepositRequirementMode = "none" | "fixed" | "percentage";
export type InvoicePaymentStatus = "unpaid" | "payment_submitted" | "partially_paid" | "paid";

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

export function outstandingAmount(totalAmount: number, allocatedAmount: number, verifiedPaymentAmount = 0): number {
  return settlementAmounts(totalAmount, allocatedAmount, verifiedPaymentAmount).outstandingAmount;
}

export function settlementAmounts(
  totalAmount: number,
  allocatedAmount: number,
  verifiedPaymentAmount = 0,
): { outstandingAmount: number; overpaymentAmount: number } {
  safeNonNegativeInteger(totalAmount, "invoice total");
  if (!Number.isSafeInteger(allocatedAmount) || allocatedAmount < 0) {
    throw new Error("allocated amount is invalid");
  }
  if (
    !Number.isSafeInteger(verifiedPaymentAmount) ||
    verifiedPaymentAmount < 0 ||
    verifiedPaymentAmount > Number.MAX_SAFE_INTEGER - allocatedAmount
  ) {
    throw new Error("verified payment amount is invalid");
  }
  const settled = allocatedAmount + verifiedPaymentAmount;
  return {
    outstandingAmount: Math.max(0, totalAmount - settled),
    overpaymentAmount: Math.max(0, settled - totalAmount),
  };
}

export function invoicePaymentStatus(
  totalAmount: number,
  allocatedAmount: number,
  verifiedPaymentAmount: number,
  hasPendingConfirmation: boolean,
): InvoicePaymentStatus {
  const outstanding = outstandingAmount(totalAmount, allocatedAmount, verifiedPaymentAmount);
  if (outstanding === 0) return "paid";
  if (hasPendingConfirmation) return "payment_submitted";
  if (allocatedAmount > 0 || verifiedPaymentAmount > 0) return "partially_paid";
  return "unpaid";
}
