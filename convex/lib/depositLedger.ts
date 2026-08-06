export type LedgerTransactionType = "credit" | "reservation" | "release" | "debit";

export type LedgerDeltas = {
  availableDelta: number;
  reservedDelta: number;
};

function positiveAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("deposit amount must be a positive integer");
}

export function ledgerDeltas(type: LedgerTransactionType, amount: number): LedgerDeltas {
  positiveAmount(amount);
  if (type === "credit" || type === "release") return { availableDelta: amount, reservedDelta: 0 };
  if (type === "reservation") return { availableDelta: -amount, reservedDelta: amount };
  return { availableDelta: -amount, reservedDelta: 0 };
}

export function inverseLedgerDeltas(deltas: LedgerDeltas): LedgerDeltas {
  return { availableDelta: -deltas.availableDelta, reservedDelta: -deltas.reservedDelta };
}

export function canApplyLedgerDeltas(availableAmount: number, reservedAmount: number, deltas: LedgerDeltas): boolean {
  return availableAmount + deltas.availableDelta >= 0 && reservedAmount + deltas.reservedDelta >= 0;
}
