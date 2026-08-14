import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { accountView, applyLedgerDeltas, findDepositAccount, getOrCreateDepositAccount } from "./depositAccounts";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { inverseLedgerDeltas, ledgerDeltas, type LedgerTransactionType } from "./lib/depositLedger";
import { notifyUser } from "./lib/notifications";

export type DepositTransactionType = LedgerTransactionType | "reversal";

type TransactionInput = {
  accountId: Id<"depositAccounts">;
  type: DepositTransactionType;
  amount: number;
  availableDelta: number;
  reservedDelta: number;
  invoiceId?: Id<"invoices">;
  referenceTransactionId?: Id<"depositTransactions">;
  refundObligationId?: Id<"refundObligations">;
  note?: string;
  createdAt: number;
  createdByUserId: Id<"appUsers">;
};

function noteValue(note?: string) {
  if (note && note.length > 500) fail("VALIDATION_FAILED", "deposit note is too long");
  return note?.trim() || undefined;
}

function positiveDeltas(type: LedgerTransactionType, amount: number) {
  try {
    return ledgerDeltas(type, amount);
  } catch {
    fail("DEPOSIT_AMOUNT_INVALID");
  }
}

export async function appendDepositTransaction(ctx: MutationCtx, input: TransactionInput) {
  return ctx.db.insert("depositTransactions", input);
}

export function transactionView(transaction: Doc<"depositTransactions">, includeNote: boolean) {
  return {
    transactionId: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    availableDelta: transaction.availableDelta,
    reservedDelta: transaction.reservedDelta,
    invoiceId: transaction.invoiceId ?? null,
    referenceTransactionId: transaction.referenceTransactionId ?? null,
    refundObligationId: transaction.refundObligationId ?? null,
    reversedByTransactionId: transaction.reversedByTransactionId ?? null,
    note: includeNote ? (transaction.note ?? null) : null,
    createdAt: new Date(transaction.createdAt).toISOString(),
  };
}

export const recordCredit = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    const now = Date.now();
    const account = await getOrCreateDepositAccount(ctx, invoice.customerUserId, now);
    const deltas = positiveDeltas("credit", args.amount);
    const updatedAccount = await applyLedgerDeltas(ctx, account, deltas);
    const transactionId = await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: "credit",
      amount: args.amount,
      ...deltas,
      note: noteValue(args.note),
      createdAt: now,
      createdByUserId: user._id,
    });
    const transaction = await ctx.db.get(transactionId);
    if (!transaction) fail("DEPOSIT_TRANSACTION_NOT_FOUND");
    await recordAudit(ctx, user._id, "deposit.credit_recorded", "invoice", args.invoiceId);
    return { ...transactionView(transaction, true), account: accountView(updatedAccount) };
  },
});

export const adjust = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    direction: v.union(v.literal("credit"), v.literal("debit")),
    amount: v.number(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const customer = await ctx.db.get(args.customerUserId);
    if (!customer || customer.role !== "customer") fail("DEPOSIT_CUSTOMER_MISMATCH");
    const note = noteValue(args.note);
    if (!note) fail("VALIDATION_FAILED", "adjustment note is required");
    const deltas = positiveDeltas(args.direction, args.amount);
    const now = Date.now();
    const account = await getOrCreateDepositAccount(ctx, customer._id, now);
    const updatedAccount = await applyLedgerDeltas(ctx, account, deltas);
    const transactionId = await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: args.direction,
      amount: args.amount,
      ...deltas,
      note,
      createdAt: now,
      createdByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "deposit.manual_adjustment", "depositTransaction", transactionId, {
      customerUserId: String(customer._id),
      direction: args.direction,
      amount: String(args.amount),
    });
    await notifyUser(ctx, customer._id, {
      surface: "notification",
      eventType: "deposit.adjusted",
      title: "Saldo deposit disesuaikan",
      body: `Admin mencatat penyesuaian ${args.direction} IDR ${args.amount.toLocaleString("id-ID")}.`,
      destination: "/account/deposit",
      relatedEntityType: "depositTransaction",
      relatedEntityId: String(transactionId),
    });
    const transaction = await ctx.db.get(transactionId);
    if (!transaction) fail("DEPOSIT_TRANSACTION_NOT_FOUND");
    return { ...transactionView(transaction, true), account: accountView(updatedAccount) };
  },
});

export const reverse = mutation({
  args: {
    transactionId: v.id("depositTransactions"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const original = await ctx.db.get(args.transactionId);
    if (!original) fail("DEPOSIT_TRANSACTION_NOT_FOUND");
    if (original.type === "reversal") fail("DEPOSIT_REVERSAL_INVALID");
    if (original.reversedByTransactionId) fail("DEPOSIT_TRANSACTION_ALREADY_REVERSED");
    const priorReversal = await ctx.db
      .query("depositTransactions")
      .withIndex("by_reference_transaction", (index) => index.eq("referenceTransactionId", original._id))
      .first();
    if (priorReversal) fail("DEPOSIT_TRANSACTION_ALREADY_REVERSED");
    if (original.invoiceId) {
      const allocations = await ctx.db
        .query("invoiceDepositAllocations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", original.invoiceId!))
        .take(100);
      if (
        allocations.some(
          (allocation) =>
            allocation.reservationTransactionId === original._id || allocation.releasedByTransactionId === original._id,
        )
      ) {
        fail("DEPOSIT_REVERSAL_INVALID", "use the allocation correction flow");
      }
    }
    const account = await ctx.db.get(original.accountId);
    if (!account) fail("DEPOSIT_ACCOUNT_NOT_FOUND");
    const deltas = inverseLedgerDeltas({
      availableDelta: original.availableDelta,
      reservedDelta: original.reservedDelta,
    });
    const updatedAccount = await applyLedgerDeltas(ctx, account, deltas, {
      available: "DEPOSIT_REVERSAL_INVALID",
      reserved: "DEPOSIT_REVERSAL_INVALID",
    });
    const now = Date.now();
    const reversalId = await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: "reversal",
      amount: original.amount,
      ...deltas,
      invoiceId: original.invoiceId,
      referenceTransactionId: original._id,
      refundObligationId: original.refundObligationId,
      note: noteValue(args.note),
      createdAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(original._id, { reversedByTransactionId: reversalId });
    const reversal = await ctx.db.get(reversalId);
    if (!reversal) fail("DEPOSIT_TRANSACTION_NOT_FOUND");
    await recordAudit(ctx, user._id, "deposit.reversed", "depositTransaction", original._id);
    return { ...transactionView(reversal, true), account: accountView(updatedAccount) };
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.read.own");
    const account = await findDepositAccount(ctx, user._id);
    if (!account) return { page: [], isDone: true, continueCursor: "" };
    const page = await ctx.db
      .query("depositTransactions")
      .withIndex("by_account_and_created_at", (index) => index.eq("accountId", account._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: page.page.map((transaction) => transactionView(transaction, false)) };
  },
});

export const listForInvoice = query({
  args: { invoiceId: v.id("invoices"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "deposits.read.all");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    const account = await findDepositAccount(ctx, invoice.customerUserId);
    if (!account) return { page: [], isDone: true, continueCursor: "" };
    const page = await ctx.db
      .query("depositTransactions")
      .withIndex("by_account_and_created_at", (index) => index.eq("accountId", account._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: page.page.map((transaction) => transactionView(transaction, true)) };
  },
});
