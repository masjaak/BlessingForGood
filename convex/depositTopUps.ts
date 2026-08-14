import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyLedgerDeltas, getOrCreateDepositAccount } from "./depositAccounts";
import { appendDepositTransaction } from "./depositTransactions";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { ledgerDeltas } from "./lib/depositLedger";
import { fail } from "./lib/errors";
import { notifyAdmins, notifyUser } from "./lib/notifications";
import { validateStoredFile } from "./lib/storage";

const status = v.union(v.literal("submitted"), v.literal("under_review"), v.literal("approved"), v.literal("rejected"));
const proofTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function text(value: string | undefined, max = 500) {
  const result = value?.trim();
  if (result && result.length > max) fail("VALIDATION_FAILED");
  return result || undefined;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "deposits.read.own");
    return ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: {
    amount: v.number(),
    storageId: v.id("_storage"),
    bankReference: v.optional(v.string()),
    customerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.read.own");
    if (!Number.isSafeInteger(args.amount) || args.amount <= 0) fail("DEPOSIT_AMOUNT_INVALID");
    const contentType = await validateStoredFile(
      ctx,
      args.storageId,
      proofTypes,
      "proof must be JPG, PNG, WebP, or PDF up to 5 MB",
    );
    const now = Date.now();
    const topUpId = await ctx.db.insert("depositTopUps", {
      customerUserId: user._id,
      amount: args.amount,
      bankReference: text(args.bankReference, 160),
      proofStorageId: args.storageId,
      proofContentType: contentType,
      status: "submitted",
      customerNote: text(args.customerNote),
      createdAt: now,
      updatedAt: now,
    });
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "deposit.top_up_submitted",
      title: "Top-up deposit menunggu verifikasi",
      body: `Top-up IDR ${args.amount.toLocaleString("id-ID")} perlu ditinjau.`,
      destination: "/admin/deposits",
      relatedEntityType: "depositTopUp",
      relatedEntityId: String(topUpId),
    });
    return { topUpId, status: "submitted" as const };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "deposits.read.own");
    const rows = await ctx.db
      .query("depositTopUps")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerUserId", user._id))
      .order("desc")
      .take(100);
    return Promise.all(
      rows.map(async (row) => ({
        topUpId: row._id,
        amount: row.amount,
        bankReference: row.bankReference ?? null,
        status: row.status,
        customerNote: row.customerNote ?? null,
        rejectionReason: row.rejectionReason ?? null,
        createdAt: row.createdAt,
        proofUrl: await ctx.storage.getUrl(row.proofStorageId),
      })),
    );
  },
});

export const listForAdmin = query({
  args: { status: v.optional(status) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "deposits.read.all");
    const rows = args.status
      ? await ctx.db
          .query("depositTopUps")
          .withIndex("by_status_and_created_at", (index) => index.eq("status", args.status!))
          .order("desc")
          .take(100)
      : await ctx.db.query("depositTopUps").take(100);
    return Promise.all(
      rows.map(async (row) => {
        const customer = await ctx.db.get(row.customerUserId);
        return {
          topUpId: row._id,
          customerUserId: row.customerUserId,
          customerName: customer?.displayNameSnapshot || customer?.emailSnapshot || "Customer",
          amount: row.amount,
          bankReference: row.bankReference ?? null,
          status: row.status,
          createdAt: row.createdAt,
          proofUrl: await ctx.storage.getUrl(row.proofStorageId),
        };
      }),
    );
  },
});

export const startReview = mutation({
  args: { topUpId: v.id("depositTopUps") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const row = await ctx.db.get(args.topUpId);
    if (!row) fail("DEPOSIT_TOP_UP_NOT_FOUND");
    if (row.status !== "submitted") fail("DEPOSIT_TOP_UP_INVALID_STATE");
    await ctx.db.patch(row._id, { status: "under_review", updatedAt: Date.now(), reviewedByUserId: user._id });
    return { status: "under_review" as const };
  },
});

export const approve = mutation({
  args: { topUpId: v.id("depositTopUps"), reviewNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const row = await ctx.db.get(args.topUpId);
    if (!row) fail("DEPOSIT_TOP_UP_NOT_FOUND");
    if (row.status !== "under_review") fail("DEPOSIT_TOP_UP_INVALID_STATE");
    const now = Date.now();
    const account = await getOrCreateDepositAccount(ctx, row.customerUserId, now);
    const deltas = ledgerDeltas("credit", row.amount);
    await applyLedgerDeltas(ctx, account, deltas);
    const depositTransactionId = await appendDepositTransaction(ctx, {
      accountId: account._id,
      type: "credit",
      amount: row.amount,
      ...deltas,
      note: `Verified top-up ${row._id}`,
      createdAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(row._id, {
      status: "approved",
      reviewNote: text(args.reviewNote),
      reviewedAt: now,
      reviewedByUserId: user._id,
      depositTransactionId,
      updatedAt: now,
    });
    await recordAudit(ctx, user._id, "deposit.top_up_approved", "depositTopUp", row._id, {
      amount: String(row.amount),
    });
    await notifyUser(ctx, row.customerUserId, {
      surface: "notification",
      eventType: "deposit.top_up_approved",
      title: "Top-up deposit disetujui",
      body: `Saldo deposit bertambah IDR ${row.amount.toLocaleString("id-ID")}.`,
      destination: "/account/deposit",
      relatedEntityType: "depositTopUp",
      relatedEntityId: String(row._id),
    });
    return { status: "approved" as const, depositTransactionId };
  },
});

export const reject = mutation({
  args: { topUpId: v.id("depositTopUps"), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "deposits.manage");
    const row = await ctx.db.get(args.topUpId);
    if (!row) fail("DEPOSIT_TOP_UP_NOT_FOUND");
    if (row.status !== "under_review") fail("DEPOSIT_TOP_UP_INVALID_STATE");
    const reason = text(args.reason);
    if (!reason) fail("VALIDATION_FAILED", "rejection reason is required");
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: "rejected",
      rejectionReason: reason,
      reviewedAt: now,
      reviewedByUserId: user._id,
      updatedAt: now,
    });
    await recordAudit(ctx, user._id, "deposit.top_up_rejected", "depositTopUp", row._id);
    await notifyUser(ctx, row.customerUserId, {
      surface: "notification",
      eventType: "deposit.top_up_rejected",
      title: "Top-up deposit ditolak",
      body: "Periksa alasan penolakan di riwayat deposit.",
      destination: "/account/deposit",
      relatedEntityType: "depositTopUp",
      relatedEntityId: String(row._id),
    });
    return { status: "rejected" as const };
  },
});
