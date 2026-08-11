import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { accountView, applyLedgerDeltas, findDepositAccount } from "./depositAccounts";
import { appendDepositTransaction, transactionView } from "./depositTransactions";
import { requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { invoiceProjection } from "./lib/invoiceProjection";
import { fail } from "./lib/errors";
import { inverseLedgerDeltas, ledgerDeltas } from "./lib/depositLedger";

type DataCtx = QueryCtx | MutationCtx;

function invoiceView(invoice: Doc<"invoices">) {
  return {
    invoiceId: invoice._id,
    orderId: invoice.orderId,
    status: invoice.status,
    totalAmount: invoice.totalAmount,
    allocatedDepositAmount: invoice.allocatedDepositAmount,
    verifiedPaymentAmount: invoice.verifiedPaymentAmount,
    outstandingAmount: invoice.outstandingAmount,
    paymentStatus: invoice.paymentStatus,
  };
}

function allocationView(allocation: Doc<"invoiceDepositAllocations">) {
  return {
    allocationId: allocation._id,
    invoiceId: allocation.invoiceId,
    amount: allocation.amount,
    status: allocation.status,
    reservationTransactionId: allocation.reservationTransactionId,
    createdAt: new Date(allocation.createdAt).toISOString(),
    releasedAt: allocation.releasedAt ? new Date(allocation.releasedAt).toISOString() : null,
    releasedByTransactionId: allocation.releasedByTransactionId ?? null,
  };
}

async function fullView(ctx: DataCtx, allocation: Doc<"invoiceDepositAllocations">, includeInternal: boolean) {
  const invoice = await ctx.db.get(allocation.invoiceId);
  const transaction = await ctx.db.get(allocation.reservationTransactionId);
  return {
    ...allocationView(allocation),
    invoice: invoice ? invoiceView(invoice) : null,
    reservation: transaction ? transactionView(transaction, includeInternal) : null,
  };
}

async function updatedInvoiceAmounts(ctx: MutationCtx, invoice: Doc<"invoices">, allocatedDelta: number) {
  try {
    return await invoiceProjection(ctx, invoice, {
      allocatedDepositAmount: invoice.allocatedDepositAmount + allocatedDelta,
    });
  } catch {
    fail("DEPOSIT_ALLOCATION_INVALID");
  }
}

async function invoiceAndAccount(ctx: MutationCtx, invoiceId: Id<"invoices">) {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) fail("INVOICE_NOT_FOUND");
  if (invoice.status === "void") fail("INVOICE_VOID");
  const account = await findDepositAccount(ctx, invoice.customerUserId);
  if (!account) fail("DEPOSIT_ACCOUNT_NOT_FOUND");
  if (account.userId !== invoice.customerUserId) fail("DEPOSIT_CUSTOMER_MISMATCH");
  return { invoice, account };
}

async function reservationForAllocation(ctx: MutationCtx, allocation: Doc<"invoiceDepositAllocations">) {
  const reservation = await ctx.db.get(allocation.reservationTransactionId);
  if (!reservation || reservation.type !== "reservation") fail("DEPOSIT_TRANSACTION_NOT_FOUND");
  if (reservation.reversedByTransactionId) fail("DEPOSIT_ALLOCATION_INVALID");
  return reservation;
}

export const allocate = mutation({
  args: { invoiceId: v.id("invoices"), amount: v.number() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const { invoice, account } = await invoiceAndAccount(ctx, args.invoiceId);
    if (!Number.isSafeInteger(args.amount) || args.amount <= 0) fail("DEPOSIT_AMOUNT_INVALID");
    if (args.amount > invoice.outstandingAmount) fail("DEPOSIT_ALLOCATION_EXCEEDS_OUTSTANDING");
    const deltas = ledgerDeltas("reservation", args.amount);
    const updatedAccount = await applyLedgerDeltas(ctx, account, deltas);
    const now = Date.now();
    const reservationTransactionId = await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: "reservation",
      amount: args.amount,
      ...deltas,
      invoiceId: invoice._id,
      note: "invoice deposit allocation",
      createdAt: now,
      createdByUserId: user._id,
    });
    const allocationId = await ctx.db.insert("invoiceDepositAllocations", {
      invoiceId: invoice._id,
      accountId: account._id,
      reservationTransactionId,
      amount: args.amount,
      status: "active",
      createdAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(invoice._id, {
      ...(await updatedInvoiceAmounts(ctx, invoice, args.amount)),
      updatedAt: now,
    });
    const allocation = await ctx.db.get(allocationId);
    const updatedInvoice = await ctx.db.get(invoice._id);
    if (!allocation || !updatedInvoice) fail("DEPOSIT_ALLOCATION_INVALID");
    await recordAudit(ctx, user._id, "deposit.allocated", "invoice", invoice._id, { amount: String(args.amount) });
    return {
      ...allocationView(allocation),
      account: accountView(updatedAccount),
      invoice: invoiceView(updatedInvoice),
    };
  },
});

export const release = mutation({
  args: { allocationId: v.id("invoiceDepositAllocations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const result = await releaseAllocationInternal(ctx, args.allocationId, user._id);
    return {
      ...allocationView(result.allocation),
      account: accountView(result.account),
      invoice: invoiceView(result.invoice),
    };
  },
});

export async function releaseAllocationInternal(
  ctx: MutationCtx,
  allocationId: Id<"invoiceDepositAllocations">,
  actorUserId: Id<"appUsers">,
) {
  const allocation = await ctx.db.get(allocationId);
  if (!allocation || allocation.status !== "active") fail("DEPOSIT_ALLOCATION_INVALID");
  const { invoice, account } = await invoiceAndAccount(ctx, allocation.invoiceId);
  const reservation = await reservationForAllocation(ctx, allocation);
  const deltas = ledgerDeltas("release", allocation.amount);
  const updatedAccount = await applyLedgerDeltas(ctx, account, deltas);
  const now = Date.now();
  const releaseTransactionId = await appendDepositTransaction(ctx, {
    accountId: account._id,
    type: "release",
    amount: allocation.amount,
    ...deltas,
    invoiceId: invoice._id,
    referenceTransactionId: reservation._id,
    note: "invoice deposit release",
    createdAt: now,
    createdByUserId: actorUserId,
  });
  await ctx.db.patch(allocation._id, {
    status: "released",
    releasedAt: now,
    releasedByTransactionId: releaseTransactionId,
  });
  await ctx.db.patch(invoice._id, {
    ...(await updatedInvoiceAmounts(ctx, invoice, -allocation.amount)),
    updatedAt: now,
  });
  const updatedAllocation = await ctx.db.get(allocation._id);
  const updatedInvoice = await ctx.db.get(invoice._id);
  if (!updatedAllocation || !updatedInvoice) fail("DEPOSIT_ALLOCATION_INVALID");
  await recordAudit(ctx, actorUserId, "deposit.released", "invoice", invoice._id);
  return { allocation: updatedAllocation, account: updatedAccount, invoice: updatedInvoice };
}

export const reverse = mutation({
  args: { allocationId: v.id("invoiceDepositAllocations") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const allocation = await ctx.db.get(args.allocationId);
    if (!allocation) fail("DEPOSIT_ALLOCATION_INVALID");
    if (allocation.status !== "active") fail("DEPOSIT_ALLOCATION_INVALID");
    const { invoice, account } = await invoiceAndAccount(ctx, allocation.invoiceId);
    const reservation = await reservationForAllocation(ctx, allocation);
    const deltas = inverseLedgerDeltas({
      availableDelta: reservation.availableDelta,
      reservedDelta: reservation.reservedDelta,
    });
    const updatedAccount = await applyLedgerDeltas(ctx, account, deltas, {
      available: "DEPOSIT_REVERSAL_INVALID",
      reserved: "DEPOSIT_REVERSAL_INVALID",
    });
    const now = Date.now();
    const reversalTransactionId = await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: "reversal",
      amount: reservation.amount,
      ...deltas,
      invoiceId: invoice._id,
      referenceTransactionId: reservation._id,
      note: "invoice deposit reversal",
      createdAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(reservation._id, { reversedByTransactionId: reversalTransactionId });
    await ctx.db.patch(allocation._id, { status: "reversed" });
    await ctx.db.patch(invoice._id, {
      ...(await updatedInvoiceAmounts(ctx, invoice, -allocation.amount)),
      updatedAt: now,
    });
    const updatedAllocation = await ctx.db.get(allocation._id);
    const updatedInvoice = await ctx.db.get(invoice._id);
    if (!updatedAllocation || !updatedInvoice) fail("DEPOSIT_ALLOCATION_INVALID");
    await recordAudit(ctx, user._id, "deposit.allocation_reversed", "invoice", invoice._id);
    return {
      ...allocationView(updatedAllocation),
      account: accountView(updatedAccount),
      invoice: invoiceView(updatedInvoice),
    };
  },
});

export const listMine = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "deposits.read.own");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    await requireOwnedResource(ctx, invoice.customerUserId, "INVOICE_ACCESS_DENIED");
    const allocations = await ctx.db
      .query("invoiceDepositAllocations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
      .order("asc")
      .take(100);
    return Promise.all(allocations.map((allocation) => fullView(ctx, allocation, false)));
  },
});

export const listForAdmin = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "deposits.read.all");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    const allocations = await ctx.db
      .query("invoiceDepositAllocations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
      .order("asc")
      .take(100);
    return Promise.all(allocations.map((allocation) => fullView(ctx, allocation, true)));
  },
});
