import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { exceptionsForOrderItem, fulfillableQuantityForOrderItem, needsResolution } from "./orderExceptionState";

type DataCtx = QueryCtx | MutationCtx;

export type CancellationDecision = "eligible" | "requires_admin_review" | "not_eligible";
export type CancellationReasonCode =
  | "ALREADY_FULFILLED"
  | "ALREADY_CANCELLED"
  | "ACTIVE_EXCEPTION_EXISTS"
  | "NO_REMAINING_QUANTITY"
  | "BATCH_LOCKED"
  | "PAYMENT_RECONCILIATION_REQUIRED";

export type CancellationEligibility = {
  decision: CancellationDecision;
  reasonCode: CancellationReasonCode | null;
};

export async function evaluateCancellationEligibility(
  ctx: DataCtx,
  orderItemId: Id<"orderItems">,
): Promise<CancellationEligibility> {
  const orderItem = await ctx.db.get(orderItemId);
  const order = orderItem && (await ctx.db.get(orderItem.orderId));
  if (!orderItem || !order) return { decision: "not_eligible", reasonCode: "ALREADY_CANCELLED" };
  const exceptions = await exceptionsForOrderItem(ctx, orderItemId);
  if (exceptions.some(needsResolution)) {
    return { decision: "not_eligible", reasonCode: "ACTIVE_EXCEPTION_EXISTS" };
  }
  if (order.status === "cancelled") return { decision: "not_eligible", reasonCode: "ALREADY_CANCELLED" };
  if (order.status === "completed" || order.currentFulfillmentStage === "completed") {
    return { decision: "not_eligible", reasonCode: "ALREADY_FULFILLED" };
  }
  if ((await fulfillableQuantityForOrderItem(ctx, orderItem)) === 0) {
    return { decision: "not_eligible", reasonCode: "NO_REMAINING_QUANTITY" };
  }

  const assignments = await ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_order_item", (index) => index.eq("orderItemId", orderItemId))
    .take(200);
  for (const assignment of assignments) {
    const batch = await ctx.db.get(assignment.batchId);
    if (batch?.currentShipmentStage) return { decision: "requires_admin_review", reasonCode: "BATCH_LOCKED" };
  }

  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_order", (index) => index.eq("orderId", order._id))
    .take(50);
  const invoice = invoices.find((candidate) => candidate.status !== "void");
  if (invoice) {
    const confirmations = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
      .take(200);
    if (
      invoice.allocatedDepositAmount > 0 ||
      invoice.verifiedPaymentAmount > 0 ||
      confirmations.some(
        (confirmation) => confirmation.status === "submitted" || confirmation.status === "under_review",
      )
    ) {
      return { decision: "requires_admin_review", reasonCode: "PAYMENT_RECONCILIATION_REQUIRED" };
    }
  }
  return { decision: "eligible", reasonCode: null };
}
