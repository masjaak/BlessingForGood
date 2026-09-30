import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
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
