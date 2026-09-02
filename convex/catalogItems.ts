import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requirePermission } from "./lib/auth";
import { nonNegativeMoney } from "./lib/validation";
import { recordAudit } from "./lib/audit";
import { sortCatalogItems } from "./lib/catalogOrdering";

export const listForCatalog = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    // ponytail: bounded 500-item Admin tracking projection; paginate when a Catalog exceeds 500 items.
    const items = sortCatalogItems(
      await ctx.db
        .query("catalogItems")
        .withIndex("by_catalog", (query) => query.eq("catalogId", args.catalogId))
        .take(500),
    );
    return Promise.all(
      items.map(async (item) => {
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
        };
      }),
    );
  },
});

export const listAssignable = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    if (!(await ctx.db.get(args.catalogId))) fail("CATALOG_NOT_FOUND");
    const assigned = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (query) => query.eq("catalogId", args.catalogId))
      .take(500);
    const assignedIds = new Set(assigned.map((item) => String(item.bookVariantId)));
    const variants = await ctx.db.query("bookVariants").take(500);
    return (
      await Promise.all(
        variants
          .filter((variant) => variant.isAvailable && !assignedIds.has(String(variant._id)))
          .map(async (variant) => {
            const book = await ctx.db.get(variant.bookId);
            const publisher = book ? await ctx.db.get(book.publisherId) : null;
            if (
              !book ||
              !book.isActive ||
              book.publicationStatus === "draft" ||
              book.publicationStatus === "archived"
            ) {
              return null;
            }
            return {
              variantId: variant._id,
              bookId: book._id,
              title: book.title,
              publisherName: publisher?.name ?? null,
              author: book.author ?? null,
              format: variant.format,
              isbn: variant.isbn,
              priceAmount: variant.priceAmount,
            };
          }),
      )
    ).filter((item) => item !== null);
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
    const now = Date.now();
    const itemId = await ctx.db.insert("catalogItems", {
      catalogId: args.catalogId,
      bookVariantId: args.bookVariantId,
      priceOverrideAmount:
        args.priceOverrideAmount === undefined ? undefined : nonNegativeMoney(args.priceOverrideAmount),
      isAvailable: true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
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
    await ctx.db.delete(item._id);
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
    await recordAudit(ctx, user._id, "catalog.item_reordered", "catalog", item.catalogId, {
      direction: args.direction ?? "drag",
      position: String(nextIndex + 1),
      variantId: String(item.bookVariantId),
    });
    return { moved: true, position: nextIndex + 1 };
  },
});
