import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { accountView, applyLedgerDeltas, findDepositAccount, getOrCreateDepositAccount } from "./depositAccounts";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { inverseLedgerDeltas, ledgerDeltas, type LedgerTransactionType } from "./lib/depositLedger";
import { notifyUser } from "./lib/notifications";

export type DepositTransactionType = LedgerTransactionType | "reversal";
type DepositHistoryDirection = "in" | "out";
type DataCtx = MutationCtx | QueryCtx;

const MAX_HISTORY_SCAN = 500;

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

function historyDirection(transaction: Doc<"depositTransactions">): DepositHistoryDirection {
  return transaction.availableDelta > 0 ? "in" : "out";
}

function historySource(
  transaction: Doc<"depositTransactions">,
  hasTopUp: boolean,
  hasInvoice: boolean,
  hasRefundObligation: boolean,
) {
  if (hasTopUp) return "Top-up disetujui";
  if (transaction.type === "reservation") return hasInvoice ? "Alokasi ke invoice" : "Penahanan deposit";
  if (transaction.type === "release") return hasRefundObligation ? "Pelepasan refund" : "Pelepasan alokasi";
  if (transaction.type === "debit") return hasRefundObligation ? "Pengembalian deposit" : "Penyesuaian manual";
  if (transaction.type === "reversal") return "Pembalikan transaksi";
  return hasInvoice ? "Kredit terkait invoice" : "Penyesuaian manual";
}

async function historyView(ctx: DataCtx, transaction: Doc<"depositTransactions">) {
  const account = await ctx.db.get(transaction.accountId);
  const [customer, actor, profile, topUp, obligation] = await Promise.all([
    account ? ctx.db.get(account.userId) : Promise.resolve(null),
    ctx.db.get(transaction.createdByUserId),
    account
      ? ctx.db
          .query("customerProfiles")
          .withIndex("by_user_id", (index) => index.eq("userId", account.userId))
          .unique()
      : Promise.resolve(null),
    ctx.db
      .query("depositTopUps")
      .withIndex("by_deposit_transaction", (index) => index.eq("depositTransactionId", transaction._id))
      .first(),
    transaction.refundObligationId ? ctx.db.get(transaction.refundObligationId) : Promise.resolve(null),
  ]);
  const invoiceId = transaction.invoiceId ?? obligation?.invoiceId;
  const invoice = invoiceId ? await ctx.db.get(invoiceId) : null;
  const order = invoice
    ? await ctx.db.get(invoice.orderId)
    : obligation?.orderId
      ? await ctx.db.get(obligation.orderId)
      : null;
  const batch = invoice?.batchId ? await ctx.db.get(invoice.batchId) : null;
  return {
    ...transactionView(transaction, true),
    direction: historyDirection(transaction),
    customerUserId: account?.userId ?? null,
    customerName: profile?.displayName || customer?.displayNameSnapshot || customer?.emailSnapshot || null,
    customerMemberCode: customer?.memberCode ?? null,
    source: historySource(transaction, Boolean(topUp), Boolean(invoice), Boolean(obligation)),
    description: transaction.note ?? null,
    topUpReference: topUp?.bankReference ?? null,
    invoiceNumber: invoice?.invoiceNumber ?? null,
    orderCode: order?.orderCode ?? null,
    batchName: batch?.name ?? null,
    actorName: actor?.displayNameSnapshot || actor?.emailSnapshot || null,
  };
}

function decodeHistoryCursor(value: string | null): { cursor: string | null; skip: number } {
  if (!value) return { cursor: null, skip: 0 };
  try {
    const decoded = JSON.parse(value) as { cursor?: unknown; skip?: unknown };
    if (typeof decoded.cursor === "string" || decoded.cursor === null) {
      return { cursor: decoded.cursor, skip: typeof decoded.skip === "number" ? Math.max(0, decoded.skip) : 0 };
    }
  } catch {
    // A stale Convex cursor can still resume the canonical index from its raw value.
  }
  return { cursor: value, skip: 0 };
}

function encodeHistoryCursor(cursor: string | null, skip = 0) {
  return JSON.stringify({ cursor, skip });
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
      invoiceId: invoice._id,
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
    return { ...page, page: await Promise.all(page.page.map((transaction) => historyView(ctx, transaction))) };
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
    return { ...page, page: await Promise.all(page.page.map((transaction) => historyView(ctx, transaction))) };
  },
});

export const listForAdmin = query({
  args: {
    paginationOpts: paginationOptsValidator,
    customerUserId: v.optional(v.id("appUsers")),
    direction: v.optional(v.union(v.literal("in"), v.literal("out"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "deposits.read.all");
    const account = args.customerUserId ? await findDepositAccount(ctx, args.customerUserId) : null;
    if (args.customerUserId && !account) return { page: [], isDone: true, continueCursor: "" };

    const requested = Math.min(Math.max(Math.floor(args.paginationOpts.numItems), 1), 100);
    const decoded = decodeHistoryCursor(args.paginationOpts.cursor);
    // ponytail: bounded filtered scan (500 ledger rows/query); the cursor resumes after this raw page.
    const sourcePage = account
      ? await ctx.db
          .query("depositTransactions")
          .withIndex("by_account_and_created_at", (index) => index.eq("accountId", account._id))
          .order("desc")
          .paginate({ numItems: MAX_HISTORY_SCAN, cursor: decoded.cursor })
      : await ctx.db
          .query("depositTransactions")
          .withIndex("by_created_at")
          .order("desc")
          .paginate({ numItems: MAX_HISTORY_SCAN, cursor: decoded.cursor });
    const matchingTransactions = args.direction
      ? sourcePage.page.filter((transaction) => historyDirection(transaction) === args.direction)
      : sourcePage.page;
    const visibleTransactions = matchingTransactions.slice(decoded.skip, decoded.skip + requested);
    const nextSkip = decoded.skip + visibleTransactions.length;
    const hasMoreMatchesInPage = matchingTransactions.length > nextSkip;
    const rows = await Promise.all(visibleTransactions.map((transaction) => historyView(ctx, transaction)));
    const isDone = !hasMoreMatchesInPage && sourcePage.isDone;
    return {
      page: rows,
      isDone,
      continueCursor: isDone
        ? ""
        : encodeHistoryCursor(
            hasMoreMatchesInPage ? decoded.cursor : sourcePage.continueCursor,
            hasMoreMatchesInPage ? nextSkip : 0,
          ),
    };
  },
});
