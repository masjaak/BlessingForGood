import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { positiveMoney, requiredText } from "./lib/validation";
import { bookFormatValidator } from "./validators";

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
  args: { bookId: v.id("books"), format: bookFormatValidator, isbn: v.string(), priceAmount: v.number() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book || !book.isActive) fail("VALIDATION_FAILED", "book is unavailable");
    const isbn = requiredText(args.isbn, "ISBN");
    const duplicateIsbn = await ctx.db
      .query("bookVariants")
      .withIndex("by_isbn", (q) => q.eq("isbn", isbn))
      .unique();
    if (duplicateIsbn) fail("DUPLICATE_ISBN");
    const duplicateFormat = await ctx.db
      .query("bookVariants")
      .withIndex("by_book_and_format", (q) => q.eq("bookId", args.bookId).eq("format", args.format))
      .unique();
    if (duplicateFormat) fail("DUPLICATE_VARIANT");
    const now = Date.now();
    const variantId = await ctx.db.insert("bookVariants", {
      bookId: args.bookId,
      format: args.format,
      isbn,
      priceAmount: positiveMoney(args.priceAmount),
      currency: "IDR",
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });
    await recordAudit(ctx, user._id, "book_variant.created", "bookVariant", variantId);
    return variantId;
  },
});

export const update = mutation({
  args: {
    bookVariantId: v.id("bookVariants"),
    format: v.optional(bookFormatValidator),
    isbn: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
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
      isAvailable: args.isAvailable ?? variant.isAvailable,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, user._id, "book_variant.updated", "bookVariant", variant._id);
    return variant._id;
  },
});
