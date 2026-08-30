import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { evaluateCancellationEligibility } from "./lib/cancellationEligibility";
import { requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { invoiceProjection, effectiveInvoiceTotal } from "./lib/invoiceProjection";
import { fulfillableQuantityForOrderItem, needsResolution, exceptionsForOrderItem } from "./lib/orderExceptionState";
import { orderExceptionView } from "./lib/orderExceptionViews";
import { releaseReadyStockReservationsForOrder } from "./lib/readyStockReservations";
import { releaseAllocationInternal } from "./invoiceDepositAllocations";
import { createRefundObligationInternal } from "./refunds";
import { orderExceptionResolutionValidator, orderExceptionStatusValidator } from "./validators";

type DataCtx = QueryCtx | MutationCtx;
type ExceptionStatus = "opened" | "under_review" | "resolution_selected" | "resolved" | "rejected";
type ExceptionEventType =
  | "opened"
  | "review_started"
  | "resolution_selected"
  | "approved"
  | "rejected"
  | "resolved"
  | "financial_adjustment_created"
  | "deposit_allocation_released";

const adminExceptionTypeValidator = v.union(
  v.literal("out_of_stock"),
  v.literal("defect"),
  v.literal("admin_cancellation"),
);

function text(value: string | undefined, field: string, max = 500): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized;
}

function requiredText(value: string, field: string, max = 500): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized;
}

function validateQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity < 1) fail("EXCEPTION_QUANTITY_INVALID");
}

async function orderItemContext(ctx: DataCtx, orderItemId: Id<"orderItems">) {
  const orderItem = await ctx.db.get(orderItemId);
  const order = orderItem && (await ctx.db.get(orderItem.orderId));
  if (!orderItem || !order) fail("EXCEPTION_ORDER_ITEM_INVALID");
  return { orderItem, order };
}

async function currentInvoice(ctx: DataCtx, orderId: Id<"orders">) {
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .take(50);
  return invoices.find((invoice) => invoice.status !== "void") || null;
}

async function appendEvent(
  ctx: MutationCtx,
  exception: Pick<Doc<"orderExceptions">, "_id" | "orderId" | "orderItemId">,
  eventType: ExceptionEventType,
  actorUserId: Id<"appUsers">,
  fromStatus?: ExceptionStatus,
  toStatus?: ExceptionStatus,
  note?: string,
) {
  await ctx.db.insert("orderExceptionEvents", {
    exceptionId: exception._id,
    orderId: exception.orderId,
    orderItemId: exception.orderItemId,
    eventType,
    fromStatus,
    toStatus,
    note,
    actorUserId,
    createdAt: Date.now(),
  });
  const action =
    eventType === "financial_adjustment_created"
      ? "financial_adjustment.created"
      : eventType === "deposit_allocation_released"
        ? "deposit_allocation.released"
        : `exception.${eventType}`;
  await recordAudit(ctx, actorUserId, action, "orderException", exception._id, {
    orderId: String(exception.orderId),
    orderItemId: String(exception.orderItemId),
    ...(toStatus ? { status: toStatus } : {}),
  });
}

async function insertException(
  ctx: MutationCtx,
  input: {
    orderId: Id<"orders">;
    orderItemId: Id<"orderItems">;
    customerUserId: Id<"appUsers">;
    type: Doc<"orderExceptions">["type"];
    reasonCode?: string;
    reason: string;
    affectedQuantity: number;
    internalNote?: string;
    customerNote?: string;
    createdByUserId: Id<"appUsers">;
  },
) {
  const now = Date.now();
  const exceptionId = await ctx.db.insert("orderExceptions", {
    ...input,
    status: "opened",
    createdAt: now,
    updatedAt: now,
  });
  const exception = await ctx.db.get(exceptionId);
  if (!exception) fail("EXCEPTION_NOT_FOUND");
  await appendEvent(ctx, exception, "opened", input.createdByUserId, undefined, "opened", input.customerNote);
  return exception;
}

async function ensureOpenable(ctx: MutationCtx, orderItem: Doc<"orderItems">, affectedQuantity: number) {
  validateQuantity(affectedQuantity);
  const exceptions = await exceptionsForOrderItem(ctx, orderItem._id);
  if (exceptions.some(needsResolution)) fail("EXCEPTION_ACTIVE_EXISTS");
  const remaining = await fulfillableQuantityForOrderItem(ctx, orderItem);
  if (affectedQuantity > remaining) fail("EXCEPTION_QUANTITY_INVALID");
}

export const open = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    type: adminExceptionTypeValidator,
    affectedQuantity: v.number(),
    reason: v.string(),
    internalNote: v.optional(v.string()),
    customerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const { orderItem, order } = await orderItemContext(ctx, args.orderItemId);
    if (order.status === "cancelled") fail("CANCELLATION_NOT_ELIGIBLE");
    if (args.type === "admin_cancellation" && order.status === "completed") {
      fail("CANCELLATION_NOT_ELIGIBLE");
    }
    await ensureOpenable(ctx, orderItem, args.affectedQuantity);
    const exception = await insertException(ctx, {
      orderId: order._id,
      orderItemId: orderItem._id,
      customerUserId: order.customerUserId,
      type: args.type,
      reason: requiredText(args.reason, "reason"),
      affectedQuantity: args.affectedQuantity,
      internalNote: text(args.internalNote, "internal note"),
      customerNote: text(args.customerNote, "customer note"),
      createdByUserId: user._id,
    });
    if (args.type === "admin_cancellation") {
      await recordAudit(ctx, user._id, "cancellation.requested", "orderException", exception._id);
    }
    return orderExceptionView(ctx, exception, true);
  },
});

export const requestCancellation = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    affectedQuantity: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const { orderItem, order } = await orderItemContext(ctx, args.orderItemId);
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    const eligibility = await evaluateCancellationEligibility(ctx, orderItem._id);
    if (eligibility.decision === "not_eligible") {
      fail("CANCELLATION_NOT_ELIGIBLE", eligibility.reasonCode || "CANCELLATION_NOT_ELIGIBLE");
    }
    const affectedQuantity = args.affectedQuantity ?? (await fulfillableQuantityForOrderItem(ctx, orderItem));
    await ensureOpenable(ctx, orderItem, affectedQuantity);
    const exception = await insertException(ctx, {
      orderId: order._id,
      orderItemId: orderItem._id,
      customerUserId: order.customerUserId,
      type: "customer_cancellation",
      reasonCode: eligibility.reasonCode || undefined,
      reason: requiredText(args.reason, "reason"),
      affectedQuantity,
      customerNote: requiredText(args.reason, "reason"),
      createdByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "cancellation.requested", "orderException", exception._id, {
      decision: eligibility.decision,
    });
    return orderExceptionView(ctx, exception, false);
  },
});

export const getCancellationEligibility = query({
  args: { orderItemId: v.id("orderItems") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.own");
    const { order } = await orderItemContext(ctx, args.orderItemId);
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    return evaluateCancellationEligibility(ctx, args.orderItemId);
  },
});

export const startReview = mutation({
  args: { exceptionId: v.id("orderExceptions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) fail("EXCEPTION_NOT_FOUND");
    if (exception.status !== "opened") fail("EXCEPTION_INVALID_STATE");
    const now = Date.now();
    await ctx.db.patch(exception._id, {
      status: "under_review",
      reviewedAt: now,
      reviewedByUserId: user._id,
      updatedAt: now,
    });
    await appendEvent(ctx, exception, "review_started", user._id, "opened", "under_review");
    const updated = await ctx.db.get(exception._id);
    if (!updated) fail("EXCEPTION_NOT_FOUND");
    return orderExceptionView(ctx, updated, true);
  },
});

export const selectResolution = mutation({
  args: {
    exceptionId: v.id("orderExceptions"),
    resolution: orderExceptionResolutionValidator,
    recoverableRefundAmount: v.optional(v.number()),
    replacementReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) fail("EXCEPTION_NOT_FOUND");
    if (exception.status !== "under_review") fail("EXCEPTION_INVALID_STATE");
    const { orderItem } = await orderItemContext(ctx, exception.orderItemId);
    if (args.resolution === "replacement" && exception.type !== "defect") {
      fail("VALIDATION_FAILED", "replacement is only valid for defects");
    }
    if (args.resolution === "replacement" && !text(args.replacementReference, "replacement reference", 200)) {
      fail("VALIDATION_FAILED", "replacement reference is required");
    }
    if (args.recoverableRefundAmount !== undefined) {
      if (
        !Number.isSafeInteger(args.recoverableRefundAmount) ||
        args.recoverableRefundAmount < 0 ||
        args.recoverableRefundAmount > exception.affectedQuantity * orderItem.unitPriceAmountSnapshot
      ) {
        fail("EXCEPTION_FINANCIAL_INVALID");
      }
    }
    const now = Date.now();
    await ctx.db.patch(exception._id, {
      status: "resolution_selected",
      resolution: args.resolution,
      recoverableRefundAmount: args.recoverableRefundAmount,
      replacementReference:
        args.resolution === "replacement" ? text(args.replacementReference, "replacement reference", 200) : undefined,
      resolutionSelectedAt: now,
      updatedAt: now,
    });
    await appendEvent(ctx, exception, "resolution_selected", user._id, "under_review", "resolution_selected");
    const updated = await ctx.db.get(exception._id);
    if (!updated) fail("EXCEPTION_NOT_FOUND");
    return orderExceptionView(ctx, updated, true);
  },
});

export const reject = mutation({
  args: { exceptionId: v.id("orderExceptions"), rejectionReason: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) fail("EXCEPTION_NOT_FOUND");
    if (exception.status !== "opened" && exception.status !== "under_review") {
      fail("EXCEPTION_INVALID_STATE");
    }
    const rejectionReason = requiredText(args.rejectionReason, "rejection reason");
    const now = Date.now();
    await ctx.db.patch(exception._id, {
      status: "rejected",
      rejectionReason,
      rejectedAt: now,
      reviewedAt: exception.reviewedAt || now,
      reviewedByUserId: user._id,
      updatedAt: now,
    });
    await appendEvent(ctx, exception, "rejected", user._id, exception.status, "rejected", rejectionReason);
    if (exception.type === "customer_cancellation") {
      await recordAudit(ctx, user._id, "cancellation.rejected", "orderException", exception._id);
    }
    const updated = await ctx.db.get(exception._id);
    if (!updated) fail("EXCEPTION_NOT_FOUND");
    return orderExceptionView(ctx, updated, true);
  },
});

async function releaseInvoiceAllocations(ctx: MutationCtx, invoice: Doc<"invoices">, actorUserId: Id<"appUsers">) {
  const allocations = await ctx.db
    .query("invoiceDepositAllocations")
    .withIndex("by_invoice_and_status", (index) => index.eq("invoiceId", invoice._id).eq("status", "active"))
    .take(100);
  let released = 0;
  for (const allocation of allocations) {
    const result = await releaseAllocationInternal(ctx, allocation._id, actorUserId);
    released += result.allocation.amount;
  }
  return released;
}

async function maybeCancelOrder(ctx: MutationCtx, order: Doc<"orders">, actorUserId: Id<"appUsers">) {
  if (order.status !== "submitted") return;
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (index) => index.eq("orderId", order._id))
    .take(200);
  const remaining = await Promise.all(items.map((item) => fulfillableQuantityForOrderItem(ctx, item)));
  if (!items.length || remaining.some((quantity) => quantity > 0)) return;
  const now = Date.now();
  await ctx.db.patch(order._id, { status: "cancelled", cancelledAt: now, updatedAt: now });
  if (order.source === "ready_stock") await releaseReadyStockReservationsForOrder(ctx, order._id, actorUserId);
  await ctx.db.insert("orderStatusHistory", {
    orderId: order._id,
    fromStatus: order.status,
    toStatus: "cancelled",
    changedAt: now,
    changedByUserId: actorUserId,
    note: "All order quantities resolved through item exceptions",
  });
  await recordAudit(ctx, actorUserId, "order.status_changed", "order", order._id, { status: "cancelled" });
}

export const resolve = mutation({
  args: { exceptionId: v.id("orderExceptions") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) fail("EXCEPTION_NOT_FOUND");
    if (exception.status !== "resolution_selected" || !exception.resolution) {
      fail("EXCEPTION_RESOLUTION_REQUIRED");
    }
    const { orderItem, order } = await orderItemContext(ctx, exception.orderItemId);
    const originalItemValueAmount = exception.affectedQuantity * orderItem.unitPriceAmountSnapshot;
    if (!Number.isSafeInteger(originalItemValueAmount)) fail("EXCEPTION_FINANCIAL_INVALID");
    const invoiceBefore = await currentInvoice(ctx, order._id);
    const existingRefundObligations = invoiceBefore
      ? await ctx.db
          .query("refundObligations")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceBefore._id))
          .take(100)
      : [];
    const historicalRefundAmount = existingRefundObligations.reduce((total, row) => total + row.amount, 0);
    const paidRefundAmount = existingRefundObligations.reduce((total, row) => total + row.paidAmount, 0);
    const depositAmountBefore = invoiceBefore?.allocatedDepositAmount || 0;
    const depositReleaseAmount =
      exception.resolution === "deposit_release" && invoiceBefore
        ? await releaseInvoiceAllocations(ctx, invoiceBefore, user._id)
        : 0;
    const invoice = invoiceBefore ? await ctx.db.get(invoiceBefore._id) : null;
    const recoveryAmount =
      exception.recoverableRefundAmount ??
      (exception.type === "customer_cancellation" && exception.reasonCode === "BATCH_LOCKED"
        ? 0
        : originalItemValueAmount);
    if (!Number.isSafeInteger(recoveryAmount) || recoveryAmount < 0 || recoveryAmount > originalItemValueAmount) {
      fail("EXCEPTION_FINANCIAL_INVALID");
    }
    const invoiceAdjustmentAmount =
      exception.resolution === "no_action" || exception.resolution === "replacement" ? 0 : -recoveryAmount;
    let adjustedInvoiceTotalAmount: number | undefined;
    let depositAmountAfter = 0;
    let externalPaymentAmount = 0;
    let refundObligationAmount = 0;
    let refundObligationStatus: "none" | "credit_due" | "refund_due" | "settled" = "none";
    let currentOverpaymentAmount = 0;
    if (invoice) {
      adjustedInvoiceTotalAmount = effectiveInvoiceTotal(invoice) + invoiceAdjustmentAmount;
      if (!Number.isSafeInteger(adjustedInvoiceTotalAmount) || adjustedInvoiceTotalAmount < 0) {
        fail("EXCEPTION_FINANCIAL_INVALID");
      }
      const projection = await invoiceProjection(ctx, invoice, { adjustedTotalAmount: adjustedInvoiceTotalAmount });
      depositAmountAfter = projection.allocatedDepositAmount;
      externalPaymentAmount = projection.verifiedPaymentAmount;
      currentOverpaymentAmount = projection.overpaymentAmount;
      refundObligationAmount = Math.max(0, currentOverpaymentAmount - paidRefundAmount);
      refundObligationStatus = refundObligationAmount > 0 ? "refund_due" : "none";
      await ctx.db.patch(invoice._id, {
        financialAdjustmentAmount: invoice.financialAdjustmentAmount + invoiceAdjustmentAmount,
        ...projection,
        refundObligationAmount,
        refundObligationStatus,
        updatedAt: Date.now(),
      });
    }
    const now = Date.now();
    const financialAdjustmentId = await ctx.db.insert("orderExceptionFinancialAdjustments", {
      exceptionId: exception._id,
      orderId: order._id,
      orderItemId: orderItem._id,
      customerUserId: order.customerUserId,
      invoiceId: invoice?._id,
      affectedQuantity: exception.affectedQuantity,
      originalItemValueAmount,
      invoiceAdjustmentAmount,
      depositAmountBefore,
      depositReleaseAmount,
      depositAmountAfter,
      externalPaymentAmount,
      adjustedInvoiceTotalAmount,
      refundObligationAmount,
      refundObligationStatus,
      createdAt: now,
      createdByUserId: user._id,
    });
    const newRefundObligationAmount =
      exception.resolution === "no_action" ? 0 : Math.max(0, currentOverpaymentAmount - historicalRefundAmount);
    if (newRefundObligationAmount > 0) {
      const refundObligationId = await createRefundObligationInternal(ctx, {
        customerUserId: order.customerUserId,
        orderId: order._id,
        invoiceId: invoice?._id,
        exceptionId: exception._id,
        sourceAdjustmentId: financialAdjustmentId,
        reason: exception.type === "defect" ? "defect" : "cancellation",
        amount: newRefundObligationAmount,
        createdByUserId: user._id,
      });
      await ctx.db.patch(financialAdjustmentId, { refundObligationId });
      await ctx.db.patch(exception._id, { refundObligationId });
    }
    await ctx.db.patch(exception._id, { status: "resolved", resolvedAt: now, updatedAt: now });
    await appendEvent(ctx, exception, "approved", user._id, "resolution_selected", "resolved");
    await appendEvent(
      ctx,
      exception,
      "financial_adjustment_created",
      user._id,
      undefined,
      undefined,
      String(financialAdjustmentId),
    );
    if (depositReleaseAmount > 0) {
      await appendEvent(
        ctx,
        exception,
        "deposit_allocation_released",
        user._id,
        undefined,
        undefined,
        String(depositReleaseAmount),
      );
    }
    await appendEvent(ctx, exception, "resolved", user._id, "resolution_selected", "resolved");
    if (exception.type === "customer_cancellation" || exception.type === "admin_cancellation") {
      await recordAudit(ctx, user._id, "cancellation.approved", "orderException", exception._id);
    }
    const releasesReadyStock =
      order.source === "ready_stock" &&
      ((exception.type !== "defect" && exception.resolution !== "no_action") ||
        (exception.type === "defect" && exception.resolution === "refund_required"));
    if (releasesReadyStock) await releaseReadyStockReservationsForOrder(ctx, order._id, user._id);
    if (
      exception.resolution !== "no_action" &&
      exception.type !== "defect" &&
      (exception.type === "customer_cancellation" ||
        exception.type === "admin_cancellation" ||
        exception.type === "out_of_stock")
    ) {
      await maybeCancelOrder(ctx, order, user._id);
    }
    const updated = await ctx.db.get(exception._id);
    if (!updated) fail("EXCEPTION_NOT_FOUND");
    return orderExceptionView(ctx, updated, true);
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const page = await ctx.db
      .query("orderExceptions")
      .withIndex("by_customer_user_id_and_created_at", (index) => index.eq("customerUserId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(page.page.map((exception) => orderExceptionView(ctx, exception, false))),
    };
  },
});

export const listMineForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.own");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    const exceptions = await ctx.db
      .query("orderExceptions")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    return Promise.all(exceptions.map((exception) => orderExceptionView(ctx, exception, false)));
  },
});

export const getMine = query({
  args: { exceptionId: v.id("orderExceptions") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.own");
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) fail("EXCEPTION_NOT_FOUND");
    await requireOwnedResource(ctx, exception.customerUserId, "EXCEPTION_ACCESS_DENIED");
    return orderExceptionView(ctx, exception, false);
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(orderExceptionStatusValidator),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const page = args.status
      ? await ctx.db
          .query("orderExceptions")
          .withIndex("by_status_and_created_at", (index) => index.eq("status", args.status!))
          .order("desc")
          .paginate(args.paginationOpts ?? { numItems: 25, cursor: null })
      : await ctx.db
          .query("orderExceptions")
          .withIndex("by_created_at")
          .order("desc")
          .paginate(args.paginationOpts ?? { numItems: 25, cursor: null });
    return {
      ...page,
      page: await Promise.all(page.page.map((exception) => orderExceptionView(ctx, exception, true))),
    };
  },
});

export const listForOrderAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    const exceptions = await ctx.db
      .query("orderExceptions")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    return Promise.all(exceptions.map((exception) => orderExceptionView(ctx, exception, true)));
  },
});

export const getForAdmin = query({
  args: { exceptionId: v.id("orderExceptions") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) fail("EXCEPTION_NOT_FOUND");
    return orderExceptionView(ctx, exception, true);
  },
});
