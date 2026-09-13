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
  | "INVALID_QUANTITY"
  | "BATCH_LOCKED"
  | "BATCH_RECONCILIATION_REQUIRED"
  | "INVOICE_RECONCILIATION_REQUIRED"
  | "PAYMENT_RECONCILIATION_REQUIRED";

export type CancellationEligibility = {
  decision: CancellationDecision;
  reasonCode: CancellationReasonCode | null;
};

export type AdminCancellationEligibility = CancellationEligibility & {
  cancellableQuantity: number;
  requestedQuantity: number;
  assignedQuantity: number;
  hasLockedBatch: boolean;
  hasActiveInvoice: boolean;
};

async function assignmentState(ctx: DataCtx, orderItemId: Id<"orderItems">) {
  const assignments = await ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_order_item", (index) => index.eq("orderItemId", orderItemId))
    .take(200);
  let assignedQuantity = 0;
  let hasLockedBatch = false;
  for (const assignment of assignments) {
    assignedQuantity += assignment.assignedQuantity;
    const batch = await ctx.db.get(assignment.batchId);
    if (!batch || batch.isArchived || batch.currentShipmentStage) hasLockedBatch = true;
  }
  return { assignedQuantity, hasLockedBatch };
}

async function activeInvoiceForOrder(ctx: DataCtx, orderId: Id<"orders">) {
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .take(50);
  return invoices.find((invoice) => invoice.status !== "void") || null;
}

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

  const { hasLockedBatch } = await assignmentState(ctx, orderItemId);
  if (hasLockedBatch) return { decision: "requires_admin_review", reasonCode: "BATCH_LOCKED" };

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

export async function evaluateAdminCancellationEligibility(
  ctx: DataCtx,
  orderItemId: Id<"orderItems">,
  requestedQuantity: number,
): Promise<AdminCancellationEligibility> {
  const orderItem = await ctx.db.get(orderItemId);
  const order = orderItem && (await ctx.db.get(orderItem.orderId));
  const base = await evaluateCancellationEligibility(ctx, orderItemId);
  if (!orderItem || !order) {
    return {
      ...base,
      cancellableQuantity: 0,
      requestedQuantity,
      assignedQuantity: 0,
      hasLockedBatch: false,
      hasActiveInvoice: false,
    };
  }

  const cancellableQuantity = await fulfillableQuantityForOrderItem(ctx, orderItem);
  const { assignedQuantity, hasLockedBatch } = await assignmentState(ctx, orderItemId);
  const hasActiveInvoice = Boolean(await activeInvoiceForOrder(ctx, order._id));
  let eligibility = base;

  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > cancellableQuantity) {
    eligibility = { decision: "not_eligible", reasonCode: "INVALID_QUANTITY" };
  } else if (eligibility.decision === "eligible") {
    if (hasLockedBatch) {
      eligibility = { decision: "requires_admin_review", reasonCode: "BATCH_LOCKED" };
    } else if (hasActiveInvoice) {
      eligibility = { decision: "requires_admin_review", reasonCode: "INVOICE_RECONCILIATION_REQUIRED" };
    } else if (assignedQuantity > cancellableQuantity - requestedQuantity) {
      eligibility = { decision: "requires_admin_review", reasonCode: "BATCH_RECONCILIATION_REQUIRED" };
    }
  }

  return {
    ...eligibility,
    cancellableQuantity,
    requestedQuantity,
    assignedQuantity,
    hasLockedBatch,
    hasActiveInvoice,
  };
}
