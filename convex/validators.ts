import { v } from "convex/values";

export const bookFormatValidator = v.union(v.literal("BB"), v.literal("PB"), v.literal("HB"));
export const shipmentStageValidator = v.union(
  v.literal("po_closed"),
  v.literal("ordered_to_supplier"),
  v.literal("shipped_internationally"),
  v.literal("customs"),
  v.literal("to_indonesia_warehouse"),
  v.literal("at_store"),
);
export const fulfillmentStageValidator = v.union(
  v.literal("awaiting_payment"),
  v.literal("awaiting_address"),
  v.literal("packing"),
  v.literal("shipped"),
  v.literal("completed"),
);
export const invoiceStatusValidator = v.union(v.literal("draft"), v.literal("issued"), v.literal("void"));
export const depositRequirementModeValidator = v.union(v.literal("none"), v.literal("fixed"), v.literal("percentage"));
export const depositTransactionTypeValidator = v.union(
  v.literal("credit"),
  v.literal("reservation"),
  v.literal("release"),
  v.literal("debit"),
  v.literal("reversal"),
);
export const allocationStatusValidator = v.union(v.literal("active"), v.literal("released"), v.literal("reversed"));
export const sessionTokenValidator = v.string();
export const paginationValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

export function assertSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(message);
}
