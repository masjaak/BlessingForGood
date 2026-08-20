import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { effectiveInvoiceTotal } from "./invoiceProjection";

type DataCtx = QueryCtx | MutationCtx;

export async function orderExceptionView(ctx: DataCtx, exception: Doc<"orderExceptions">, includeInternal: boolean) {
  const orderItem = await ctx.db.get(exception.orderItemId);
  const order = await ctx.db.get(exception.orderId);
  const invoice = order
    ? (
        await ctx.db
          .query("invoices")
          .withIndex("by_order", (index) => index.eq("orderId", order._id))
          .take(50)
      ).find((candidate) => candidate.status !== "void")
    : null;
  const assignments = await ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_order_item", (index) => index.eq("orderItemId", exception.orderItemId))
    .take(200);
  const batchContext = await Promise.all(
    assignments.map(async (assignment) => {
      const batch = await ctx.db.get(assignment.batchId);
      return {
        batchId: assignment.batchId,
        batchName: batch?.name || "Unknown batch",
        shipmentStage: batch?.currentShipmentStage || null,
        assignedQuantity: assignment.assignedQuantity,
      };
    }),
  );
  const events = await ctx.db
    .query("orderExceptionEvents")
    .withIndex("by_exception_and_created_at", (index) => index.eq("exceptionId", exception._id))
    .order("asc")
    .take(100);
  const financial = await ctx.db
    .query("orderExceptionFinancialAdjustments")
    .withIndex("by_exception", (index) => index.eq("exceptionId", exception._id))
    .unique();
  return {
    exceptionId: exception._id,
    orderId: exception.orderId,
    orderItemId: exception.orderItemId,
    customerUserId: exception.customerUserId,
    type: exception.type,
    status: exception.status,
    reasonCode: exception.reasonCode || null,
    reason: exception.reason,
    affectedQuantity: exception.affectedQuantity,
    customerNote: exception.customerNote || null,
    internalNote: includeInternal ? exception.internalNote || null : null,
    resolution: exception.resolution || null,
    recoverableRefundAmount: exception.recoverableRefundAmount ?? null,
    replacementReference: includeInternal ? exception.replacementReference || null : null,
    refundObligationId: exception.refundObligationId || null,
    rejectionReason: includeInternal ? exception.rejectionReason || null : null,
    createdAt: new Date(exception.createdAt).toISOString(),
    updatedAt: new Date(exception.updatedAt).toISOString(),
    reviewedAt: exception.reviewedAt ? new Date(exception.reviewedAt).toISOString() : null,
    resolvedAt: exception.resolvedAt ? new Date(exception.resolvedAt).toISOString() : null,
    rejectedAt: exception.rejectedAt ? new Date(exception.rejectedAt).toISOString() : null,
    order: order
      ? {
        orderId: order._id,
        orderCode: order.orderCode || null,
        customerName: order.customerName,
          customerEmail: order.customerEmail || null,
          status: order.status,
          totalAmount: order.totalAmount,
        }
      : null,
    item: orderItem
      ? {
          orderItemId: orderItem._id,
          bookTitle: orderItem.bookTitleSnapshot,
          publisherName: orderItem.publisherNameSnapshot,
          format: orderItem.formatSnapshot,
          isbn: orderItem.isbnSnapshot,
          orderedQuantity: orderItem.quantity,
          unitPriceAmount: orderItem.unitPriceAmountSnapshot,
          subtotalAmount: orderItem.subtotalAmount,
        }
      : null,
    batchContext,
    invoice: invoice
      ? {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          originalTotalAmount: invoice.totalAmount,
          adjustedTotalAmount: effectiveInvoiceTotal(invoice),
          allocatedDepositAmount: invoice.allocatedDepositAmount,
          verifiedPaymentAmount: invoice.verifiedPaymentAmount,
          outstandingAmount: invoice.outstandingAmount,
          overpaymentAmount: invoice.overpaymentAmount,
          refundObligationAmount: invoice.refundObligationAmount,
          refundObligationStatus: invoice.refundObligationStatus,
        }
      : null,
    financialImpact: financial
      ? {
          originalItemValueAmount: financial.originalItemValueAmount,
          invoiceAdjustmentAmount: financial.invoiceAdjustmentAmount,
          depositAmountBefore: financial.depositAmountBefore,
          depositReleaseAmount: financial.depositReleaseAmount,
          depositAmountAfter: financial.depositAmountAfter,
          externalPaymentAmount: financial.externalPaymentAmount,
          adjustedInvoiceTotalAmount: financial.adjustedInvoiceTotalAmount ?? null,
          refundObligationAmount: financial.refundObligationAmount,
          refundObligationStatus: financial.refundObligationStatus,
          refundObligationId: financial.refundObligationId || null,
        }
      : null,
    history: events.map((event) => ({
      eventType: event.eventType,
      fromStatus: event.fromStatus || null,
      toStatus: event.toStatus || null,
      note: event.note || null,
      at: new Date(event.createdAt).toISOString(),
      actorUserId: includeInternal ? event.actorUserId : null,
    })),
  };
}

export async function exceptionEventsForOrder(ctx: DataCtx, orderId: Id<"orders">) {
  return ctx.db
    .query("orderExceptionEvents")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .take(200);
}
