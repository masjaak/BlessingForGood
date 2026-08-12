import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { nonNegativeQuantity } from "./lib/validation";
import { bookFormatValidator, bookSortValidator } from "./validators";

async function publicBookView(ctx: QueryCtx, book: Doc<"books">) {
  const [publisher, variants] = await Promise.all([
    ctx.db.get(book.publisherId),
    ctx.db
      .query("bookVariants")
      .withIndex("by_book", (query) => query.eq("bookId", book._id))
      .collect(),
  ]);
  if (!publisher?.isActive) return null;
  const stocked = (
    await Promise.all(
      variants.map(async (variant) => {
        const inventory = await ctx.db
          .query("readyStockInventory")
          .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
          .unique();
        const reservedQuantity = inventory?.reservedQuantity ?? 0;
        const availableQuantity = inventory ? Math.max(0, inventory.quantity - reservedQuantity) : 0;
        return variant.isAvailable && inventory && availableQuantity > 0
          ? {
              id: variant._id,
              format: variant.format,
              isbn: variant.isbn,
              priceAmount: variant.priceAmount,
              currency: variant.currency,
              stockQuantity: availableQuantity,
              onHandQuantity: inventory.quantity,
              reservedQuantity,
              availableQuantity,
            }
          : null;
      }),
    )
  ).filter((variant): variant is NonNullable<typeof variant> => variant !== null);
  if (!stocked.length) return null;
  const prices = stocked.map((variant) => variant.priceAmount);
  return {
    bookId: book._id,
    slug: book.slug,
    title: book.title,
    author: book.author,
    description: book.description,
    categories: book.categories,
    coverImageUrl: book.coverImageUrl,
    publisher: { id: publisher._id, name: publisher.name },
    variants: stocked,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    totalStock: stocked.reduce((total, variant) => total + variant.stockQuantity, 0),
    createdAt: book.createdAt,
  };
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    publisherId: v.optional(v.id("publishers")),
    format: v.optional(bookFormatValidator),
    sort: v.optional(bookSortValidator),
  },
  handler: async (ctx, args) => {
    // ponytail: bounded public scan; add search-specific indexes when published stock exceeds 200 titles.
    const books = await ctx.db
      .query("books")
      .withIndex("by_publication_status", (index) => index.eq("publicationStatus", "published"))
      .order("desc")
      .take(200);
    const allItems = (await Promise.all(books.map((book) => publicBookView(ctx, book)))).filter(
      (book): book is NonNullable<typeof book> => book !== null,
    );
    const search = args.search?.trim().toLowerCase();
    const items = allItems
      .map((book) => {
        const variants = args.format
          ? book.variants.filter((variant) => variant.format === args.format)
          : book.variants;
        const prices = variants.map((variant) => variant.priceAmount);
        return {
          ...book,
          variants,
          minPrice: prices.length ? Math.min(...prices) : book.minPrice,
          maxPrice: prices.length ? Math.max(...prices) : book.maxPrice,
          totalStock: variants.reduce((total, variant) => total + variant.stockQuantity, 0),
        };
      })
      .filter((book) => {
        if (!book.variants.length) return false;
        if (args.category && !book.categories.includes(args.category)) return false;
        if (args.publisherId && book.publisher.id !== args.publisherId) return false;
        if (!search) return true;
        return [book.title, book.author, book.publisher.name, ...book.categories, ...book.variants.map((v) => v.isbn)]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));
      });
    items.sort((left, right) => {
      if (args.sort === "title") return left.title.localeCompare(right.title);
      if (args.sort === "price") return left.minPrice - right.minPrice;
      return right.createdAt - left.createdAt;
    });
    return {
      items: items.slice(0, 100),
      filters: {
        categories: [...new Set(allItems.flatMap((book) => book.categories))].sort(),
        publishers: [...new Map(allItems.map((book) => [book.publisher.id, book.publisher])).values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        formats: [...new Set(allItems.flatMap((book) => book.variants.map((variant) => variant.format)))].sort(),
      },
    };
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "books.manage");
    // ponytail: bounded operational projection; add cursor pagination when the master exceeds 200 books.
    const books = await ctx.db.query("books").withIndex("by_created_at").order("desc").take(200);
    const rows = await Promise.all(
      books.map(async (book) => {
        const [publisher, variants] = await Promise.all([
          ctx.db.get(book.publisherId),
          ctx.db
            .query("bookVariants")
            .withIndex("by_book", (index) => index.eq("bookId", book._id))
            .collect(),
        ]);
        return Promise.all(
          variants.map(async (variant) => {
            const inventory = await ctx.db
              .query("readyStockInventory")
              .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", variant._id))
              .unique();
            const onHandQuantity = inventory?.quantity ?? 0;
            const reservedQuantity = inventory?.reservedQuantity ?? 0;
            return {
              bookId: book._id,
              title: book.title,
              publisherName: publisher?.name || "—",
              publicationStatus: book.publicationStatus,
              variantId: variant._id,
              format: variant.format,
              isbn: variant.isbn,
              isAvailable: variant.isAvailable,
              onHandQuantity,
              reservedQuantity,
              availableQuantity: Math.max(0, onHandQuantity - reservedQuantity),
            };
          }),
        );
      }),
    );
    return rows.flat();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_slug", (index) => index.eq("slug", args.slug))
      .unique();
    if (!book || book.publicationStatus !== "published") return null;
    return publicBookView(ctx, book);
  },
});

export const setQuantity = mutation({
  args: { bookVariantId: v.id("bookVariants"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const variant = await ctx.db.get(args.bookVariantId);
    if (!variant) fail("BOOK_VARIANT_NOT_FOUND");
    const quantity = nonNegativeQuantity(args.quantity);
    const existing = await ctx.db
      .query("readyStockInventory")
      .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", args.bookVariantId))
      .unique();
    const now = Date.now();
    const reservedQuantity = existing?.reservedQuantity ?? 0;
    if (quantity < reservedQuantity) fail("READY_STOCK_ON_HAND_BELOW_RESERVED");
    let inventoryId: Id<"readyStockInventory">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity,
        reservedQuantity,
        updatedAt: now,
        updatedByUserId: user._id,
      });
      inventoryId = existing._id;
    } else {
      inventoryId = await ctx.db.insert("readyStockInventory", {
        bookVariantId: args.bookVariantId,
        quantity,
        reservedQuantity: 0,
        createdAt: now,
        updatedAt: now,
        updatedByUserId: user._id,
      });
    }
    await recordAudit(ctx, user._id, "ready_stock.quantity_changed", "readyStockInventory", inventoryId, {
      from: String(existing?.quantity || 0),
      to: String(quantity),
    });
    return inventoryId;
  },
});
