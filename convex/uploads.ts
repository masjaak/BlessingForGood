import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requirePermission, type Permission } from "./lib/auth";
import { fail } from "./lib/errors";
import { enforceRateLimit } from "./lib/rateLimit";

export const uploadPurposeValidator = v.union(
  v.literal("book-cover"),
  v.literal("book-gallery"),
  v.literal("payment-proof"),
  v.literal("deposit-proof"),
);

export type UploadPurpose = "book-cover" | "book-gallery" | "payment-proof" | "deposit-proof";

const permissions: Record<UploadPurpose, Permission> = {
  "book-cover": "books.manage",
  "book-gallery": "books.manage",
  "payment-proof": "invoices.read.own",
  "deposit-proof": "deposits.read.own",
};

const rateLimits = {
  "book-cover": "bookUploadUser",
  "book-gallery": "bookUploadUser",
  "payment-proof": "proofUploadUser",
  "deposit-proof": "depositUploadUser",
} as const;

export const authorize = internalMutation({
  args: { purpose: uploadPurposeValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, permissions[args.purpose]);
    await enforceRateLimit(ctx, rateLimits[args.purpose], String(user._id));
    return null;
  },
});

export const register = internalMutation({
  args: { storageId: v.id("_storage"), purpose: uploadPurposeValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, permissions[args.purpose]);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) fail("VALIDATION_FAILED", "file upload was not found");
    const existing = await ctx.db
      .query("uploadClaims")
      .withIndex("by_storage_id", (index) => index.eq("storageId", args.storageId))
      .unique();
    if (existing) fail("VALIDATION_FAILED", "file upload claim already exists");
    await ctx.db.insert("uploadClaims", {
      storageId: args.storageId,
      ownerUserId: user._id,
      purpose: args.purpose,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const assertClaim = internalQuery({
  args: { storageId: v.id("_storage"), purpose: uploadPurposeValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, permissions[args.purpose]);
    const claim = await ctx.db
      .query("uploadClaims")
      .withIndex("by_storage_id", (index) => index.eq("storageId", args.storageId))
      .unique();
    if (!claim || claim.ownerUserId !== user._id || claim.purpose !== args.purpose) {
      fail("VALIDATION_FAILED", "file upload is not owned by this account");
    }
    return null;
  },
});

export async function consumeClaim(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  purpose: UploadPurpose,
  ownerUserId: Id<"appUsers">,
): Promise<void> {
  const claim = await ctx.db
    .query("uploadClaims")
    .withIndex("by_storage_id", (index) => index.eq("storageId", storageId))
    .unique();
  if (!claim || claim.ownerUserId !== ownerUserId || claim.purpose !== purpose) {
    fail("VALIDATION_FAILED", "file upload is not owned by this account");
  }
  await ctx.db.delete(claim._id);
}
