import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";

function required(value: string, max: number) {
  const result = value.trim();
  if (!result || result.length > max) fail("VALIDATION_FAILED");
  return result;
}

function optional(value: string | undefined, max: number) {
  const result = value?.trim() || undefined;
  if (result && result.length > max) fail("VALIDATION_FAILED");
  return result;
}

export const getForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "settings.manage");
    return ctx.db
      .query("appSettings")
      .withIndex("by_key", (index) => index.eq("key", "primary"))
      .unique();
  },
});

export const getForCustomer = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "invoices.read.own");
    const settings = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (index) => index.eq("key", "primary"))
      .unique();
    return settings
      ? {
          storeName: settings.storeName,
          whatsappNumber: settings.whatsappNumber,
          paymentInstructions: settings.paymentInstructions,
          supportEmail: settings.supportEmail || null,
          socialContact: settings.socialContact || null,
          bankName: settings.bankName || null,
          bankAccountNumber: settings.bankAccountNumber || null,
          bankAccountName: settings.bankAccountName || null,
        }
      : null;
  },
});

export const update = mutation({
  args: {
    storeName: v.string(),
    whatsappNumber: v.string(),
    paymentInstructions: v.string(),
    supportEmail: v.optional(v.string()),
    socialContact: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "settings.manage");
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (index) => index.eq("key", "primary"))
      .unique();
    const now = Date.now();
    const values = {
      storeName: required(args.storeName, 120),
      whatsappNumber: required(args.whatsappNumber, 40),
      paymentInstructions: required(args.paymentInstructions, 1000),
      supportEmail: optional(args.supportEmail, 160),
      socialContact: optional(args.socialContact, 160),
      bankName: optional(args.bankName, 120),
      bankAccountNumber: optional(args.bankAccountNumber, 80),
      bankAccountName: optional(args.bankAccountName, 120),
      updatedAt: now,
      updatedByUserId: user._id,
    };
    let settingsId;
    if (existing) {
      await ctx.db.patch(existing._id, values);
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("appSettings", { key: "primary", ...values, createdAt: now });
    }
    await recordAudit(ctx, user._id, "settings.updated", "appSettings", settingsId);
    return settingsId;
  },
});
