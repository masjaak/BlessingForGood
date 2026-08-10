import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { invoicePaymentStatus, outstandingAmount } from "./lib/invoiceCalculations";
import { paymentConfirmationStatusValidator } from "./validators";

type DataCtx = QueryCtx | MutationCtx;
type PaymentConfirmationStatus = "submitted" | "under_review" | "approved" | "rejected";

const pendingStatuses = new Set<PaymentConfirmationStatus>(["submitted", "under_review"]);

function requiredText(value: string, field: string, max: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized;
}

function optionalText(value: string | undefined, field: string, max: number): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized || undefined;
}

function validateAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) fail("PAYMENT_AMOUNT_INVALID");
}

function validatePaidAt(paidAt: number): void {
  if (!Number.isSafeInteger(paidAt) || paidAt <= 0) fail("VALIDATION_FAILED", "paidAt is invalid");
}

function reviewable(confirmation: Doc<"paymentConfirmations">): void {
  if (!pendingStatuses.has(confirmation.status)) fail("PAYMENT_CONFIRMATION_INVALID_STATE");
}

function eligibleInvoice(invoice: Doc<"invoices">): void {
  if (invoice.status !== "issued") fail("PAYMENT_INVOICE_NOT_ELIGIBLE");
  if (invoice.outstandingAmount <= 0) fail("PAYMENT_CONFIRMATION_EXCEEDS_OUTSTANDING");
}

export async function hasPendingPaymentConfirmation(ctx: DataCtx, invoiceId: Id<"invoices">): Promise<boolean> {
  const confirmations = await ctx.db
    .query("paymentConfirmations")
    .withIndex("by_invoice", (index) => index.eq("invoiceId", invoiceId))
    .take(200);
  return confirmations.some((confirmation) => pendingStatuses.has(confirmation.status));
}

async function confirmationView(ctx: DataCtx, confirmation: Doc<"paymentConfirmations">, includeReviewer: boolean) {
  const invoice = await ctx.db.get(confirmation.invoiceId);
  const order = invoice ? await ctx.db.get(invoice.orderId) : null;
  return {
    confirmationId: confirmation._id,
    invoiceId: confirmation.invoiceId,
    amount: confirmation.amount,
    paymentMethod: confirmation.paymentMethod,
    transferReference: confirmation.transferReference ?? null,
    paidAt: new Date(confirmation.paidAt).toISOString(),
    proofReference: confirmation.proofReference ?? null,
    customerNote: confirmation.customerNote ?? null,
    status: confirmation.status,
    submittedAt: new Date(confirmation.submittedAt).toISOString(),
    reviewedAt: confirmation.reviewedAt ? new Date(confirmation.reviewedAt).toISOString() : null,
    reviewedByUserId: includeReviewer ? (confirmation.reviewedByUserId ?? null) : null,
    reviewNote: confirmation.reviewNote ?? null,
    rejectionReason: confirmation.rejectionReason ?? null,
    createdAt: new Date(confirmation.createdAt).toISOString(),
    updatedAt: new Date(confirmation.updatedAt).toISOString(),
    invoice: invoice
      ? {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          orderId: invoice.orderId,
          customerName: order?.customerName ?? "Unknown customer",
          customerEmail: order?.customerEmail ?? null,
          status: invoice.status,
          paymentStatus: invoice.paymentStatus,
          totalAmount: invoice.totalAmount,
          allocatedDepositAmount: invoice.allocatedDepositAmount,
          verifiedPaymentAmount: invoice.verifiedPaymentAmount,
          outstandingAmount: invoice.outstandingAmount,
        }
      : null,
  };
}

async function currentPaymentStatus(ctx: DataCtx, invoice: Doc<"invoices">) {
  return invoicePaymentStatus(
    invoice.totalAmount,
    invoice.allocatedDepositAmount,
    invoice.verifiedPaymentAmount,
    await hasPendingPaymentConfirmation(ctx, invoice._id),
  );
}

export const submit = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    paymentMethod: v.string(),
    transferReference: v.optional(v.string()),
    paidAt: v.number(),
    proofReference: v.optional(v.string()),
    customerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.read.own");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.customerUserId !== user._id) fail("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    eligibleInvoice(invoice);
    validateAmount(args.amount);
    validatePaidAt(args.paidAt);
    if (args.amount > invoice.outstandingAmount) fail("PAYMENT_CONFIRMATION_EXCEEDS_OUTSTANDING");
    const existing = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
      .take(200);
    if (existing.some((confirmation) => pendingStatuses.has(confirmation.status))) {
      fail("PAYMENT_CONFIRMATION_DUPLICATE_PENDING");
    }
    const now = Date.now();
    const confirmationId = await ctx.db.insert("paymentConfirmations", {
      invoiceId: invoice._id,
      customerUserId: user._id,
      amount: args.amount,
      paymentMethod: requiredText(args.paymentMethod, "payment method", 60),
      transferReference: optionalText(args.transferReference, "transfer reference", 160),
      paidAt: args.paidAt,
      proofReference: optionalText(args.proofReference, "proof reference", 500),
      customerNote: optionalText(args.customerNote, "customer note", 500),
      status: "submitted",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(invoice._id, { paymentStatus: "payment_submitted", updatedAt: now });
    await recordAudit(ctx, user._id, "payment_confirmation.submitted", "payment_confirmation", confirmationId, {
      invoiceId: invoice._id,
      amount: String(args.amount),
    });
    const confirmation = await ctx.db.get(confirmationId);
    if (!confirmation) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    return confirmationView(ctx, confirmation, false);
  },
});

export const startReview = mutation({
  args: { confirmationId: v.id("paymentConfirmations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const confirmation = await ctx.db.get(args.confirmationId);
    if (!confirmation) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    reviewable(confirmation);
    const now = Date.now();
    await ctx.db.patch(confirmation._id, { status: "under_review", updatedAt: now });
    await recordAudit(ctx, user._id, "payment_confirmation.review_started", "payment_confirmation", confirmation._id);
    const updated = await ctx.db.get(confirmation._id);
    if (!updated) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    return confirmationView(ctx, updated, true);
  },
});

export const approve = mutation({
  args: {
    confirmationId: v.id("paymentConfirmations"),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const confirmation = await ctx.db.get(args.confirmationId);
    if (!confirmation) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    reviewable(confirmation);
    const invoice = await ctx.db.get(confirmation.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    eligibleInvoice(invoice);
    if (confirmation.amount > invoice.outstandingAmount) {
      fail("PAYMENT_CONFIRMATION_EXCEEDS_OUTSTANDING");
    }
    const verifiedPaymentAmount = invoice.verifiedPaymentAmount + confirmation.amount;
    let outstanding: number;
    try {
      outstanding = outstandingAmount(invoice.totalAmount, invoice.allocatedDepositAmount, verifiedPaymentAmount);
    } catch {
      fail("PAYMENT_AMOUNT_INVALID");
    }
    const reviewNote = optionalText(args.reviewNote, "review note", 500);
    const now = Date.now();
    await ctx.db.patch(confirmation._id, {
      status: "approved",
      reviewedAt: now,
      reviewedByUserId: user._id,
      reviewNote,
      updatedAt: now,
    });
    await ctx.db.patch(invoice._id, {
      verifiedPaymentAmount,
      outstandingAmount: outstanding,
      paymentStatus: await currentPaymentStatus(ctx, {
        ...invoice,
        verifiedPaymentAmount,
        outstandingAmount: outstanding,
      }),
      updatedAt: now,
    });
    await recordAudit(ctx, user._id, "payment_confirmation.approved", "payment_confirmation", confirmation._id, {
      invoiceId: invoice._id,
      amount: String(confirmation.amount),
    });
    const updated = await ctx.db.get(confirmation._id);
    if (!updated) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    return confirmationView(ctx, updated, true);
  },
});

export const reject = mutation({
  args: {
    confirmationId: v.id("paymentConfirmations"),
    rejectionReason: v.string(),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.manage");
    const confirmation = await ctx.db.get(args.confirmationId);
    if (!confirmation) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    reviewable(confirmation);
    const invoice = await ctx.db.get(confirmation.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    const rejectionReason = args.rejectionReason.trim();
    if (!rejectionReason || rejectionReason.length > 500) {
      fail("PAYMENT_REJECTION_REASON_REQUIRED");
    }
    const reviewNote = optionalText(args.reviewNote, "review note", 500);
    const now = Date.now();
    await ctx.db.patch(confirmation._id, {
      status: "rejected",
      reviewedAt: now,
      reviewedByUserId: user._id,
      reviewNote,
      rejectionReason,
      updatedAt: now,
    });
    await ctx.db.patch(invoice._id, {
      paymentStatus: await currentPaymentStatus(ctx, invoice),
      updatedAt: now,
    });
    await recordAudit(ctx, user._id, "payment_confirmation.rejected", "payment_confirmation", confirmation._id, {
      invoiceId: invoice._id,
    });
    const updated = await ctx.db.get(confirmation._id);
    if (!updated) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    return confirmationView(ctx, updated, true);
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.read.own");
    const page = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_customer_user_id_and_created_at", (index) => index.eq("customerUserId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(page.page.map((confirmation) => confirmationView(ctx, confirmation, false))),
    };
  },
});

export const listMineForInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.read.own");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.customerUserId !== user._id) fail("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    const confirmations = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", args.invoiceId))
      .order("desc")
      .take(100);
    return Promise.all(confirmations.map((confirmation) => confirmationView(ctx, confirmation, false)));
  },
});

export const getMine = query({
  args: { confirmationId: v.id("paymentConfirmations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "invoices.read.own");
    const confirmation = await ctx.db.get(args.confirmationId);
    if (!confirmation) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    if (confirmation.customerUserId !== user._id) fail("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    return confirmationView(ctx, confirmation, false);
  },
});

export const listPendingForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "invoices.read.all");
    const submitted = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_status_and_created_at", (index) => index.eq("status", "submitted"))
      .order("desc")
      .take(100);
    const underReview = await ctx.db
      .query("paymentConfirmations")
      .withIndex("by_status_and_created_at", (index) => index.eq("status", "under_review"))
      .order("desc")
      .take(100);
    return Promise.all(
      [...submitted, ...underReview]
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 100)
        .map((confirmation) => confirmationView(ctx, confirmation, true)),
    );
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(paymentConfirmationStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const base = args.status
      ? ctx.db
          .query("paymentConfirmations")
          .withIndex("by_status_and_created_at", (index) => index.eq("status", args.status!))
      : ctx.db.query("paymentConfirmations").withIndex("by_created_at");
    const page = await base.order("desc").paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(page.page.map((confirmation) => confirmationView(ctx, confirmation, true))),
    };
  },
});

export const getForAdmin = query({
  args: { confirmationId: v.id("paymentConfirmations") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const confirmation = await ctx.db.get(args.confirmationId);
    if (!confirmation) fail("PAYMENT_CONFIRMATION_NOT_FOUND");
    return confirmationView(ctx, confirmation, true);
  },
});
