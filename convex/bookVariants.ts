import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { nonNegativeMoney, positiveMoney, requiredText } from "./lib/validation";
import { bookFormatValidator } from "./validators";
import { insertVariant } from "./lib/productDomain";

export const listForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    return ctx.db
      .query("bookVariants")
      .withIndex("by_book", (query) => query.eq("bookId", args.bookId))
      .collect();
  },
});

export const create = mutation({
  args: {
    bookId: v.id("books"),
    format: bookFormatValidator,
    isbn: v.string(),
    priceAmount: v.number(),
    supplierPriceGbpMinor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    return insertVariant(ctx, user._id, {
      bookId: args.bookId,
      format: args.format,
      isbn: args.isbn,
      priceAmount: args.priceAmount,
      supplierPriceGbpMinor:
        args.supplierPriceGbpMinor === undefined ? undefined : nonNegativeMoney(args.supplierPriceGbpMinor),
      isAvailable: true,
    });
  },
});

export const update = mutation({
  args: {
    bookVariantId: v.id("bookVariants"),
    format: v.optional(bookFormatValidator),
    isbn: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
    supplierPriceGbpMinor: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const variant = await ctx.db.get(args.bookVariantId);
    if (!variant) fail("BOOK_VARIANT_NOT_FOUND");
    const isbn = args.isbn === undefined ? variant.isbn : requiredText(args.isbn, "ISBN");
    const format = args.format || variant.format;
    const duplicateIsbn = await ctx.db
      .query("bookVariants")
      .withIndex("by_isbn", (q) => q.eq("isbn", isbn))
      .unique();
    if (duplicateIsbn && duplicateIsbn._id !== variant._id) fail("DUPLICATE_ISBN");
    const duplicateFormat = await ctx.db
      .query("bookVariants")
      .withIndex("by_book_and_format", (q) => q.eq("bookId", variant.bookId).eq("format", format))
      .unique();
    if (duplicateFormat && duplicateFormat._id !== variant._id) fail("DUPLICATE_VARIANT");
    await ctx.db.patch(variant._id, {
      format,
      isbn,
      priceAmount: args.priceAmount === undefined ? variant.priceAmount : positiveMoney(args.priceAmount),
      supplierPriceGbpMinor:
        args.supplierPriceGbpMinor === undefined
          ? variant.supplierPriceGbpMinor
          : nonNegativeMoney(args.supplierPriceGbpMinor),
      isAvailable: args.isAvailable ?? variant.isAvailable,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, user._id, "book_variant.updated", "bookVariant", variant._id);
    return variant._id;
  },
});

export const remove = mutation({
  args: { bookVariantId: v.id("bookVariants") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const variant = await ctx.db.get(args.bookVariantId);
    if (!variant) fail("BOOK_VARIANT_NOT_FOUND");
    const [catalogItem, orderItem, reservation, inventory] = await Promise.all([
      ctx.db
        .query("catalogItems")
        .withIndex("by_variant", (query) => query.eq("bookVariantId", variant._id))
        .first(),
      ctx.db
        .query("orderItems")
        .withIndex("by_variant", (query) => query.eq("bookVariantId", variant._id))
        .first(),
      ctx.db
        .query("readyStockReservations")
        .withIndex("by_variant", (query) => query.eq("bookVariantId", variant._id))
        .first(),
      ctx.db
        .query("readyStockInventory")
        .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
        .unique(),
    ]);
    if (catalogItem || orderItem || reservation) fail("ENTITY_IN_USE", "format has business history");
    if (inventory && (inventory.quantity > 0 || (inventory.reservedQuantity ?? 0) > 0)) {
      fail("ENTITY_IN_USE", "format has ready stock history");
    }
    if (inventory) await ctx.db.delete(inventory._id);
    await ctx.db.delete(variant._id);
    await recordAudit(ctx, user._id, "book_variant.deleted", "bookVariant", variant._id);
    return { removed: true };
  },
});
