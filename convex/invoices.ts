import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { calculateDepositRequired } from "./lib/invoiceCalculations";
import { invoiceNumberForId } from "./lib/invoiceNumbers";
import { fail } from "./lib/errors";
import { requireSession } from "./lib/sessions";
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
    depositRequirementMode: invoice.depositRequirementMode,
    depositRequirementValue: invoice.depositRequirementValue ?? null,
    depositRequiredAmount: invoice.depositRequiredAmount,
    allocatedDepositAmount: invoice.allocatedDepositAmount,
    outstandingAmount: invoice.outstandingAmount,
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

export const create = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    depositRequirementMode: depositRequirementModeValidator,
    depositRequirementValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
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
      customerSessionId: order.sessionId,
      invoiceNumber: "pending",
      status: "draft",
      currency: "IDR",
      subtotalAmount: snapshot.total,
      totalAmount: snapshot.total,
      depositRequirementMode: args.depositRequirementMode,
      depositRequirementValue: requirementValue,
      depositRequiredAmount,
      allocatedDepositAmount: 0,
      outstandingAmount: snapshot.total,
      createdAt: now,
      updatedAt: now,
      createdBySessionId: session._id,
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
    return invoiceView(ctx, invoiceId);
  },
});

export const issue = mutation({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.status === "issued") fail("INVOICE_ALREADY_ISSUED");
    if (invoice.status === "void") fail("INVOICE_VOID");
    const now = Date.now();
    await ctx.db.patch(args.invoiceId, { status: "issued", issuedAt: now, updatedAt: now });
    return invoiceView(ctx, args.invoiceId);
  },
});

export const voidInvoice = mutation({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.status === "void") fail("INVOICE_VOID");
    if (invoice.allocatedDepositAmount > 0) fail("INVOICE_INVALID_STATE", "release allocations before voiding");
    const now = Date.now();
    await ctx.db.patch(args.invoiceId, { status: "void", voidedAt: now, updatedAt: now });
    return invoiceView(ctx, args.invoiceId);
  },
});

export const listMine = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const page = await ctx.db
      .query("invoices")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerSessionId", session._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((invoice) => invoiceView(ctx, invoice._id))) };
  },
});

export const listForAdmin = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const page = await ctx.db.query("invoices").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((invoice) => invoiceView(ctx, invoice._id))) };
  },
});

export const getMine = query({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.customerSessionId !== session._id) fail("INVOICE_ACCESS_DENIED");
    return invoiceView(ctx, args.invoiceId);
  },
});

export const getForAdmin = query({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    return invoiceView(ctx, args.invoiceId);
  },
});
