import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { applyLedgerDeltas, findDepositAccount } from "./depositAccounts";
import { appendDepositTransaction } from "./depositTransactions";
import { requireActiveUser, requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { ledgerDeltas } from "./lib/depositLedger";
import { fail } from "./lib/errors";
import { refundObligationLifecycleValidator } from "./validators";

type DataCtx = QueryCtx | MutationCtx;
type RefundReason = "cancellation" | "defect" | "deposit_refund";

function amount(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) fail("REFUND_AMOUNT_INVALID");
  return value;
}

function text(value: string | undefined, field: string, max = 500): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized;
}

function lifecycle(amountDue: number, paidAmount: number): "pending" | "partially_paid" | "paid" {
  return paidAmount >= amountDue ? "paid" : paidAmount > 0 ? "partially_paid" : "pending";
}

async function payoutViews(ctx: DataCtx, obligationId: Id<"refundObligations">, includeInternal: boolean) {
  const payouts = await ctx.db
    .query("refundPayouts")
    .withIndex("by_obligation", (index) => index.eq("refundObligationId", obligationId))
    .order("asc")
    .take(100);
  return payouts.map((payout) => ({
    payoutId: payout._id,
    amount: payout.amount,
    status: payout.status,
    paymentMethod: includeInternal ? (payout.paymentMethod ?? null) : null,
    referenceNote: includeInternal ? (payout.referenceNote ?? null) : null,
    failureReason: includeInternal ? (payout.failureReason ?? null) : null,
    createdAt: new Date(payout.createdAt).toISOString(),
    startedAt: payout.startedAt ? new Date(payout.startedAt).toISOString() : null,
    processedAt: payout.processedAt ? new Date(payout.processedAt).toISOString() : null,
  }));
}

async function obligationView(ctx: DataCtx, obligation: Doc<"refundObligations">, includeInternal: boolean) {
  return {
    obligationId: obligation._id,
    customerUserId: obligation.customerUserId,
    orderId: obligation.orderId ?? null,
    invoiceId: obligation.invoiceId ?? null,
    exceptionId: obligation.exceptionId ?? null,
    reason: obligation.reason,
    amount: obligation.amount,
    paidAmount: obligation.paidAmount,
    remainingAmount: Math.max(0, obligation.amount - obligation.paidAmount),
    reservedPayoutAmount: obligation.reservedAmount,
    availablePayoutAmount: Math.max(0, obligation.amount - obligation.paidAmount - obligation.reservedAmount),
    status: obligation.status,
    note: includeInternal ? (obligation.note ?? null) : null,
    createdAt: new Date(obligation.createdAt).toISOString(),
    updatedAt: new Date(obligation.updatedAt).toISOString(),
    payouts: await payoutViews(ctx, obligation._id, includeInternal),
  };
}

async function syncObligation(ctx: MutationCtx, obligation: Doc<"refundObligations">) {
  const now = Date.now();
  const status = lifecycle(obligation.amount, obligation.paidAmount);
  await ctx.db.patch(obligation._id, { status, updatedAt: now });
  if (obligation.invoiceId) {
    const invoice = await ctx.db.get(obligation.invoiceId);
    if (invoice) {
      const obligations = await ctx.db
        .query("refundObligations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
        .take(100);
      const remaining = obligations.reduce((total, row) => total + Math.max(0, row.amount - row.paidAmount), 0);
      await ctx.db.patch(invoice._id, {
        refundObligationAmount: remaining,
        refundObligationStatus: remaining > 0 ? "refund_due" : "settled",
        updatedAt: now,
      });
    }
  }
  if (obligation.sourceAdjustmentId) {
    await ctx.db.patch(obligation.sourceAdjustmentId, {
      refundObligationStatus: status === "paid" ? "settled" : "refund_due",
    });
  }
  const updated = await ctx.db.get(obligation._id);
  if (!updated) fail("REFUND_OBLIGATION_NOT_FOUND");
  return updated;
}

export async function createRefundObligationInternal(
  ctx: MutationCtx,
  input: {
    customerUserId: Id<"appUsers">;
    orderId?: Id<"orders">;
    invoiceId?: Id<"invoices">;
    exceptionId?: Id<"orderExceptions">;
    sourceAdjustmentId?: Id<"orderExceptionFinancialAdjustments">;
    depositAccountId?: Id<"depositAccounts">;
    reason: RefundReason;
    amount: number;
    note?: string;
    createdByUserId: Id<"appUsers">;
  },
) {
  const refundAmount = amount(input.amount);
  const now = Date.now();
  const obligationId = await ctx.db.insert("refundObligations", {
    customerUserId: input.customerUserId,
    orderId: input.orderId,
    invoiceId: input.invoiceId,
    exceptionId: input.exceptionId,
    sourceAdjustmentId: input.sourceAdjustmentId,
    depositAccountId: input.depositAccountId,
    reason: input.reason,
    amount: refundAmount,
    paidAmount: 0,
    reservedAmount: 0,
    status: "pending",
    note: input.note,
    createdAt: now,
    updatedAt: now,
    createdByUserId: input.createdByUserId,
  });
  const obligation = await ctx.db.get(obligationId);
  if (!obligation) fail("REFUND_OBLIGATION_NOT_FOUND");
  await syncObligation(ctx, obligation);
  await recordAudit(ctx, input.createdByUserId, "refund.obligation_created", "refundObligation", obligationId, {
    amount: String(refundAmount),
    reason: input.reason,
  });
  return obligationId;
}

async function requestDepositRefundForUser(
  ctx: MutationCtx,
  customerUserId: Id<"appUsers">,
  actorUserId: Id<"appUsers">,
  requestedAmount: number,
  note?: string,
) {
  const account = await findDepositAccount(ctx, customerUserId);
  const refundAmount = amount(requestedAmount);
  if (!account || account.availableAmount < refundAmount) fail("DEPOSIT_BALANCE_INSUFFICIENT");
  const obligationId = await createRefundObligationInternal(ctx, {
    customerUserId,
    depositAccountId: account._id,
    reason: "deposit_refund",
    amount: refundAmount,
    note: text(note, "deposit refund note"),
    createdByUserId: actorUserId,
  });
  await recordAudit(ctx, actorUserId, "deposit_refund.requested", "refundObligation", obligationId, {
    amount: String(refundAmount),
  });
  const obligation = await ctx.db.get(obligationId);
  if (!obligation) fail("REFUND_OBLIGATION_NOT_FOUND");
  return obligationView(ctx, obligation, actorUserId !== customerUserId);
}

export const requestDepositRefund = mutation({
  args: { amount: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    if (user.role !== "customer") fail("CUSTOMER_REQUIRED");
    return requestDepositRefundForUser(ctx, user._id, user._id, args.amount, args.note);
  },
});

export const requestDepositRefundForAdmin = mutation({
  args: { customerUserId: v.id("appUsers"), amount: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "deposits.manage");
    const customer = await ctx.db.get(args.customerUserId);
    if (!customer || customer.role !== "customer" || customer.status !== "active") fail("CUSTOMER_REQUIRED");
    return requestDepositRefundForUser(ctx, customer._id, admin._id, args.amount, args.note);
  },
});

async function getObligation(ctx: MutationCtx | QueryCtx, obligationId: Id<"refundObligations">) {
  const obligation = await ctx.db.get(obligationId);
  if (!obligation) fail("REFUND_OBLIGATION_NOT_FOUND");
  return obligation;
}

export const createPayout = mutation({
  args: {
    obligationId: v.id("refundObligations"),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    referenceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "refunds.manage");
    const obligation = await getObligation(ctx, args.obligationId);
    const payoutAmount = amount(args.amount);
    const available = obligation.amount - obligation.paidAmount - obligation.reservedAmount;
    if (obligation.status === "paid") fail("REFUND_OBLIGATION_INVALID_STATE");
    if (payoutAmount > available) fail("REFUND_PAYOUT_EXCEEDS_OBLIGATION");
    const now = Date.now();
    let reservationTransactionId: Id<"depositTransactions"> | undefined;
    if (obligation.depositAccountId) {
      const account = await ctx.db.get(obligation.depositAccountId);
      if (!account || account.userId !== obligation.customerUserId) fail("DEPOSIT_CUSTOMER_MISMATCH");
      const deltas = ledgerDeltas("reservation", payoutAmount);
      await applyLedgerDeltas(ctx, account, deltas);
      reservationTransactionId = await appendDepositTransaction(ctx, {
        accountId: account._id,
        type: "reservation",
        amount: payoutAmount,
        ...deltas,
        refundObligationId: obligation._id,
        note: "deposit refund payout hold",
        createdAt: now,
        createdByUserId: admin._id,
      });
    }
    const payoutId = await ctx.db.insert("refundPayouts", {
      refundObligationId: obligation._id,
      customerUserId: obligation.customerUserId,
      reservationTransactionId,
      amount: payoutAmount,
      paymentMethod: text(args.paymentMethod, "payment method", 120),
      referenceNote: text(args.referenceNote, "reference note"),
      status: "pending",
      createdAt: now,
      updatedAt: now,
      createdByUserId: admin._id,
    });
    await ctx.db.patch(obligation._id, { reservedAmount: obligation.reservedAmount + payoutAmount, updatedAt: now });
    await recordAudit(ctx, admin._id, "refund.payout_created", "refundPayout", payoutId, {
      obligationId: String(obligation._id),
      amount: String(payoutAmount),
    });
    const updated = await ctx.db.get(obligation._id);
    if (!updated) fail("REFUND_OBLIGATION_NOT_FOUND");
    return obligationView(ctx, updated, true);
  },
});

export const startPayout = mutation({
  args: {
    payoutId: v.id("refundPayouts"),
    paymentMethod: v.optional(v.string()),
    referenceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "refunds.manage");
    const payout = await ctx.db.get(args.payoutId);
    if (!payout) fail("REFUND_PAYOUT_NOT_FOUND");
    if (payout.status !== "pending") fail("REFUND_PAYOUT_INVALID_STATE");
    const paymentMethod = text(args.paymentMethod, "payment method", 120) || payout.paymentMethod;
    if (!paymentMethod) fail("REFUND_PAYMENT_METHOD_REQUIRED");
    const now = Date.now();
    await ctx.db.patch(payout._id, {
      status: "processing",
      paymentMethod,
      referenceNote: text(args.referenceNote, "reference note") || payout.referenceNote,
      startedAt: now,
      updatedAt: now,
    });
    await recordAudit(ctx, admin._id, "refund.payout_processing", "refundPayout", payout._id);
    const obligation = await getObligation(ctx, payout.refundObligationId);
    return obligationView(ctx, obligation, true);
  },
});

async function settleDepositHold(
  ctx: MutationCtx,
  obligation: Doc<"refundObligations">,
  payout: Doc<"refundPayouts">,
  actorUserId: Id<"appUsers">,
  paid: boolean,
) {
  if (!obligation.depositAccountId) return;
  if (!payout.reservationTransactionId) fail("REFUND_OBLIGATION_INVALID_STATE");
  const account = await ctx.db.get(obligation.depositAccountId);
  const reservation = await ctx.db.get(payout.reservationTransactionId);
  if (!account || !reservation || reservation.type !== "reservation") fail("DEPOSIT_TRANSACTION_NOT_FOUND");
  const releaseDeltas = ledgerDeltas("release", payout.amount);
  let current = await applyLedgerDeltas(ctx, account, releaseDeltas);
  await appendDepositTransaction(ctx, {
    accountId: account._id,
    type: "release",
    amount: payout.amount,
    ...releaseDeltas,
    refundObligationId: obligation._id,
    referenceTransactionId: reservation._id,
    note: paid ? "deposit refund payout released" : "failed deposit refund payout released",
    createdAt: Date.now(),
    createdByUserId: actorUserId,
  });
  if (paid) {
    const debitDeltas = ledgerDeltas("debit", payout.amount);
    current = await applyLedgerDeltas(ctx, current, debitDeltas);
    await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: "debit",
      amount: payout.amount,
      ...debitDeltas,
      refundObligationId: obligation._id,
      referenceTransactionId: reservation._id,
      note: "deposit refund payout",
      createdAt: Date.now(),
      createdByUserId: actorUserId,
    });
  }
  return current;
}

export const recordPayout = mutation({
  args: {
    payoutId: v.id("refundPayouts"),
    status: v.union(v.literal("paid"), v.literal("failed")),
    failureReason: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    referenceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "refunds.manage");
    const payout = await ctx.db.get(args.payoutId);
    if (!payout) fail("REFUND_PAYOUT_NOT_FOUND");
    if (payout.status !== "processing") fail("REFUND_PAYOUT_INVALID_STATE");
    const obligation = await getObligation(ctx, payout.refundObligationId);
    const now = Date.now();
    if (args.status === "failed") {
      const failureReason = text(args.failureReason, "failure reason");
      if (!failureReason) fail("REFUND_FAILURE_REASON_REQUIRED");
      await settleDepositHold(ctx, obligation, payout, admin._id, false);
      await ctx.db.patch(payout._id, {
        status: "failed",
        failureReason,
        processedAt: now,
        processedByUserId: admin._id,
        updatedAt: now,
      });
      await ctx.db.patch(obligation._id, { reservedAmount: obligation.reservedAmount - payout.amount, updatedAt: now });
      await recordAudit(ctx, admin._id, "refund.payout_failed", "refundPayout", payout._id);
    } else {
      const paymentMethod = text(args.paymentMethod, "payment method", 120) || payout.paymentMethod;
      if (!paymentMethod) fail("REFUND_PAYMENT_METHOD_REQUIRED");
      await settleDepositHold(ctx, obligation, payout, admin._id, true);
      await ctx.db.patch(payout._id, {
        status: "paid",
        paymentMethod,
        referenceNote: text(args.referenceNote, "reference note") || payout.referenceNote,
        processedAt: now,
        processedByUserId: admin._id,
        updatedAt: now,
      });
      await ctx.db.patch(obligation._id, {
        paidAmount: obligation.paidAmount + payout.amount,
        reservedAmount: obligation.reservedAmount - payout.amount,
        updatedAt: now,
      });
      await recordAudit(ctx, admin._id, "refund.payout_paid", "refundPayout", payout._id, {
        amount: String(payout.amount),
      });
    }
    const updated = await syncObligation(ctx, await getObligation(ctx, obligation._id));
    return obligationView(ctx, updated, true);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "refunds.read.own");
    const obligations = await ctx.db
      .query("refundObligations")
      .withIndex("by_customer_user_id_and_created_at", (index) => index.eq("customerUserId", user._id))
      .order("desc")
      .take(100);
    return Promise.all(obligations.map((obligation) => obligationView(ctx, obligation, false)));
  },
});

export const listForAdmin = query({
  args: { status: v.optional(refundObligationLifecycleValidator) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "refunds.read.all");
    const obligations = args.status
      ? await ctx.db
          .query("refundObligations")
          .withIndex("by_status_and_created_at", (index) => index.eq("status", args.status!))
          .order("desc")
          .take(100)
      : await ctx.db.query("refundObligations").withIndex("by_status_and_created_at").order("desc").take(100);
    return Promise.all(obligations.map((obligation) => obligationView(ctx, obligation, true)));
  },
});

export const getMine = query({
  args: { obligationId: v.id("refundObligations") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "refunds.read.own");
    const obligation = await getObligation(ctx, args.obligationId);
    await requireOwnedResource(ctx, obligation.customerUserId, "DEPOSIT_ACCESS_DENIED");
    return obligationView(ctx, obligation, false);
  },
});

export const getForAdmin = query({
  args: { obligationId: v.id("refundObligations") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "refunds.read.all");
    return obligationView(ctx, await getObligation(ctx, args.obligationId), true);
  },
});
