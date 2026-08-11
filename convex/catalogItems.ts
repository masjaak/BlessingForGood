import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requirePermission } from "./lib/auth";
import { nonNegativeMoney } from "./lib/validation";

export const listForCatalog = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    return ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (query) => query.eq("catalogId", args.catalogId))
      .take(200);
  },
});

export const add = mutation({
  args: {
    catalogId: v.id("secretCatalogs"),
    bookVariantId: v.id("bookVariants"),
    priceOverrideAmount: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    const catalog = await ctx.db.get(args.catalogId);
    const variant = await ctx.db.get(args.bookVariantId);
    if (!catalog || !variant) fail("VALIDATION_FAILED", "catalog item reference is invalid");
    const duplicate = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog_and_variant", (query) =>
        query.eq("catalogId", args.catalogId).eq("bookVariantId", args.bookVariantId),
      )
      .unique();
    if (duplicate) fail("DUPLICATE_VARIANT");
    const now = Date.now();
    return ctx.db.insert("catalogItems", {
      catalogId: args.catalogId,
      bookVariantId: args.bookVariantId,
      priceOverrideAmount:
        args.priceOverrideAmount === undefined ? undefined : nonNegativeMoney(args.priceOverrideAmount),
      isAvailable: true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});
