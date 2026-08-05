import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { nonNegativeMoney, requiredText } from "./lib/validation";
import { requireSession } from "./lib/sessions";
import { bookFormatValidator } from "./validators";

export const listForBook = query({
  args: { sessionToken: v.string(), bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    return ctx.db
      .query("bookVariants")
      .withIndex("by_book", (query) => query.eq("bookId", args.bookId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    bookId: v.id("books"),
    format: bookFormatValidator,
    isbn: v.string(),
    priceAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const book = await ctx.db.get(args.bookId);
    if (!book || !book.isActive) fail("VALIDATION_FAILED", "book is unavailable");
    const isbn = requiredText(args.isbn, "ISBN");
    const duplicateIsbn = await ctx.db
      .query("bookVariants")
      .withIndex("by_isbn", (query) => query.eq("isbn", isbn))
      .unique();
    if (duplicateIsbn) fail("DUPLICATE_ISBN");
    const duplicateFormat = await ctx.db
      .query("bookVariants")
      .withIndex("by_book_and_format", (query) => query.eq("bookId", args.bookId).eq("format", args.format))
      .unique();
    if (duplicateFormat) fail("DUPLICATE_VARIANT");
    const now = Date.now();
    return ctx.db.insert("bookVariants", {
      bookId: args.bookId,
      format: args.format,
      isbn,
      priceAmount: nonNegativeMoney(args.priceAmount),
      currency: "IDR",
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
