import { R2 } from "@convex-dev/r2";
import type { ComponentApi } from "@convex-dev/r2/_generated/component.js";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { enforceRateLimit } from "./lib/rateLimit";
import { IMAGE_CONTENT_TYPES, MAX_STORED_FILE_BYTES, normalizeContentType, validateUploadedContent } from "./lib/storage";
import { publicMediaR2Enabled } from "./lib/publicMedia";

const r2 = new R2((components as unknown as { r2: ComponentApi<"r2"> }).r2);
const purpose = v.union(v.literal("cover"), v.literal("gallery"));
const targetArgs = {
  bookId: v.optional(v.id("books")),
  listingId: v.optional(v.id("readyStockListings")),
  purpose,
};
const imageError = "image must be a valid JPG, PNG, or WebP file up to 5 MB";

function entityKey(bookId?: Id<"books">, listingId?: Id<"readyStockListings">): string {
  if (Boolean(bookId) === Boolean(listingId)) fail("VALIDATION_FAILED", "choose one media target");
  return bookId ? `book/${bookId}` : `ready-stock/${listingId}`;
}
function mediaPrefix(ownerId: Id<"appUsers">, target: string, kind: "cover" | "gallery"): string {
  return `bfg-direct/${ownerId}/${target}/${kind}/`;
}
function ownsUpload(key: string, prefix: string): boolean {
  return key.startsWith(prefix) && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key.slice(prefix.length));
}

export const prepare = mutation({
  args: targetArgs,
  handler: async (ctx, args) => {
    if (!publicMediaR2Enabled()) fail("VALIDATION_FAILED", "R2 unavailable");
    const user = await requirePermission(ctx, "books.manage");
    const target = entityKey(args.bookId, args.listingId);
    const record = args.bookId ? await ctx.db.get(args.bookId) : await ctx.db.get(args.listingId!);
    if (!record || (("publicationStatus" in record && record.publicationStatus === "archived") || ("status" in record && record.status === "archived"))) {
      fail("VALIDATION_FAILED", "media target unavailable");
    }
    await enforceRateLimit(ctx, "bookUploadUser", String(user._id));
    const key = mediaPrefix(user._id, target, args.purpose) + crypto.randomUUID();
    return r2.generateUploadUrl(key);
  },
});

export const authorizeAttach = internalQuery({
  args: { ...targetArgs, key: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const target = entityKey(args.bookId, args.listingId);
    const record = args.bookId ? await ctx.db.get(args.bookId) : await ctx.db.get(args.listingId!);
    if (!record || (("publicationStatus" in record && record.publicationStatus === "archived") || ("status" in record && record.status === "archived"))) {
      fail("VALIDATION_FAILED", "media target unavailable");
    }
    if (!ownsUpload(args.key, mediaPrefix(user._id, target, args.purpose))) fail("VALIDATION_FAILED", "upload ownership mismatch");
    return { ownerId: user._id };
  },
});

async function boundedDownload(response: Response): Promise<Uint8Array> {
  const size = Number(response.headers.get("content-length"));
  if (Number.isFinite(size) && size > MAX_STORED_FILE_BYTES) fail("VALIDATION_FAILED", imageError);
  const reader = response.body?.getReader();
  if (!reader) fail("VALIDATION_FAILED", imageError);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_STORED_FILE_BYTES) {
        await reader.cancel();
        fail("VALIDATION_FAILED", imageError);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export const attach = action({
  args: {
    ...targetArgs,
    key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    await ctx.runQuery(internal.directPublicMedia.authorizeAttach, {
      bookId: args.bookId,
      listingId: args.listingId,
      purpose: args.purpose,
      key: args.key,
    });
    const signedGet = await r2.getUrl(args.key);
    const response = await fetch(signedGet);
    if (!response.ok) fail("VALIDATION_FAILED", "uploaded image was not found");
    const bytes = await boundedDownload(response);
    validateUploadedContent(
      args.fileName,
      args.mimeType,
      normalizeContentType(response.headers.get("content-type")),
      bytes.byteLength,
      bytes,
      IMAGE_CONTENT_TYPES,
      imageError,
    );
    await ctx.runMutation(internal.directPublicMedia.attachValidated, {
      bookId: args.bookId,
      listingId: args.listingId,
      purpose: args.purpose,
      key: args.key,
      altText: args.altText,
    });
    return args.key;
  },
});

export const attachValidated = internalMutation({
  args: { ...targetArgs, key: v.string(), altText: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const target = entityKey(args.bookId, args.listingId);
    if (!ownsUpload(args.key, mediaPrefix(user._id, target, args.purpose))) fail("VALIDATION_FAILED", "upload ownership mismatch");
    const now = Date.now();
    if (args.bookId) {
      const book = await ctx.db.get(args.bookId);
      if (!book || book.publicationStatus === "archived") fail("BOOK_NOT_FOUND");
      const gallery = await ctx.db.query("bookMedia").withIndex("by_book_and_order", q => q.eq("bookId", book._id)).take(9);
      if (book.coverR2Key === args.key || gallery.some(row => row.r2Key === args.key)) fail("VALIDATION_FAILED", "image already attached");
      if (args.purpose === "cover") {
        const oldId = book.coverStorageId;
        const oldKey = book.coverR2Key;
        await ctx.db.patch(book._id, { coverStorageId: undefined, coverR2Key: args.key, coverImageUrl: undefined, updatedAt: now });
        if (oldId) await ctx.storage.delete(oldId);
        if (oldKey) await r2.deleteObject(ctx, oldKey);
      } else {
        if (gallery.length >= 8) fail("VALIDATION_FAILED", "gallery full");
        const altText = (args.altText?.trim() || book.title).trim();
        if (altText.length > 160) fail("VALIDATION_FAILED", "gallery alt text too long");
        await ctx.db.insert("bookMedia", {
          bookId: book._id, r2Key: args.key, displayOrder: gallery.length, altText,
          createdAt: now, updatedAt: now, createdByUserId: user._id,
        });
        await ctx.db.patch(book._id, { updatedAt: now });
      }
    } else {
      const listing = await ctx.db.get(args.listingId!);
      if (!listing || listing.status === "archived") fail("VALIDATION_FAILED", "Ready Stock unavailable");
      const gallery = await ctx.db.query("readyStockListingMedia").withIndex("by_listing_and_order", q => q.eq("listingId", listing._id)).take(9);
      if (listing.coverR2Key === args.key || gallery.some(row => row.r2Key === args.key)) fail("VALIDATION_FAILED", "image already attached");
      if (args.purpose === "cover") {
        const oldId = listing.coverStorageId;
        const oldKey = listing.coverR2Key;
        await ctx.db.patch(listing._id, { coverStorageId: undefined, coverR2Key: args.key, updatedAt: now, updatedByUserId: user._id });
        if (oldId) await ctx.storage.delete(oldId);
        if (oldKey) await r2.deleteObject(ctx, oldKey);
      } else {
        if (gallery.length >= 8) fail("VALIDATION_FAILED", "gallery full");
        await ctx.db.insert("readyStockListingMedia", {
          listingId: listing._id, r2Key: args.key,
          displayOrder: (gallery.at(-1)?.displayOrder ?? -1) + 1,
          altText: (args.altText?.trim() || listing.title).slice(0, 160),
          createdAt: now, updatedAt: now, createdByUserId: user._id,
        });
        await ctx.db.patch(listing._id, { updatedAt: now, updatedByUserId: user._id });
      }
    }
  },
});
