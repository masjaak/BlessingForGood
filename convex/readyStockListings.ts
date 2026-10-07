import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { recordAudit } from "./lib/audit";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { IMAGE_CONTENT_TYPES, validateStoredFile, validateUploadedFile } from "./lib/storage";
import { deletePublicMedia, publicMediaUrl, storePublicMedia } from "./lib/publicMedia";
import { consumeClaim } from "./uploads";
import { nonNegativeQuantity, positiveMoney, requiredText, slugify } from "./lib/validation";
import { bookFormatValidator } from "./validators";

const READY_STOCK_GALLERY_LIMIT = 8;
const listingStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"));
const sortValidator = v.union(v.literal("newest"), v.literal("title"), v.literal("price"));

function optionalDescription(value: string | undefined) {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length > 2000) fail("VALIDATION_FAILED", "description is too long");
  return normalized || undefined;
}

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
  const coverUrl = await publicMediaUrl(ctx, listing.coverStorageId, listing.coverR2Key);
  const galleryView = await Promise.all(
    gallery.map(async (media) => ({
      mediaId: media._id,
      displayOrder: media.displayOrder,
      altText: media.altText,
      url: await publicMediaUrl(ctx, media.storageId, media.r2Key),
    })),
  );
  return {
    listingId: listing._id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description ?? null,
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
      if (search && ![listing.title, listing.format].some((value) => value.toLowerCase().includes(search)))
        return false;
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
      if (search && ![listing.title, listing.format].some((value) => value.toLowerCase().includes(search)))
        return false;
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
    description: v.optional(v.string()),
    priceAmount: v.number(),
    format: bookFormatValidator,
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const title = requiredText(args.title, "title");
    const description = optionalDescription(args.description);
    const priceAmount = positiveMoney(args.priceAmount);
    const quantity = nonNegativeQuantity(args.quantity);
    const baseSlug = slugify(title, "ready stock slug");
    let slug = baseSlug;
    let suffix = 2;
    while (
      await ctx.db
        .query("readyStockListings")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first()
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }
    const now = Date.now();
    const listingId = await ctx.db.insert("readyStockListings", {
      slug,
      title,
      description,
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
    description: v.optional(v.string()),
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
    const description = args.description === undefined ? listing.description : optionalDescription(args.description);
    const priceAmount = args.priceAmount === undefined ? listing.priceAmount : positiveMoney(args.priceAmount);
    const quantity = args.quantity === undefined ? listing.quantity : nonNegativeQuantity(args.quantity);
    if (quantity < listing.reservedQuantity) fail("READY_STOCK_ON_HAND_BELOW_RESERVED");
    const status = args.status ?? listing.status;
    if (status === "published") {
      if (!listing.coverStorageId && !listing.coverR2Key)
        fail("VALIDATION_FAILED", "Cover wajib diunggah sebelum Ready Stock diterbitkan");
      if (quantity < 1) fail("VALIDATION_FAILED", "Qty Ready Stock harus lebih dari 0 sebelum diterbitkan");
    }
    if (status === "archived" && listing.reservedQuantity > 0) {
      fail("ENTITY_IN_USE", "Ready Stock masih memiliki pesanan aktif");
    }
    const now = Date.now();
    await ctx.db.patch(listing._id, {
      title,
      description,
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

export const assertUploadAccess = internalQuery({
  args: { listingId: v.id("readyStockListings") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status === "archived") fail("VALIDATION_FAILED", "Ready Stock item tidak tersedia");
    return null;
  },
});

export const attachCover = action({
  args: {
    listingId: v.id("readyStockListings"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args): Promise<{ storageId: Id<"_storage"> }> => {
    try {
      await ctx.runQuery(internal.readyStockListings.assertUploadAccess, { listingId: args.listingId });
      await ctx.runQuery(internal.uploads.assertClaim, { storageId: args.storageId, purpose: "book-cover" });
      await validateUploadedFile(
        ctx,
        args.storageId,
        args.fileName,
        args.mimeType,
        IMAGE_CONTENT_TYPES,
        "cover must be a valid JPG, PNG, or WebP image up to 5 MB",
      );
      const blob = await ctx.storage.get(args.storageId);
      const r2Key = blob ? await storePublicMedia(ctx, blob, args.mimeType) : null;
      try {
        return await ctx.runMutation(internal.readyStockListings.attachCoverValidated, {
          listingId: args.listingId,
          storageId: args.storageId,
          r2Key: r2Key ?? undefined,
        });
      } catch (error) {
        if (r2Key) await deletePublicMedia(ctx, undefined, r2Key);
        throw error;
      }
    } catch (error) {
      await ctx
        .runMutation(internal.uploads.disposeClaimedUpload, {
          storageId: args.storageId,
          purpose: "book-cover",
        })
        .catch(() => undefined);
      throw error;
    }
  },
});

export const attachCoverValidated = internalMutation({
  args: {
    listingId: v.id("readyStockListings"),
    storageId: v.id("_storage"),
    r2Key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status === "archived") fail("VALIDATION_FAILED", "Ready Stock item tidak tersedia");
    await consumeClaim(ctx, args.storageId, "book-cover", user._id);
    await validateStoredFile(
      ctx,
      args.storageId,
      IMAGE_CONTENT_TYPES,
      "cover must be a JPG, PNG, or WebP image up to 5 MB",
    );
    const previousStorageId = listing.coverStorageId;
    const previousR2Key = listing.coverR2Key;
    await ctx.db.patch(listing._id, {
      coverStorageId: args.r2Key ? undefined : args.storageId,
      coverR2Key: args.r2Key,
      updatedAt: Date.now(),
      updatedByUserId: user._id,
    });
    if (args.r2Key) await ctx.storage.delete(args.storageId);
    if (previousStorageId !== args.storageId || previousR2Key !== args.r2Key) {
      await deletePublicMedia(ctx, previousStorageId, previousR2Key);
    }
    await recordAudit(ctx, user._id, "ready_stock_listing.cover_attached", "readyStockListing", listing._id);
    return { storageId: args.storageId };
  },
});

export const attachGalleryImage = action({
  args: {
    listingId: v.id("readyStockListings"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"readyStockListingMedia">> => {
    try {
      await ctx.runQuery(internal.readyStockListings.assertUploadAccess, { listingId: args.listingId });
      await ctx.runQuery(internal.uploads.assertClaim, { storageId: args.storageId, purpose: "book-gallery" });
      await validateUploadedFile(
        ctx,
        args.storageId,
        args.fileName,
        args.mimeType,
        IMAGE_CONTENT_TYPES,
        "gallery image must be a valid JPG, PNG, or WebP image up to 5 MB",
      );
      const blob = await ctx.storage.get(args.storageId);
      const r2Key = blob ? await storePublicMedia(ctx, blob, args.mimeType) : null;
      try {
        return await ctx.runMutation(internal.readyStockListings.attachGalleryImageValidated, {
          listingId: args.listingId,
          storageId: args.storageId,
          r2Key: r2Key ?? undefined,
          altText: args.altText,
        });
      } catch (error) {
        if (r2Key) await deletePublicMedia(ctx, undefined, r2Key);
        throw error;
      }
    } catch (error) {
      await ctx
        .runMutation(internal.uploads.disposeClaimedUpload, {
          storageId: args.storageId,
          purpose: "book-gallery",
        })
        .catch(() => undefined);
      throw error;
    }
  },
});

export const attachGalleryImageValidated = internalMutation({
  args: {
    listingId: v.id("readyStockListings"),
    storageId: v.id("_storage"),
    r2Key: v.optional(v.string()),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status === "archived") fail("VALIDATION_FAILED", "Ready Stock item tidak tersedia");
    const gallery = await ctx.db
      .query("readyStockListingMedia")
      .withIndex("by_listing_and_order", (q) => q.eq("listingId", listing._id))
      .order("asc")
      .take(READY_STOCK_GALLERY_LIMIT + 1);
    if (gallery.length >= READY_STOCK_GALLERY_LIMIT) {
      fail("VALIDATION_FAILED", `Ready Stock maksimal memiliki ${READY_STOCK_GALLERY_LIMIT} gambar isi`);
    }
    await validateStoredFile(
      ctx,
      args.storageId,
      IMAGE_CONTENT_TYPES,
      "gallery image must be JPG, PNG, or WebP up to 5 MB",
    );
    if (listing.coverStorageId === args.storageId) fail("VALIDATION_FAILED", "storage reference is already attached");
    const duplicate = await ctx.db
      .query("readyStockListingMedia")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    if (duplicate) fail("VALIDATION_FAILED", "storage reference is already attached");
    await consumeClaim(ctx, args.storageId, "book-gallery", user._id);
    const now = Date.now();
    const mediaId = await ctx.db.insert("readyStockListingMedia", {
      listingId: listing._id,
      storageId: args.r2Key ? undefined : args.storageId,
      r2Key: args.r2Key,
      displayOrder: (gallery.at(-1)?.displayOrder ?? -1) + 1,
      altText: (args.altText?.trim() || listing.title).slice(0, 160),
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
    if (args.r2Key) await ctx.storage.delete(args.storageId);
    await ctx.db.patch(listing._id, { updatedAt: now, updatedByUserId: user._id });
    await recordAudit(ctx, user._id, "ready_stock_listing.gallery_added", "readyStockListingMedia", mediaId);
    return mediaId;
  },
});

export const removeGalleryImage = mutation({
  args: { mediaId: v.id("readyStockListingMedia") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const media = await ctx.db.get(args.mediaId);
    if (!media) fail("VALIDATION_FAILED", "Gambar Ready Stock tidak ditemukan");
    await ctx.db.delete(media._id);
    if (media.storageId) {
      const stillUsed = await ctx.db
        .query("readyStockListingMedia")
        .withIndex("by_storage_id", (q) => q.eq("storageId", media.storageId))
        .first();
      if (!stillUsed) await ctx.storage.delete(media.storageId);
    }
    if (media.r2Key) await deletePublicMedia(ctx, undefined, media.r2Key);
    await recordAudit(ctx, user._id, "ready_stock_listing.gallery_removed", "readyStockListing", media.listingId);
    return { removed: true };
  },
});

export const moveGalleryImage = mutation({
  args: { mediaId: v.id("readyStockListingMedia"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const media = await ctx.db.get(args.mediaId);
    if (!media) fail("VALIDATION_FAILED", "Gambar Ready Stock tidak ditemukan");
    const gallery = await ctx.db
      .query("readyStockListingMedia")
      .withIndex("by_listing_and_order", (q) => q.eq("listingId", media.listingId))
      .order("asc")
      .take(READY_STOCK_GALLERY_LIMIT);
    const index = gallery.findIndex((item) => item._id === media._id);
    const swapIndex = args.direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= gallery.length) return media._id;
    const other = gallery[swapIndex];
    const now = Date.now();
    await ctx.db.patch(media._id, { displayOrder: other.displayOrder, updatedAt: now });
    await ctx.db.patch(other._id, { displayOrder: media.displayOrder, updatedAt: now });
    await recordAudit(ctx, user._id, "ready_stock_listing.gallery_reordered", "readyStockListing", media.listingId);
    return media._id;
  },
});
