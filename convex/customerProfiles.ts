import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveUser, requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";

const profileFields = {
  displayName: v.string(),
  phone: v.optional(v.string()),
  whatsappNumber: v.optional(v.string()),
};

function text(value: string, label: string, max = 200) {
  const result = value.trim();
  if (!result || result.length > max) fail("VALIDATION_FAILED", `${label} is invalid`);
  return result;
}

function optionalText(value: string | undefined, label: string, max = 80) {
  if (value === undefined) return undefined;
  const result = value.trim();
  if (result.length > max) fail("VALIDATION_FAILED", `${label} is invalid`);
  return result || undefined;
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    return ctx.db
      .query("customerProfiles")
      .withIndex("by_user_id", (index) => index.eq("userId", user._id))
      .unique();
  },
});

export const upsertMine = mutation({
  args: profileFields,
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const now = Date.now();
    const values = {
      displayName: text(args.displayName, "display name"),
      phone: optionalText(args.phone, "phone"),
      whatsappNumber: optionalText(args.whatsappNumber, "WhatsApp number"),
      updatedAt: now,
    };
    const existing = await ctx.db
      .query("customerProfiles")
      .withIndex("by_user_id", (index) => index.eq("userId", user._id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return ctx.db.get(existing._id);
    }
    const profileId = await ctx.db.insert("customerProfiles", { userId: user._id, ...values, createdAt: now });
    return ctx.db.get(profileId);
  },
});

export const getForAdmin = query({
  args: { userId: v.id("appUsers") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "customers.read");
    return ctx.db
      .query("customerProfiles")
      .withIndex("by_user_id", (index) => index.eq("userId", args.userId))
      .unique();
  },
});
