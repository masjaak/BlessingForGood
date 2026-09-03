import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { calculateDepositRequired } from "./lib/invoiceCalculations";
import { effectiveInvoiceTotal, invoiceProjection } from "./lib/invoiceProjection";
import {
  invoiceDatePart,
  invoiceNumberForSequence,
  isCanonicalInvoiceNumber,
  nextInvoiceNumber,
} from "./lib/invoiceNumbers";
import { fail } from "./lib/errors";
import { depositRequirementModeValidator } from "./validators";
import { notifyUser } from "./lib/notifications";
import { exceptionsForOrderItem, needsResolution } from "./lib/orderExceptionState";

type DataCtx = QueryCtx | MutationCtx;

const MAX_BACKFILL_SCAN = 2000;
const MAX_BATCH_INVOICE_ITEMS = 2000;

type BatchInvoiceLine = {
  item: Doc<"orderItems">;
  order: Doc<"orders">;
  quantity: number;
  subtotal: number;
};

type BatchInvoiceEligibility = { eligible: true } | { eligible: false; reason: string };

function legacyInvoiceNumber(value: string): boolean {
  return !isCanonicalInvoiceNumber(value);
}

function backfillLimit(value: number | undefined): number {
  return Math.min(Math.max(Math.floor(value || 200), 1), MAX_BACKFILL_SCAN);
}

async function invoiceView(ctx: DataCtx, invoiceId: Id<"invoices">) {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) fail("INVOICE_NOT_FOUND");
  const [order, customer, batch, items] = await Promise.all([
    ctx.db.get(invoice.orderId),
    ctx.db.get(invoice.customerUserId),
    invoice.batchId ? ctx.db.get(invoice.batchId) : Promise.resolve(null),
    ctx.db
      .query("invoiceItems")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
      .order("asc")
      .take(200),
  ]);
  return {
    invoiceId: invoice._id,
    id: invoice._id,
    customerUserId: invoice.customerUserId,
    customerName: order?.customerName || customer?.displayNameSnapshot || "Pelanggan BFG",
    customerEmail: order?.customerEmail || customer?.emailSnapshot || null,
    customerMemberCode: customer?.memberCode ?? null,
    orderId: invoice.orderId,
    orderCode: order?.orderCode || null,
    batchId: invoice.batchId ?? null,
    batchName: batch?.name ?? null,
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

async function activeInvoiceForCustomerBatch(ctx: DataCtx, customerUserId: Id<"appUsers">, batchId: Id<"batches">) {
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_customer_user_id_and_batch_id", (index) =>
      index.eq("customerUserId", customerUserId).eq("batchId", batchId),
    )
    .take(50);
  return invoices.find((invoice) => invoice.status !== "void") || null;
}

async function invoiceLinesForCustomerBatch(
  ctx: MutationCtx | QueryCtx,
  customerUserId: Id<"appUsers">,
  batchId: Id<"batches">,
): Promise<{ lines: BatchInvoiceLine[]; total: number; orderIds: Id<"orders">[] }> {
  const assignments = await ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_batch", (index) => index.eq("batchId", batchId))
    .take(MAX_BATCH_INVOICE_ITEMS);
  // ponytail: bounded batch invoice scan; materialize per-batch counters if a roster exceeds 2,000 assignments.
  const lines: BatchInvoiceLine[] = [];
  const orderIds = new Set<Id<"orders">>();
  const seenItems = new Set<Id<"orderItems">>();
  let total = 0;
  for (const assignment of assignments) {
    const item = await ctx.db.get(assignment.orderItemId);
    const order = item ? await ctx.db.get(item.orderId) : null;
    if (!item || !order || order.customerUserId !== customerUserId || order.status === "cancelled") continue;
    if (seenItems.has(item._id)) continue;
    const eligibility = await batchInvoiceEligibility(ctx, item, order, batchId, assignment.assignedQuantity);
    if (!eligibility.eligible) fail("INVOICE_INVALID_STATE", eligibility.reason);
    const subtotal = item.unitPriceAmountSnapshot * assignment.assignedQuantity;
    if (!Number.isSafeInteger(subtotal)) fail("INVOICE_TOTAL_INVALID");
    lines.push({ item, order, quantity: assignment.assignedQuantity, subtotal });
    seenItems.add(item._id);
    orderIds.add(order._id);
    total += subtotal;
    if (!Number.isSafeInteger(total)) fail("INVOICE_TOTAL_INVALID");
  }
  if (!lines.length) fail("INVOICE_TOTAL_INVALID");
  return { lines, total, orderIds: [...orderIds] };
}

async function batchInvoiceEligibility(
  ctx: DataCtx,
  item: Doc<"orderItems">,
  order: Doc<"orders">,
  batchId: Id<"batches">,
  quantity: number,
): Promise<BatchInvoiceEligibility> {
  if (order.status !== "submitted") return { eligible: false, reason: "order is not ready for invoicing" };
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > item.quantity ||
    !Number.isSafeInteger(item.quantity) ||
    item.quantity < 1 ||
    !Number.isSafeInteger(item.unitPriceAmountSnapshot) ||
    item.unitPriceAmountSnapshot < 0
  ) {
    return { eligible: false, reason: "batch item snapshot is invalid" };
  }
  if ((await exceptionsForOrderItem(ctx, item._id)).some(needsResolution)) {
    return { eligible: false, reason: "batch item has an unresolved exception" };
  }
  const links = await ctx.db
    .query("invoiceItems")
    .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
    .take(50);
  for (const link of links) {
    const invoice = await ctx.db.get(link.invoiceId);
    if (invoice && invoice.status !== "void" && !invoice.batchId) {
      return { eligible: false, reason: "batch item already belongs to a legacy invoice" };
    }
    if (invoice && invoice.status !== "void" && invoice.batchId === batchId) {
      return { eligible: false, reason: "batch item already belongs to this invoice" };
    }
  }
  return { eligible: true };
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

async function applyExistingExceptionAdjustments(
  ctx: MutationCtx,
  invoice: Doc<"invoices">,
  orderIds: Id<"orders">[] = [invoice.orderId],
) {
  const adjustments = (
    await Promise.all(
      orderIds.map((orderId) =>
        ctx.db
          .query("orderExceptionFinancialAdjustments")
          .withIndex("by_order", (index) => index.eq("orderId", orderId))
          .take(200),
      ),
    )
  ).flat();
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
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    const batchIds = new Set<Id<"batches">>();
    for (const item of orderItems) {
      const assignments = await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
        .take(200);
      for (const assignment of assignments) batchIds.add(assignment.batchId);
    }
    if (batchIds.size === 1) {
      return createCustomerBatchDraft(ctx, user, {
        customerUserId: order.customerUserId,
        batchId: [...batchIds][0],
        depositRequirementMode: args.depositRequirementMode,
        depositRequirementValue: args.depositRequirementValue,
      });
    }
    if (batchIds.size > 1) fail("INVOICE_INVALID_STATE", "select one Batch before issuing a split order");
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
    const invoiceNumber = await nextInvoiceNumber(ctx, now);
    const invoiceId = await ctx.db.insert("invoices", {
      orderId: order._id,
      customerUserId: order.customerUserId,
      invoiceNumber,
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

async function createCustomerBatchDraft(
  ctx: MutationCtx,
  user: Doc<"appUsers">,
  args: {
    customerUserId: Id<"appUsers">;
    batchId: Id<"batches">;
    depositRequirementMode: "none" | "fixed" | "percentage";
    depositRequirementValue?: number;
  },
) {
  const customer = await ctx.db.get(args.customerUserId);
  if (!customer || customer.status !== "active" || customer.role !== "customer") fail("CUSTOMER_REQUIRED");
  const existing = await activeInvoiceForCustomerBatch(ctx, args.customerUserId, args.batchId);
  if (existing) fail("INVOICE_ALREADY_EXISTS");
  const snapshot = await invoiceLinesForCustomerBatch(ctx, args.customerUserId, args.batchId);
  const requirementValue = args.depositRequirementMode === "none" ? undefined : args.depositRequirementValue;
  const depositRequiredAmount = requiredAmount(snapshot.total, args.depositRequirementMode, requirementValue);
  const now = Date.now();
  const invoiceNumber = await nextInvoiceNumber(ctx, now);
  const representative = snapshot.lines[0].order;
  const invoiceId = await ctx.db.insert("invoices", {
    orderId: representative._id,
    customerUserId: args.customerUserId,
    batchId: args.batchId,
    invoiceNumber,
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
  for (const line of snapshot.lines) {
    await ctx.db.insert("invoiceItems", {
      invoiceId,
      orderItemId: line.item._id,
      descriptionSnapshot: `${line.item.bookTitleSnapshot} · ${line.item.formatSnapshot} · ${line.item.isbnSnapshot}`,
      bookTitleSnapshot: line.item.bookTitleSnapshot,
      publisherNameSnapshot: line.item.publisherNameSnapshot,
      formatSnapshot: line.item.formatSnapshot,
      isbnSnapshot: line.item.isbnSnapshot,
      quantity: line.quantity,
      unitPriceAmountSnapshot: line.item.unitPriceAmountSnapshot,
      subtotalAmount: line.subtotal,
      createdAt: now,
    });
  }
  const createdInvoice = await ctx.db.get(invoiceId);
  if (!createdInvoice) fail("INVOICE_NOT_FOUND");
  await applyExistingExceptionAdjustments(ctx, createdInvoice, snapshot.orderIds);
  await recordAudit(ctx, user._id, "invoice.created", "invoice", invoiceId, {
    customerUserId: String(args.customerUserId),
    batchId: String(args.batchId),
  });
  return invoiceView(ctx, invoiceId);
}

export const createForCustomerBatch = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    batchId: v.id("batches"),
    depositRequirementMode: depositRequirementModeValidator,
    depositRequirementValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.isArchived) fail("BATCH_NOT_FOUND");
    return createCustomerBatchDraft(ctx, user, args);
  },
});

async function issueInvoiceRecord(ctx: MutationCtx, user: Doc<"appUsers">, invoice: Doc<"invoices">) {
  const now = Date.now();
  await ctx.db.patch(invoice._id, { status: "issued", issuedAt: now, updatedAt: now });
  await notifyUser(ctx, invoice.customerUserId, {
    surface: "notification",
    eventType: "invoice.issued",
    title: "Tagihan baru diterbitkan",
    body: `Tagihan ${invoice.invoiceNumber} sudah tersedia.`,
    destination: `/account/invoices/${invoice._id}`,
    relatedEntityType: "invoice",
    relatedEntityId: String(invoice._id),
  });
  await recordAudit(ctx, user._id, "invoice.issued", "invoice", invoice._id);
  return invoiceView(ctx, invoice._id);
}

export const issue = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.status === "issued") fail("INVOICE_ALREADY_ISSUED");
    if (invoice.status === "void") fail("INVOICE_VOID");
    return issueInvoiceRecord(ctx, user, invoice);
  },
});

export const issueCustomerBatch = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    batchId: v.id("batches"),
    depositRequirementMode: depositRequirementModeValidator,
    depositRequirementValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.isArchived) fail("BATCH_NOT_FOUND");
    if (!batch.currentShipmentStage) fail("INVOICE_INVALID_STATE", "Batch belum final untuk invoice");
    const existing = await activeInvoiceForCustomerBatch(ctx, args.customerUserId, args.batchId);
    if (existing?.status === "issued") return invoiceView(ctx, existing._id);
    if (existing?.status === "draft") return issueInvoiceRecord(ctx, user, existing);
    const draft = await createCustomerBatchDraft(ctx, user, args);
    const invoice = await ctx.db.get(draft.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    return issueInvoiceRecord(ctx, user, invoice);
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

export const listReadyForIssuance = query({
  args: {
    paginationOpts: paginationOptsValidator,
    customerUserId: v.optional(v.id("appUsers")),
    batchId: v.optional(v.id("batches")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const selectedBatch = args.batchId ? await ctx.db.get(args.batchId) : null;
    const batchPage = args.batchId
      ? { page: selectedBatch ? [selectedBatch] : [], isDone: true, continueCursor: "" }
      : await ctx.db
          .query("batches")
          .withIndex("by_created_at")
          .order("desc")
          .paginate(args.paginationOpts);
    const rows = [];
    for (const batch of batchPage.page) {
      if (batch.isArchived || !batch.currentShipmentStage) continue;
      const assignments = await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", batch._id))
        .take(MAX_BATCH_INVOICE_ITEMS);
      const groups = new Map<
        Id<"appUsers">,
        {
          totalAmount: number;
          bookCount: number;
          orderIds: Set<Id<"orders">>;
          order: Doc<"orders">;
          eligible: boolean;
          eligibilityReason: string | null;
        }
      >();
      for (const assignment of assignments) {
        const item = await ctx.db.get(assignment.orderItemId);
        const order = item ? await ctx.db.get(item.orderId) : null;
        if (!item || !order || order.status === "cancelled") continue;
        if (args.customerUserId && order.customerUserId !== args.customerUserId) continue;
        const customer = await ctx.db.get(order.customerUserId);
        if (!customer || customer.status !== "active" || customer.role !== "customer") continue;
        const eligibility = await batchInvoiceEligibility(ctx, item, order, batch._id, assignment.assignedQuantity);
        const subtotal =
          Number.isSafeInteger(item.unitPriceAmountSnapshot) && Number.isSafeInteger(assignment.assignedQuantity)
            ? item.unitPriceAmountSnapshot * assignment.assignedQuantity
            : 0;
        const validSubtotal = Number.isSafeInteger(subtotal) && subtotal >= 0;
        const group = groups.get(order.customerUserId) || {
          totalAmount: 0,
          bookCount: 0,
          orderIds: new Set<Id<"orders">>(),
          order,
          eligible: true,
          eligibilityReason: null,
        };
        if (!eligibility.eligible || !validSubtotal) {
          group.eligible = false;
          group.eligibilityReason = eligibility.eligible ? "batch item snapshot is invalid" : eligibility.reason;
        }
        if (validSubtotal && assignment.assignedQuantity > 0) {
          group.totalAmount += subtotal;
          group.bookCount += assignment.assignedQuantity;
        }
        group.orderIds.add(order._id);
        groups.set(order.customerUserId, group);
      }
      for (const [customerUserId, group] of groups) {
        const existing = await activeInvoiceForCustomerBatch(ctx, customerUserId, batch._id);
        rows.push({
          customerUserId,
          customerName: group.order.customerName,
          customerMemberCode: (await ctx.db.get(customerUserId))?.memberCode ?? null,
          batchId: batch._id,
          batchName: batch.name,
          currentShipmentStage: batch.currentShipmentStage,
          bookCount: group.bookCount,
          orderCount: group.orderIds.size,
          totalAmount: group.totalAmount,
          invoiceId: existing?._id ?? null,
          invoiceStatus: existing?.status ?? null,
          eligible: !existing && group.eligible,
          eligibilityReason: existing ? "customer × batch invoice already exists" : group.eligibilityReason,
        });
      }
    }
    rows.sort(
      (left, right) =>
        left.customerName.localeCompare(right.customerName) || left.batchName.localeCompare(right.batchName),
    );
    return { ...batchPage, page: rows };
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

export const getByInvoiceNumberForAdmin = query({
  args: { invoiceNumber: v.string() },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const invoiceNumber = args.invoiceNumber.trim().toUpperCase();
    if (!invoiceNumber) return null;
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_invoice_number", (index) => index.eq("invoiceNumber", invoiceNumber))
      .first();
    return invoice ? invoiceView(ctx, invoice._id) : null;
  },
});

export const getForOrderAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    if (!(await ctx.db.get(args.orderId))) fail("ORDER_NOT_FOUND");
    const directInvoice = (
      await ctx.db
        .query("invoices")
        .withIndex("by_order", (index) => index.eq("orderId", args.orderId))
        .take(50)
    ).find((candidate) => candidate.status !== "void");
    const invoice =
      directInvoice ||
      (
        await Promise.all(
          (
            await ctx.db
              .query("orderItems")
              .withIndex("by_order", (index) => index.eq("orderId", args.orderId))
              .take(200)
          ).map(async (item) => {
            const links = await ctx.db
              .query("invoiceItems")
              .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
              .take(50);
            return Promise.all(links.map((link) => ctx.db.get(link.invoiceId)));
          }),
        )
      )
        .flat()
        .find((candidate): candidate is Doc<"invoices"> => Boolean(candidate && candidate.status !== "void"));
    return invoice ? invoiceView(ctx, invoice._id) : null;
  },
});

export const previewLegacyReferences = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.manage");
    const limit = backfillLimit(args.limit);
    const invoices = await ctx.db.query("invoices").withIndex("by_created_at").order("asc").take(MAX_BACKFILL_SCAN);
    const canonical = invoices.filter((invoice) => isCanonicalInvoiceNumber(invoice.invoiceNumber));
    const legacyInvoices = invoices.filter((invoice) => legacyInvoiceNumber(invoice.invoiceNumber));
    const legacy = legacyInvoices.slice(0, limit);
    const counters = new Map<string, number>();
    const used = new Set(canonical.map((invoice) => invoice.invoiceNumber));
    const existingCounters = await ctx.db.query("invoiceReferenceCounters").take(MAX_BACKFILL_SCAN);
    for (const counter of existingCounters) counters.set(counter.datePart, counter.nextNumber);
    let collisions = 0;
    const planned = legacy.map((invoice) => {
      const datePart = invoiceDatePart(invoice.createdAt);
      let sequence = counters.get(datePart) || 1;
      let reference = invoiceNumberForSequence(datePart, sequence);
      while (used.has(reference)) {
        collisions += 1;
        sequence += 1;
        reference = invoiceNumberForSequence(datePart, sequence);
      }
      counters.set(datePart, sequence + 1);
      used.add(reference);
      return { invoiceId: invoice._id, oldReference: invoice.invoiceNumber, newReference: reference };
    });
    return {
      scanned: invoices.length,
      canonicalCount: canonical.length,
      legacyCount: legacyInvoices.length,
      collisions,
      hasMore: legacyInvoices.length > legacy.length,
      planned,
    };
  },
});

export const backfillLegacyReferences = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const limit = backfillLimit(args.limit);
    const invoices = await ctx.db.query("invoices").withIndex("by_created_at").order("asc").take(MAX_BACKFILL_SCAN);
    const legacyInvoices = invoices.filter((invoice) => legacyInvoiceNumber(invoice.invoiceNumber));
    const legacy = legacyInvoices.slice(0, limit);
    let updated = 0;
    for (const invoice of legacy) {
      const invoiceNumber = await nextInvoiceNumber(ctx, invoice.createdAt);
      await ctx.db.patch(invoice._id, { invoiceNumber });
      await recordAudit(ctx, user._id, "invoice.reference_backfilled", "invoice", invoice._id, {
        oldReference: invoice.invoiceNumber,
        invoiceNumber,
      });
      updated += 1;
    }
    return {
      updated,
      scanned: invoices.length,
      legacyCount: legacyInvoices.length,
      hasMore: legacyInvoices.length > legacy.length,
    };
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
