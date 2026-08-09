import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireActiveUser, requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";

const addressFields = {
  label: v.string(),
  recipientName: v.string(),
  phone: v.string(),
  addressLine1: v.string(),
  addressLine2: v.optional(v.string()),
  city: v.string(),
  province: v.string(),
  postalCode: v.string(),
};

function text(value: string, label: string, max = 240) {
  const result = value.trim();
  if (!result || result.length > max) fail("VALIDATION_FAILED", `${label} is invalid`);
  return result;
}

function optionalText(value: string | undefined, label: string, max = 240) {
  if (value === undefined) return undefined;
  const result = value.trim();
  if (result.length > max) fail("VALIDATION_FAILED", `${label} is invalid`);
  return result || undefined;
}

type AddressCtx = QueryCtx | MutationCtx;

function addressView(address: Doc<"customerAddresses">) {
  return {
    addressId: address._id,
    userId: address.userId,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? null,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
    createdAt: new Date(address.createdAt).toISOString(),
    updatedAt: new Date(address.updatedAt).toISOString(),
  };
}

async function clearOtherDefaults(ctx: MutationCtx, userId: Id<"appUsers">, exceptId?: Id<"customerAddresses">) {
  const defaults = await ctx.db
    .query("customerAddresses")
    .withIndex("by_user_id_and_default", (index) => index.eq("userId", userId).eq("isDefault", true))
    .take(100);
  for (const address of defaults) {
    if (address._id !== exceptId) await ctx.db.patch(address._id, { isDefault: false, updatedAt: Date.now() });
  }
}

async function ownedAddress(ctx: AddressCtx, addressId: Id<"customerAddresses">, userId: Id<"appUsers">) {
  const address = await ctx.db.get(addressId);
  if (!address) fail("ADDRESS_NOT_FOUND");
  if (address.userId !== userId) fail("ADDRESS_ACCESS_DENIED");
  return address;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const addresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_user_id_and_created_at", (index) => index.eq("userId", user._id))
      .order("desc")
      .take(100);
    return addresses.map(addressView);
  },
});

export const create = mutation({
  args: { ...addressFields, isDefault: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("customerAddresses")
      .withIndex("by_user_id", (index) => index.eq("userId", user._id))
      .take(1);
    const isDefault = args.isDefault || existing.length === 0;
    const now = Date.now();
    if (isDefault) await clearOtherDefaults(ctx, user._id, undefined);
    const addressId = await ctx.db.insert("customerAddresses", {
      userId: user._id,
      label: text(args.label, "label", 80),
      recipientName: text(args.recipientName, "recipient name"),
      phone: text(args.phone, "phone", 40),
      addressLine1: text(args.addressLine1, "address", 240),
      addressLine2: optionalText(args.addressLine2, "address line 2"),
      city: text(args.city, "city", 100),
      province: text(args.province, "province", 100),
      postalCode: text(args.postalCode, "postal code", 20),
      isDefault,
      createdAt: now,
      updatedAt: now,
    });
    const address = await ctx.db.get(addressId);
    return address ? addressView(address) : null;
  },
});

export const update = mutation({
  args: {
    addressId: v.id("customerAddresses"),
    label: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    phone: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const address = await ownedAddress(ctx, args.addressId, user._id);
    if (args.isDefault) await clearOtherDefaults(ctx, user._id, address._id);
    if (args.isDefault === false && address.isDefault) {
      const replacement = await ctx.db
        .query("customerAddresses")
        .withIndex("by_user_id_and_created_at", (index) => index.eq("userId", user._id))
        .order("desc")
        .take(100);
      const nextDefault = replacement.find((candidate) => candidate._id !== address._id);
      if (!nextDefault) fail("VALIDATION_FAILED", "one default address is required");
      await ctx.db.patch(nextDefault._id, { isDefault: true, updatedAt: Date.now() });
    }
    const patch = {
      ...(args.label === undefined ? {} : { label: text(args.label, "label", 80) }),
      ...(args.recipientName === undefined ? {} : { recipientName: text(args.recipientName, "recipient name") }),
      ...(args.phone === undefined ? {} : { phone: text(args.phone, "phone", 40) }),
      ...(args.addressLine1 === undefined ? {} : { addressLine1: text(args.addressLine1, "address", 240) }),
      ...(args.addressLine2 === undefined ? {} : { addressLine2: optionalText(args.addressLine2, "address line 2") }),
      ...(args.city === undefined ? {} : { city: text(args.city, "city", 100) }),
      ...(args.province === undefined ? {} : { province: text(args.province, "province", 100) }),
      ...(args.postalCode === undefined ? {} : { postalCode: text(args.postalCode, "postal code", 20) }),
      ...(args.isDefault === undefined ? {} : { isDefault: args.isDefault }),
      updatedAt: Date.now(),
    };
    await ctx.db.patch(address._id, patch);
    const updated = await ctx.db.get(address._id);
    return updated ? addressView(updated) : null;
  },
});

export const remove = mutation({
  args: { addressId: v.id("customerAddresses") },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const address = await ownedAddress(ctx, args.addressId, user._id);
    await ctx.db.delete(address._id);
    if (address.isDefault) {
      const replacement = await ctx.db
        .query("customerAddresses")
        .withIndex("by_user_id_and_created_at", (index) => index.eq("userId", user._id))
        .order("desc")
        .first();
      if (replacement) await ctx.db.patch(replacement._id, { isDefault: true, updatedAt: Date.now() });
    }
    return { ok: true as const };
  },
});

export const listForAdmin = query({
  args: { userId: v.id("appUsers") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "customers.read");
    const addresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_user_id_and_created_at", (index) => index.eq("userId", args.userId))
      .order("desc")
      .take(100);
    return addresses.map(addressView);
  },
});
