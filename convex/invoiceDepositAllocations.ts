import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { accountView, applyLedgerDeltas, findDepositAccount } from "./depositAccounts";
import { appendDepositTransaction, transactionView } from "./depositTransactions";
import { outstandingAmount } from "./lib/invoiceCalculations";
import { fail } from "./lib/errors";
import { inverseLedgerDeltas, ledgerDeltas } from "./lib/depositLedger";
import { requireSession } from "./lib/sessions";

type DataCtx = QueryCtx | MutationCtx;

function invoiceView(invoice: Doc<"invoices">) {
  return {
    invoiceId: invoice._id,
    orderId: invoice.orderId,
    status: invoice.status,
    totalAmount: invoice.totalAmount,
    allocatedDepositAmount: invoice.allocatedDepositAmount,
    outstandingAmount: invoice.outstandingAmount,
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

function updatedInvoiceAmounts(invoice: Doc<"invoices">, allocatedDelta: number) {
  const allocated = invoice.allocatedDepositAmount + allocatedDelta;
  try {
    return {
      allocatedDepositAmount: allocated,
      outstandingAmount: outstandingAmount(invoice.totalAmount, allocated),
    };
  } catch {
    fail("DEPOSIT_ALLOCATION_INVALID");
  }
}

async function invoiceAndAccount(ctx: MutationCtx, invoiceId: Id<"invoices">) {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) fail("INVOICE_NOT_FOUND");
  if (invoice.status === "void") fail("INVOICE_VOID");
  const account = await findDepositAccount(ctx, invoice.customerSessionId);
  if (!account) fail("DEPOSIT_ACCOUNT_NOT_FOUND");
  if (account.customerSessionId !== invoice.customerSessionId) fail("DEPOSIT_CUSTOMER_MISMATCH");
  return { invoice, account };
}

async function reservationForAllocation(ctx: MutationCtx, allocation: Doc<"invoiceDepositAllocations">) {
  const reservation = await ctx.db.get(allocation.reservationTransactionId);
  if (!reservation || reservation.type !== "reservation") fail("DEPOSIT_TRANSACTION_NOT_FOUND");
  if (reservation.reversedByTransactionId) fail("DEPOSIT_ALLOCATION_INVALID");
  return reservation;
}

export const allocate = mutation({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices"), amount: v.number() },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
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
      createdBySessionId: session._id,
    });
    const allocationId = await ctx.db.insert("invoiceDepositAllocations", {
      invoiceId: invoice._id,
      accountId: account._id,
      reservationTransactionId,
      amount: args.amount,
      status: "active",
      createdAt: now,
      createdBySessionId: session._id,
    });
    await ctx.db.patch(invoice._id, {
      ...updatedInvoiceAmounts(invoice, args.amount),
      updatedAt: now,
    });
    const allocation = await ctx.db.get(allocationId);
    const updatedInvoice = await ctx.db.get(invoice._id);
    if (!allocation || !updatedInvoice) fail("DEPOSIT_ALLOCATION_INVALID");
    return {
      ...allocationView(allocation),
      account: accountView(updatedAccount),
      invoice: invoiceView(updatedInvoice),
    };
  },
});

export const release = mutation({
  args: { sessionToken: v.string(), allocationId: v.id("invoiceDepositAllocations") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const allocation = await ctx.db.get(args.allocationId);
    if (!allocation) fail("DEPOSIT_ALLOCATION_INVALID");
    if (allocation.status !== "active") fail("DEPOSIT_ALLOCATION_INVALID");
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
      createdBySessionId: session._id,
    });
    await ctx.db.patch(allocation._id, {
      status: "released",
      releasedAt: now,
      releasedByTransactionId: releaseTransactionId,
    });
    await ctx.db.patch(invoice._id, {
      ...updatedInvoiceAmounts(invoice, -allocation.amount),
      updatedAt: now,
    });
    const updatedAllocation = await ctx.db.get(allocation._id);
    const updatedInvoice = await ctx.db.get(invoice._id);
    if (!updatedAllocation || !updatedInvoice) fail("DEPOSIT_ALLOCATION_INVALID");
    return {
      ...allocationView(updatedAllocation),
      account: accountView(updatedAccount),
      invoice: invoiceView(updatedInvoice),
    };
  },
});

export const reverse = mutation({
  args: { sessionToken: v.string(), allocationId: v.id("invoiceDepositAllocations") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
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
      createdBySessionId: session._id,
    });
    await ctx.db.patch(reservation._id, { reversedByTransactionId: reversalTransactionId });
    await ctx.db.patch(allocation._id, { status: "reversed" });
    await ctx.db.patch(invoice._id, {
      ...updatedInvoiceAmounts(invoice, -allocation.amount),
      updatedAt: now,
    });
    const updatedAllocation = await ctx.db.get(allocation._id);
    const updatedInvoice = await ctx.db.get(invoice._id);
    if (!updatedAllocation || !updatedInvoice) fail("DEPOSIT_ALLOCATION_INVALID");
    return {
      ...allocationView(updatedAllocation),
      account: accountView(updatedAccount),
      invoice: invoiceView(updatedInvoice),
    };
  },
});

export const listMine = query({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    if (invoice.customerSessionId !== session._id) fail("INVOICE_ACCESS_DENIED");
    const allocations = await ctx.db
      .query("invoiceDepositAllocations")
      .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
      .order("asc")
      .take(100);
    return Promise.all(allocations.map((allocation) => fullView(ctx, allocation, false)));
  },
});

export const listForAdmin = query({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
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
