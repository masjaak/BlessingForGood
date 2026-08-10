import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { calculateDepositRequired } from "./lib/invoiceCalculations";
import { effectiveInvoiceTotal, invoiceProjection } from "./lib/invoiceProjection";
import { invoiceNumberForId } from "./lib/invoiceNumbers";
import { fail } from "./lib/errors";
import { depositRequirementModeValidator } from "./validators";

type DataCtx = QueryCtx | MutationCtx;

async function invoiceView(ctx: DataCtx, invoiceId: Id<"invoices">) {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) fail("INVOICE_NOT_FOUND");
  const items = await ctx.db
    .query("invoiceItems")
    .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
    .order("asc")
    .take(200);
  return {
    invoiceId: invoice._id,
    id: invoice._id,
    orderId: invoice.orderId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    currency: invoice.currency,
    subtotalAmount: invoice.subtotalAmount,
    totalAmount: invoice.totalAmount,
    adjustedTotalAmount: effectiveInvoiceTotal(invoice),
    financialAdjustmentAmount: invoice.financialAdjustmentAmount,
    depositRequirementMode: invoice.depositRequirementMode,
    depositRequirementValue: invoice.depositRequirementValue ?? null,
    depositRequiredAmount: invoice.depositRequiredAmount,
    allocatedDepositAmount: invoice.allocatedDepositAmount,
    verifiedPaymentAmount: invoice.verifiedPaymentAmount,
    outstandingAmount: invoice.outstandingAmount,
    overpaymentAmount: invoice.overpaymentAmount,
    refundObligationAmount: invoice.refundObligationAmount,
    refundObligationStatus: invoice.refundObligationStatus,
    paymentStatus: invoice.paymentStatus,
    createdAt: new Date(invoice.createdAt).toISOString(),
    updatedAt: new Date(invoice.updatedAt).toISOString(),
    issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : null,
    voidedAt: invoice.voidedAt ? new Date(invoice.voidedAt).toISOString() : null,
    items: items.map((item) => ({
      invoiceItemId: item._id,
      description: item.descriptionSnapshot,
      bookTitleSnapshot: item.bookTitleSnapshot,
      publisherNameSnapshot: item.publisherNameSnapshot,
      formatSnapshot: item.formatSnapshot,
      isbnSnapshot: item.isbnSnapshot,
      quantity: item.quantity,
      unitPriceAmountSnapshot: item.unitPriceAmountSnapshot,
      subtotalAmount: item.subtotalAmount,
    })),
  };
}

function requiredAmount(totalAmount: number, mode: "none" | "fixed" | "percentage", value?: number): number {
  try {
    return calculateDepositRequired(totalAmount, mode, value);
  } catch {
    fail("INVOICE_REQUIREMENT_INVALID");
  }
}

async function invoiceItemsForOrder(ctx: MutationCtx, orderId: Id<"orders">) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .order("asc")
    .take(200);
  if (!items.length) fail("INVOICE_TOTAL_INVALID");
  let total = 0;
  for (const item of items) {
    const subtotal = item.unitPriceAmountSnapshot * item.quantity;
    if (
      !Number.isSafeInteger(item.unitPriceAmountSnapshot) ||
      item.unitPriceAmountSnapshot < 0 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      !Number.isSafeInteger(subtotal) ||
      subtotal !== item.subtotalAmount
    ) {
      fail("INVOICE_TOTAL_INVALID");
    }
    total += subtotal;
    if (!Number.isSafeInteger(total)) fail("INVOICE_TOTAL_INVALID");
  }
  return { items, total };
}

async function applyExistingExceptionAdjustments(ctx: MutationCtx, invoice: Doc<"invoices">) {
  const adjustments = await ctx.db
    .query("orderExceptionFinancialAdjustments")
    .withIndex("by_order", (index) => index.eq("orderId", invoice.orderId))
    .take(200);
  let financialAdjustmentAmount = 0;
  for (const adjustment of adjustments) {
    if (adjustment.invoiceId && adjustment.invoiceId !== invoice._id) {
      const priorInvoice = await ctx.db.get(adjustment.invoiceId);
      if (priorInvoice && priorInvoice.status !== "void") continue;
    }
    financialAdjustmentAmount += adjustment.invoiceAdjustmentAmount;
  }
  if (!adjustments.length) return;
  const adjustedTotalAmount = invoice.totalAmount + financialAdjustmentAmount;
  if (!Number.isSafeInteger(adjustedTotalAmount) || adjustedTotalAmount < 0) fail("EXCEPTION_FINANCIAL_INVALID");
  const projection = await invoiceProjection(ctx, invoice, { adjustedTotalAmount });
  await ctx.db.patch(invoice._id, {
    financialAdjustmentAmount,
    ...projection,
    refundObligationAmount: projection.overpaymentAmount,
    refundObligationStatus: projection.overpaymentAmount > 0 ? "refund_due" : "none",
    updatedAt: Date.now(),
  });
}

export const create = mutation({
  args: {
    orderId: v.id("orders"),
    depositRequirementMode: depositRequirementModeValidator,
    depositRequirementValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(50);
    if (existing.some((invoice) => invoice.status !== "void")) fail("INVOICE_ALREADY_EXISTS");
    const snapshot = await invoiceItemsForOrder(ctx, order._id);
    if (snapshot.total !== order.totalAmount || snapshot.total !== order.subtotalAmount) fail("INVOICE_TOTAL_INVALID");
    const requirementValue = args.depositRequirementMode === "none" ? undefined : args.depositRequirementValue;
    const depositRequiredAmount = requiredAmount(snapshot.total, args.depositRequirementMode, requirementValue);
    const now = Date.now();
    const invoiceId = await ctx.db.insert("invoices", {
      orderId: order._id,
      customerUserId: order.customerUserId,
      invoiceNumber: "pending",
      status: "draft",
      currency: "IDR",
      subtotalAmount: snapshot.total,
      totalAmount: snapshot.total,
      adjustedTotalAmount: snapshot.total,
      financialAdjustmentAmount: 0,
      depositRequirementMode: args.depositRequirementMode,
      depositRequirementValue: requirementValue,
      depositRequiredAmount,
      allocatedDepositAmount: 0,
      verifiedPaymentAmount: 0,
      outstandingAmount: snapshot.total,
      overpaymentAmount: 0,
      refundObligationAmount: 0,
      refundObligationStatus: "none",
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(invoiceId, { invoiceNumber: invoiceNumberForId(invoiceId, now) });
    for (const item of snapshot.items) {
      await ctx.db.insert("invoiceItems", {
        invoiceId,
        orderItemId: item._id,
        descriptionSnapshot: `${item.bookTitleSnapshot} · ${item.formatSnapshot} · ${item.isbnSnapshot}`,
        bookTitleSnapshot: item.bookTitleSnapshot,
        publisherNameSnapshot: item.publisherNameSnapshot,
        formatSnapshot: item.formatSnapshot,
        isbnSnapshot: item.isbnSnapshot,
        quantity: item.quantity,
        unitPriceAmountSnapshot: item.unitPriceAmountSnapshot,
        subtotalAmount: item.subtotalAmount,
        createdAt: now,
      });
    }
    const createdInvoice = await ctx.db.get(invoiceId);
    if (!createdInvoice) fail("INVOICE_NOT_FOUND");
    await applyExistingExceptionAdjustments(ctx, createdInvoice);
    await recordAudit(ctx, user._id, "invoice.created", "invoice", invoiceId);
    return invoiceView(ctx, invoiceId);
  },
});

export const issue = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.status === "issued") fail("INVOICE_ALREADY_ISSUED");
    if (invoice.status === "void") fail("INVOICE_VOID");
    const now = Date.now();
    await ctx.db.patch(args.invoiceId, { status: "issued", issuedAt: now, updatedAt: now });
    await recordAudit(ctx, user._id, "invoice.issued", "invoice", args.invoiceId);
    return invoiceView(ctx, args.invoiceId);
  },
});

export const voidInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.status === "void") fail("INVOICE_VOID");
    if (invoice.allocatedDepositAmount > 0 || invoice.verifiedPaymentAmount > 0) {
      fail("INVOICE_INVALID_STATE", "release or reverse payment settlement before voiding");
    }
    const confirmations = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", args.invoiceId))
      .take(200);
    if (
      confirmations.some(
        (confirmation) => confirmation.status === "submitted" || confirmation.status === "under_review",
      )
    ) {
      fail("INVOICE_INVALID_STATE", "resolve payment confirmations before voiding");
    }
    const now = Date.now();
    await ctx.db.patch(args.invoiceId, { status: "void", voidedAt: now, updatedAt: now });
    await recordAudit(ctx, user._id, "invoice.voided", "invoice", args.invoiceId);
    return invoiceView(ctx, args.invoiceId);
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.read.own");
    const page = await ctx.db
      .query("invoices")
      .withIndex("by_customer_user_id_and_created_at", (index) => index.eq("customerUserId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((invoice) => invoiceView(ctx, invoice._id))) };
  },
});

export const listForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const page = await ctx.db.query("invoices").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((invoice) => invoiceView(ctx, invoice._id))) };
  },
});

export const getMine = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.own");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    await requireOwnedResource(ctx, invoice.customerUserId, "INVOICE_ACCESS_DENIED");
    return invoiceView(ctx, args.invoiceId);
  },
});

export const getForAdmin = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    return invoiceView(ctx, args.invoiceId);
  },
});
