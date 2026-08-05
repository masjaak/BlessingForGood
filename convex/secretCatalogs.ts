import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { accessCodeDigests } from "./lib/accessCodes";
import { getCatalogView } from "./lib/catalogView";
import { fail } from "./lib/errors";
import { requireSession } from "./lib/sessions";
import { nonNegativeMoney, requiredText, slugify } from "./lib/validation";
import { bookFormatValidator } from "./validators";

const variantInput = v.object({
  format: bookFormatValidator,
  isbn: v.string(),
  priceAmount: v.number(),
});

export const list = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const page = await ctx.db
      .query("secretCatalogs")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((catalog) => getCatalogView(ctx, catalog._id))) };
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    closesAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const name = requiredText(args.name, "catalog name");
    const slug = slugify(args.slug || name, "catalog slug");
    const duplicate = await ctx.db
      .query("secretCatalogs")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique();
    if (duplicate) fail("DUPLICATE_SLUG");
    if (args.closesAt !== undefined && args.closesAt <= Date.now()) {
      fail("VALIDATION_FAILED", "closing date is invalid");
    }
    const now = Date.now();
    return ctx.db.insert("secretCatalogs", {
      name,
      slug,
      description: args.description?.trim() || undefined,
      status: "draft",
      closesAt: args.closesAt,
      createdAt: now,
      updatedAt: now,
      createdBySessionId: session._id,
    });
  },
});

export const open = mutation({
  args: { sessionToken: v.string(), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (catalog.status === "closed" || catalog.status === "archived") fail("CATALOG_CLOSED");
    if (catalog.closesAt && catalog.closesAt <= Date.now()) fail("CATALOG_CLOSED");
    const now = Date.now();
    await ctx.db.patch(args.catalogId, { status: "open", opensAt: catalog.opensAt || now, updatedAt: now });
    return getCatalogView(ctx, args.catalogId);
  },
});

export const close = mutation({
  args: { sessionToken: v.string(), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    const now = Date.now();
    await ctx.db.patch(args.catalogId, { status: "closed", updatedAt: now });
    return getCatalogView(ctx, args.catalogId);
  },
});

export const createBundle = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    publisherName: v.string(),
    bookTitle: v.string(),
    accessCode: v.string(),
    closesAt: v.optional(v.number()),
    variants: v.array(variantInput),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const name = requiredText(args.name, "catalog name");
    const catalogSlug = slugify(name, "catalog slug");
    const publisherName = requiredText(args.publisherName, "publisher name");
    const publisherSlug = slugify(publisherName, "publisher name");
    const bookTitle = requiredText(args.bookTitle, "book title");
    if (!args.variants.length) fail("VALIDATION_FAILED", "at least one format is required");
    if (args.closesAt !== undefined && args.closesAt <= Date.now())
      fail("VALIDATION_FAILED", "closing date is invalid");
    const duplicateCatalog = await ctx.db
      .query("secretCatalogs")
      .withIndex("by_slug", (query) => query.eq("slug", catalogSlug))
      .unique();
    if (duplicateCatalog) fail("DUPLICATE_SLUG");
    let publisher = await ctx.db
      .query("publishers")
      .withIndex("by_slug", (query) => query.eq("slug", publisherSlug))
      .unique();
    const now = Date.now();
    if (!publisher) {
      const publisherId = await ctx.db.insert("publishers", {
        name: publisherName,
        slug: publisherSlug,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBySessionId: session._id,
      });
      publisher = await ctx.db.get(publisherId);
    }
    if (!publisher) throw new Error("publisher creation failed");
    const bookSlug = slugify(bookTitle, "book slug");
    let book = await ctx.db
      .query("books")
      .withIndex("by_publisher_and_slug", (query) => query.eq("publisherId", publisher!._id).eq("slug", bookSlug))
      .unique();
    if (!book) {
      const bookId = await ctx.db.insert("books", {
        publisherId: publisher._id,
        title: bookTitle,
        slug: bookSlug,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBySessionId: session._id,
      });
      book = await ctx.db.get(bookId);
    }
    if (!book) throw new Error("book creation failed");

    const formats = new Set<string>();
    const variantIds = [];
    for (const input of args.variants) {
      if (formats.has(input.format)) fail("DUPLICATE_VARIANT");
      formats.add(input.format);
      const isbn = requiredText(input.isbn, "ISBN");
      const duplicateIsbn = await ctx.db
        .query("bookVariants")
        .withIndex("by_isbn", (query) => query.eq("isbn", isbn))
        .unique();
      if (duplicateIsbn) fail("DUPLICATE_ISBN");
      const variantId = await ctx.db.insert("bookVariants", {
        bookId: book._id,
        format: input.format,
        isbn,
        priceAmount: nonNegativeMoney(input.priceAmount),
        currency: "IDR",
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
      variantIds.push(variantId);
    }

    const catalogId = await ctx.db.insert("secretCatalogs", {
      name,
      slug: catalogSlug,
      status: "draft",
      closesAt: args.closesAt,
      createdAt: now,
      updatedAt: now,
      createdBySessionId: session._id,
    });
    const digests = await accessCodeDigests(catalogId, args.accessCode);
    await ctx.db.insert("catalogAccessCodes", {
      catalogId,
      ...digests,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    for (const [index, variantId] of variantIds.entries()) {
      await ctx.db.insert("catalogItems", {
        catalogId,
        bookVariantId: variantId,
        isAvailable: true,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { catalogId, publisherId: publisher._id, bookId: book._id, variantIds };
  },
});
