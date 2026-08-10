import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { invoicePaymentStatus, settlementAmounts } from "./invoiceCalculations";

type DataCtx = QueryCtx | MutationCtx;

export function effectiveInvoiceTotal(invoice: Doc<"invoices">): number {
  return invoice.adjustedTotalAmount ?? invoice.totalAmount;
}

async function hasPendingPaymentConfirmation(ctx: DataCtx, invoiceId: Id<"invoices">): Promise<boolean> {
  const confirmations = await ctx.db
    .query("paymentConfirmations")
    .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
    .take(200);
  return confirmations.some(
    (confirmation) => confirmation.status === "submitted" || confirmation.status === "under_review",
  );
}

export async function invoiceProjection(
  ctx: DataCtx,
  invoice: Doc<"invoices">,
  overrides: Partial<
    Pick<Doc<"invoices">, "adjustedTotalAmount" | "allocatedDepositAmount" | "verifiedPaymentAmount">
  > = {},
) {
  const adjustedTotalAmount = overrides.adjustedTotalAmount ?? effectiveInvoiceTotal(invoice);
  const allocatedDepositAmount = overrides.allocatedDepositAmount ?? invoice.allocatedDepositAmount;
  const verifiedPaymentAmount = overrides.verifiedPaymentAmount ?? invoice.verifiedPaymentAmount;
  const settlement = settlementAmounts(adjustedTotalAmount, allocatedDepositAmount, verifiedPaymentAmount);
  return {
    adjustedTotalAmount,
    allocatedDepositAmount,
    verifiedPaymentAmount,
    outstandingAmount: settlement.outstandingAmount,
    overpaymentAmount: settlement.overpaymentAmount,
    paymentStatus: invoicePaymentStatus(
      adjustedTotalAmount,
      allocatedDepositAmount,
      verifiedPaymentAmount,
      await hasPendingPaymentConfirmation(ctx, invoice._id),
    ),
  };
}
