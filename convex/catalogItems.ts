import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { matchesAdminCatalogRecord, normalizeDiscoveryQuery } from "../src/lib/catalog-discovery";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requirePermission } from "./lib/auth";
import { refreshAdminCatalogPreview, syncAdminCatalogTitle } from "./lib/adminCatalogList";
import { nonNegativeMoney } from "./lib/validation";
import { recordAudit } from "./lib/audit";
import { sortCatalogItems } from "./lib/catalogOrdering";

function eligibleCatalogReferences(
  variant: Doc<"bookVariants"> | null,
  book: Doc<"books"> | null,
  publisher: Doc<"publishers"> | null,
) {
  if (!variant?.isAvailable) return null;
  if (!book?.isActive || !["published", "special"].includes(book.publicationStatus)) return null;
  if (!publisher?.isActive) return null;
  return { variant, book, publisher };
}

async function addableCatalogVariant(
  ctx: QueryCtx,
  catalogId: Id<"secretCatalogs">,
  variant: Doc<"bookVariants">,
  book: Doc<"books"> | null,
  publisher: Doc<"publishers"> | null,
  search: string,
) {
  const eligible = eligibleCatalogReferences(variant, book, publisher);
  if (!eligible) return null;
  const row = {
    variantId: eligible.variant._id,
    bookId: eligible.book._id,
    title: eligible.book.title,
    publisherName: eligible.publisher.name,
    author: eligible.book.author ?? null,
    format: eligible.variant.format,
    isbn: eligible.variant.isbn,
    priceAmount: eligible.variant.priceAmount,
  };
  if (!matchesAdminCatalogRecord(row, search)) return null;
  const assigned = await ctx.db
    .query("catalogItems")
    .withIndex("by_catalog_and_variant", (q) => q.eq("catalogId", catalogId).eq("bookVariantId", variant._id))
    .unique();
  return assigned ? null : row;
}

async function adminCatalogRows(ctx: QueryCtx, catalogId: Id<"secretCatalogs">, limit?: number) {
  const catalogItems = ctx.db
    .query("catalogItems")
    .withIndex("by_catalog", (query) => query.eq("catalogId", catalogId));
  const items = sortCatalogItems(limit ? await catalogItems.take(limit) : await catalogItems.collect());
  return Promise.all(
    items.map(async (item, position) => {
      const variant = await ctx.db.get(item.bookVariantId);
      const book = variant ? await ctx.db.get(variant.bookId) : null;
      const publisher = book ? await ctx.db.get(book.publisherId) : null;
      return {
        ...item,
        bookId: book?._id ?? null,
        title: book?.title || "Unknown book",
        publisherName: publisher?.name ?? null,
        author: book?.author ?? null,
        format: variant?.format || null,
        isbn: variant?.isbn || null,
        priceAmount: item.priceOverrideAmount ?? variant?.priceAmount ?? 0,
        position,
      };
    }),
  );
}

export const listForCatalog = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    // ponytail: retained 500-item compatibility projection; the Admin screen uses listForCatalogPage.
    const rows = await adminCatalogRows(ctx, args.catalogId, 500);
    return rows.map(({ position: _position, ...row }) => {
      void _position;
      return row;
    });
  },
});

export const listForCatalogPage = query({
  args: {
    catalogId: v.id("secretCatalogs"),
    pageNumber: v.optional(v.number()),
    pageSize: v.optional(v.union(v.literal(25), v.literal(50), v.literal(100))),
    search: v.optional(v.string()),
    publisher: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    // ponytail: join-based filters and custom sort scan the Catalog; index these fields if query read cost becomes material.
    const rows = await adminCatalogRows(ctx, args.catalogId);
    const search = normalizeDiscoveryQuery(args.search ?? "").slice(0, 120);
    const filtered = rows.filter(
      (item) => matchesAdminCatalogRecord(item, search) && (!args.publisher || item.publisherName === args.publisher),
    );
    const pageSize = args.pageSize ?? 25;
    const pageCount = Math.ceil(filtered.length / pageSize);
    const pageNumber = Math.min(Math.max(1, Math.floor(args.pageNumber ?? 1) || 1), Math.max(1, pageCount));
    const first = (pageNumber - 1) * pageSize;
    return {
      page: filtered.slice(first, first + pageSize),
      pageNumber,
      pageSize,
      totalCount: filtered.length,
      catalogItemCount: rows.length,
      titleCount: new Set(filtered.map((item) => String(item.bookId || item.title))).size,
      publisherOptions: [...new Set(rows.map((item) => item.publisherName))]
        .filter((publisher): publisher is string => Boolean(publisher))
        .sort((left, right) => left.localeCompare(right)),
    };
  },
});

export const listAssignable = query({
  args: {
    catalogId: v.id("secretCatalogs"),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    if (!(await ctx.db.get(args.catalogId))) fail("CATALOG_NOT_FOUND");
    const search = normalizeDiscoveryQuery(args.search ?? "");
    if (search) {
      // Search the canonical Book Master index first, then expand only matching Books to Variants.
      const result = await ctx.db
        .query("books")
        .withSearchIndex("by_admin_search", (query) => query.search("adminSearchText", search))
        .paginate(args.paginationOpts);
      const page = [];
      for (const book of result.page) {
        const publisher = await ctx.db.get(book.publisherId);
        const variants = await ctx.db
          .query("bookVariants")
          .withIndex("by_book", (query) => query.eq("bookId", book._id))
          .collect();
        for (const variant of variants) {
          const row = await addableCatalogVariant(ctx, args.catalogId, variant, book, publisher, search);
          if (row) page.push(row);
        }
      }
      return { ...result, page };
    }
    const books = new Map<Id<"books">, Doc<"books"> | null>();
    const publishers = new Map<Id<"publishers">, Doc<"publishers"> | null>();
    const page = [];
    const result = await ctx.db.query("bookVariants").paginate(args.paginationOpts);
    for (const variant of result.page) {
      if (!books.has(variant.bookId)) books.set(variant.bookId, await ctx.db.get(variant.bookId));
      const book = books.get(variant.bookId);
      let publisher: Doc<"publishers"> | null | undefined = null;
      if (book) {
        if (!publishers.has(book.publisherId)) publishers.set(book.publisherId, await ctx.db.get(book.publisherId));
        publisher = publishers.get(book.publisherId);
      }
      const row = await addableCatalogVariant(ctx, args.catalogId, variant, book ?? null, publisher ?? null, search);
      if (row) page.push(row);
    }
    return { ...result, page };
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
    const user = await requirePermission(ctx, "catalog.manage");
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
    const book = await ctx.db.get(variant.bookId);
    const publisher = book ? await ctx.db.get(book.publisherId) : null;
    if (!eligibleCatalogReferences(variant, book, publisher)) {
      fail("VALIDATION_FAILED", "book variant is not eligible for this Catalog");
    }
    const now = Date.now();
    const itemId = await ctx.db.insert("catalogItems", {
      catalogId: args.catalogId,
      bookVariantId: args.bookVariantId,
      bookId: variant.bookId,
      priceOverrideAmount:
        args.priceOverrideAmount === undefined ? undefined : nonNegativeMoney(args.priceOverrideAmount),
      isAvailable: true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    await syncAdminCatalogTitle(ctx, args.catalogId, variant.bookId);
    await refreshAdminCatalogPreview(ctx, args.catalogId);
    await recordAudit(ctx, user._id, "catalog.item_added", "catalog", args.catalogId, {
      variantId: String(args.bookVariantId),
    });
    return itemId;
  },
});

export const remove = mutation({
  args: { catalogItemId: v.id("catalogItems") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const item = await ctx.db.get(args.catalogItemId);
    if (!item) fail("VALIDATION_FAILED", "catalog item does not exist");
    const orderItem = await ctx.db
      .query("orderItems")
      .withIndex("by_variant", (query) => query.eq("bookVariantId", item.bookVariantId))
      .filter((query) => query.eq(query.field("catalogItemId"), item._id))
      .first();
    if (orderItem) fail("ENTITY_IN_USE", "catalog item has order history");
    const variant = await ctx.db.get(item.bookVariantId);
    await ctx.db.delete(item._id);
    if (variant) await syncAdminCatalogTitle(ctx, item.catalogId, variant.bookId);
    await refreshAdminCatalogPreview(ctx, item.catalogId);
    await recordAudit(ctx, user._id, "catalog.item_removed", "catalog", item.catalogId, {
      variantId: String(item.bookVariantId),
    });
    return { removed: true };
  },
});

export const move = mutation({
  args: {
    catalogItemId: v.id("catalogItems"),
    direction: v.optional(v.union(v.literal("up"), v.literal("down"))),
    targetPosition: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const item = await ctx.db.get(args.catalogItemId);
    if (!item) fail("VALIDATION_FAILED", "catalog item does not exist");
    if ((args.direction === undefined) === (args.targetPosition === undefined)) {
      fail("VALIDATION_FAILED", "provide one reorder direction or destination position");
    }
    // ponytail: bounded 500-item reorder normalization; paginate/segment if a Catalog exceeds this ceiling.
    const items = sortCatalogItems(
      await ctx.db
        .query("catalogItems")
        .withIndex("by_catalog", (query) => query.eq("catalogId", item.catalogId))
        .take(500),
    );
    const currentIndex = items.findIndex((candidate) => candidate._id === item._id);
    if (currentIndex < 0) fail("VALIDATION_FAILED", "catalog item is outside the ordering window");
    if (
      args.targetPosition !== undefined &&
      (!Number.isInteger(args.targetPosition) || args.targetPosition < 0 || args.targetPosition >= items.length)
    ) {
      fail("VALIDATION_FAILED", "catalog item destination position is invalid");
    }
    const nextIndex = args.targetPosition ?? (args.direction === "up" ? currentIndex - 1 : currentIndex + 1);
    if (nextIndex < 0 || nextIndex >= items.length || nextIndex === currentIndex) {
      return { moved: false, position: currentIndex + 1 };
    }

    const reordered = [...items];
    if (args.targetPosition !== undefined) {
      const [movedItem] = reordered.splice(currentIndex, 1);
      reordered.splice(nextIndex, 0, movedItem);
    } else {
      [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
    }
    const now = Date.now();
    for (const [index, catalogItem] of reordered.entries()) {
      await ctx.db.patch(catalogItem._id, { sortOrder: index, updatedAt: now });
    }
    await refreshAdminCatalogPreview(ctx, item.catalogId);
    await recordAudit(ctx, user._id, "catalog.item_reordered", "catalog", item.catalogId, {
      direction: args.direction ?? "drag",
      position: String(nextIndex + 1),
      variantId: String(item.bookVariantId),
    });
    return { moved: true, position: nextIndex + 1 };
  },
});
