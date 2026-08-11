import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { normalizedCategories, requiredText, slugify } from "./lib/validation";
import { bookPublicationStatusValidator } from "./validators";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    return ctx.db.query("books").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
  },
});

export const create = mutation({
  args: {
    publisherId: v.id("publishers"),
    title: v.string(),
    slug: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const publisher = await ctx.db.get(args.publisherId);
    if (!publisher?.isActive) fail("VALIDATION_FAILED", "publisher is unavailable");
    const title = requiredText(args.title, "book title");
    const slug = slugify(args.slug || title, "book slug");
    const existing = await ctx.db
      .query("books")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique();
    if (existing) fail("DUPLICATE_SLUG");
    const now = Date.now();
    const bookId = await ctx.db.insert("books", {
      publisherId: args.publisherId,
      title,
      slug,
      author: args.author?.trim() || undefined,
      description: args.description?.trim() || undefined,
      categories: normalizedCategories(args.categories || []),
      coverImageUrl: args.coverImageUrl?.trim() || undefined,
      publicationStatus: "draft",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "book.created", "book", bookId);
    return bookId;
  },
});

export const getForAdmin = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) return null;
    const [publisher, variants] = await Promise.all([
      ctx.db.get(book.publisherId),
      ctx.db
        .query("bookVariants")
        .withIndex("by_book", (query) => query.eq("bookId", book._id))
        .collect(),
    ]);
    return {
      ...book,
      publisher,
      variants: await Promise.all(
        variants.map(async (variant) => ({
          ...variant,
          stockQuantity:
            (
              await ctx.db
                .query("readyStockInventory")
                .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
                .unique()
            )?.quantity || 0,
        })),
      ),
    };
  },
});

export const listForAdmin = query({
  args: {
    search: v.optional(v.string()),
    publicationStatus: v.optional(bookPublicationStatusValidator),
    availability: v.optional(v.union(v.literal("in_stock"), v.literal("out_of_stock"), v.literal("not_listed"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    // ponytail: bounded operational scan; add cursor pagination when the master exceeds 200 books.
    const books = await ctx.db.query("books").withIndex("by_created_at").order("desc").take(200);
    const search = args.search?.trim().toLowerCase();
    const rows = await Promise.all(
      books.map(async (book) => {
        const [publisher, variants] = await Promise.all([
          ctx.db.get(book.publisherId),
          ctx.db
            .query("bookVariants")
            .withIndex("by_book", (query) => query.eq("bookId", book._id))
            .collect(),
        ]);
        const stocks = await Promise.all(
          variants.map((variant) =>
            ctx.db
              .query("readyStockInventory")
              .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
              .unique(),
          ),
        );
        return {
          ...book,
          publisherName: publisher?.name || "—",
          variants,
          stockQuantity: stocks.reduce((total, stock) => total + (stock?.quantity || 0), 0),
          isListed: stocks.some(Boolean),
        };
      }),
    );
    return rows.filter((row) => {
      if (args.publicationStatus && row.publicationStatus !== args.publicationStatus) return false;
      if (args.availability === "in_stock" && row.stockQuantity === 0) return false;
      if (args.availability === "out_of_stock" && (!row.isListed || row.stockQuantity > 0)) return false;
      if (args.availability === "not_listed" && row.isListed) return false;
      if (!search) return true;
      return [row.title, row.author, row.publisherName, ...row.categories, ...row.variants.map((item) => item.isbn)]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(search));
    });
  },
});

export const update = mutation({
  args: {
    bookId: v.id("books"),
    publisherId: v.optional(v.id("publishers")),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    coverImageUrl: v.optional(v.string()),
    publicationStatus: v.optional(bookPublicationStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    const publisherId = args.publisherId || book.publisherId;
    if (args.publisherId) {
      const publisher = await ctx.db.get(args.publisherId);
      if (!publisher?.isActive) fail("VALIDATION_FAILED", "publisher is unavailable");
    }
    const title = args.title === undefined ? book.title : requiredText(args.title, "book title");
    const slug = args.slug === undefined ? book.slug : slugify(args.slug || title, "book slug");
    const duplicate = await ctx.db
      .query("books")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique();
    if (duplicate && duplicate._id !== book._id) fail("DUPLICATE_SLUG");
    const publicationStatus = args.publicationStatus || book.publicationStatus;
    await ctx.db.patch(book._id, {
      publisherId,
      title,
      slug,
      author: args.author === undefined ? book.author : args.author.trim() || undefined,
      description: args.description === undefined ? book.description : args.description.trim() || undefined,
      categories: args.categories === undefined ? book.categories : normalizedCategories(args.categories),
      coverImageUrl: args.coverImageUrl === undefined ? book.coverImageUrl : args.coverImageUrl.trim() || undefined,
      publicationStatus,
      isActive: publicationStatus !== "archived",
      updatedAt: Date.now(),
    });
    await recordAudit(
      ctx,
      user._id,
      publicationStatus === book.publicationStatus ? "book.updated" : "book.publication_state_changed",
      "book",
      book._id,
      publicationStatus === book.publicationStatus
        ? undefined
        : { from: book.publicationStatus, to: publicationStatus },
    );
    return book._id;
  },
});
