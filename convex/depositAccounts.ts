import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { fail } from "./lib/errors";
import { canApplyLedgerDeltas, type LedgerDeltas } from "./lib/depositLedger";
import { requireSession } from "./lib/sessions";

type DataCtx = QueryCtx | MutationCtx;

export async function findDepositAccount(
  ctx: DataCtx,
  customerSessionId: Id<"prototypeSessions">,
): Promise<Doc<"depositAccounts"> | null> {
  return ctx.db
    .query("depositAccounts")
    .withIndex("by_customer_and_currency", (index) =>
      index.eq("customerSessionId", customerSessionId).eq("currency", "IDR"),
    )
    .unique();
}

export async function getOrCreateDepositAccount(
  ctx: MutationCtx,
  customerSessionId: Id<"prototypeSessions">,
  now: number,
): Promise<Doc<"depositAccounts">> {
  const existing = await findDepositAccount(ctx, customerSessionId);
  if (existing) return existing;
  const accountId = await ctx.db.insert("depositAccounts", {
    customerSessionId,
    currency: "IDR",
    availableAmount: 0,
    reservedAmount: 0,
    createdAt: now,
    updatedAt: now,
  });
  const account = await ctx.db.get(accountId);
  if (!account) fail("DEPOSIT_ACCOUNT_NOT_FOUND");
  return account;
}

export function accountView(account: Doc<"depositAccounts">) {
  return {
    accountId: account._id,
    currency: account.currency,
    availableAmount: account.availableAmount,
    reservedAmount: account.reservedAmount,
    updatedAt: new Date(account.updatedAt).toISOString(),
  };
}

export async function applyLedgerDeltas(
  ctx: MutationCtx,
  account: Doc<"depositAccounts">,
  deltas: LedgerDeltas,
  errors: {
    available: "DEPOSIT_BALANCE_INSUFFICIENT" | "DEPOSIT_REVERSAL_INVALID";
    reserved: "DEPOSIT_RESERVED_BALANCE_INSUFFICIENT" | "DEPOSIT_REVERSAL_INVALID";
  } = {
    available: "DEPOSIT_BALANCE_INSUFFICIENT",
    reserved: "DEPOSIT_RESERVED_BALANCE_INSUFFICIENT",
  },
) {
  if (!canApplyLedgerDeltas(account.availableAmount, account.reservedAmount, deltas)) {
    if (account.availableAmount + deltas.availableDelta < 0) fail(errors.available);
    fail(errors.reserved);
  }
  const updated = {
    availableAmount: account.availableAmount + deltas.availableDelta,
    reservedAmount: account.reservedAmount + deltas.reservedDelta,
    updatedAt: Date.now(),
  };
  await ctx.db.patch(account._id, updated);
  return { ...account, ...updated };
}

export const getMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const account = await findDepositAccount(ctx, session._id);
    return { account: account ? accountView(account) : null };
  },
});

export const getForInvoice = query({
  args: { sessionToken: v.string(), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    const account = await findDepositAccount(ctx, invoice.customerSessionId);
    return { account: account ? accountView(account) : null };
  },
});
