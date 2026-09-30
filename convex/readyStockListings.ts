import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { nonNegativeQuantity, positiveMoney, requiredText, slugify } from "./lib/validation";
import { bookFormatValidator } from "./validators";

const READY_STOCK_GALLERY_LIMIT = 8;
const listingStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"));
const sortValidator = v.union(v.literal("newest"), v.literal("title"), v.literal("price"));

function availableQuantity(listing: { quantity: number; reservedQuantity: number }) {
  return Math.max(0, listing.quantity - listing.reservedQuantity);
}

async function listingView(ctx: QueryCtx, listing: Doc<"readyStockListings">, includeMedia = false) {
  const gallery = includeMedia
    ? await ctx.db
        .query("readyStockListingMedia")
        .withIndex("by_listing_and_order", (q) => q.eq("listingId", listing._id))
        .order("asc")
        .take(READY_STOCK_GALLERY_LIMIT)
    : [];
  const coverUrl = listing.coverStorageId ? await ctx.storage.getUrl(listing.coverStorageId) : null;
  const galleryView = await Promise.all(
    gallery.map(async (media) => ({
      mediaId: media._id,
      displayOrder: media.displayOrder,
      altText: media.altText,
      url: await ctx.storage.getUrl(media.storageId),
    })),
  );
  return {
    listingId: listing._id,
    slug: listing.slug,
    title: listing.title,
    priceAmount: listing.priceAmount,
    format: listing.format,
    quantity: listing.quantity,
    reservedQuantity: listing.reservedQuantity,
    availableQuantity: availableQuantity(listing),
    status: listing.status,
    coverImageUrl: coverUrl,
    gallery: galleryView.filter((item) => Boolean(item.url)),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    format: v.optional(bookFormatValidator),
    sort: v.optional(sortValidator),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("readyStockListings")
      .withIndex("by_status_and_created_at", (q) => q.eq("status", "published"))
      .order("desc")
      .take(500);
    const search = args.search?.trim().toLowerCase() || "";
    const visible = rows.filter((listing) => {
      if (availableQuantity(listing) < 1) return false;
      if (args.format && listing.format !== args.format) return false;
      if (search && ![listing.title, listing.format].some((value) => value.toLowerCase().includes(search))) return false;
      return true;
    });
    visible.sort((a, b) => {
      if (args.sort === "title") return a.title.localeCompare(b.title);
      if (args.sort === "price") return a.priceAmount - b.priceAmount;
      return b.createdAt - a.createdAt;
    });
    const items = await Promise.all(visible.map((listing) => listingView(ctx, listing, false)));
    return {
      items,
      filters: {
        formats: [...new Set(rows.filter((row) => availableQuantity(row) > 0).map((row) => row.format))].sort(),
      },
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("readyStockListings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!listing || listing.status !== "published" || availableQuantity(listing) < 1) return null;
    return listingView(ctx, listing, true);
  },
});

export const listForSitemap = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("readyStockListings")
      .withIndex("by_status_and_created_at", (q) => q.eq("status", "published"))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.filter((listing) => availableQuantity(listing) > 0).map((listing) => ({ slug: listing.slug })),
    };
  },
});

export const listForAdmin = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(listingStatusValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    const rows = await ctx.db.query("readyStockListings").withIndex("by_created_at").order("desc").take(500);
    const search = args.search?.trim().toLowerCase() || "";
    const filtered = rows.filter((listing) => {
      if (args.status && listing.status !== args.status) return false;
      if (search && ![listing.title, listing.format].some((value) => value.toLowerCase().includes(search))) return false;
      return true;
    });
    return Promise.all(filtered.map((listing) => listingView(ctx, listing, false)));
  },
});

export const getForAdmin = query({
  args: { listingId: v.id("readyStockListings") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;
    return listingView(ctx, listing, true);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    priceAmount: v.number(),
    format: bookFormatValidator,
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const title = requiredText(args.title, "title");
    const priceAmount = positiveMoney(args.priceAmount);
    const quantity = nonNegativeQuantity(args.quantity);
    const baseSlug = slugify(title, "ready stock slug");
    let slug = baseSlug;
    let suffix = 2;
    while (
      await ctx.db.query("readyStockListings").withIndex("by_slug", (q) => q.eq("slug", slug)).first()
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }
    const now = Date.now();
    const listingId = await ctx.db.insert("readyStockListings", {
      slug,
      title,
      priceAmount,
      format: args.format,
      quantity,
      reservedQuantity: 0,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
      updatedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "ready_stock_listing.created", "readyStockListing", listingId);
    return { listingId, slug };
  },
});

export const update = mutation({
  args: {
    listingId: v.id("readyStockListings"),
    title: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
    format: v.optional(bookFormatValidator),
    quantity: v.optional(v.number()),
    status: v.optional(listingStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing) fail("VALIDATION_FAILED", "Ready Stock item tidak ditemukan");
    const title = args.title === undefined ? listing.title : requiredText(args.title, "title");
    const priceAmount = args.priceAmount === undefined ? listing.priceAmount : positiveMoney(args.priceAmount);
    const quantity = args.quantity === undefined ? listing.quantity : nonNegativeQuantity(args.quantity);
    if (quantity < listing.reservedQuantity) fail("READY_STOCK_ON_HAND_BELOW_RESERVED");
    const status = args.status ?? listing.status;
    if (status === "published") {
      if (!listing.coverStorageId) fail("VALIDATION_FAILED", "Cover wajib diunggah sebelum Ready Stock diterbitkan");
      if (quantity < 1) fail("VALIDATION_FAILED", "Qty Ready Stock harus lebih dari 0 sebelum diterbitkan");
    }
    if (status === "archived" && listing.reservedQuantity > 0) {
      fail("ENTITY_IN_USE", "Ready Stock masih memiliki pesanan aktif");
    }
    const now = Date.now();
    await ctx.db.patch(listing._id, {
      title,
      priceAmount,
      format: args.format ?? listing.format,
      quantity,
      status,
      updatedAt: now,
      updatedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "ready_stock_listing.updated", "readyStockListing", listing._id, {
      status,
      quantity: String(quantity),
      priceAmount: String(priceAmount),
    });
    return listingView(ctx, (await ctx.db.get(listing._id))!, true);
  },
});

