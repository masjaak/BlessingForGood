import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { IMAGE_CONTENT_TYPES, validateStoredFile, validateUploadedFile } from "./lib/storage";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { normalizedCategories, requiredText, slugify } from "./lib/validation";
import { bookPublicationStatusValidator } from "./validators";
import { insertBook } from "./lib/productDomain";
import { enforceRateLimit } from "./lib/rateLimit";
import { consumeClaim } from "./uploads";

const galleryLimit = 8;
const coverPresentationValidator = v.object({ zoom: v.number(), x: v.number(), y: v.number() });

function normalizeCoverPresentation(presentation?: { zoom: number; x: number; y: number }) {
  if (!presentation) return undefined;
  if (
    !Number.isFinite(presentation.zoom) ||
    presentation.zoom < 1 ||
    presentation.zoom > 4 ||
    !Number.isFinite(presentation.x) ||
    presentation.x < -50 ||
    presentation.x > 50 ||
    !Number.isFinite(presentation.y) ||
    presentation.y < -50 ||
    presentation.y > 50
  ) {
    fail("VALIDATION_FAILED", "cover presentation is outside the supported range");
  }
  return presentation;
}

function validateExternalPreviewUrl(value: string) {
  if (value.length > 2_048) fail("VALIDATION_FAILED", "external preview URL is too long");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("VALIDATION_FAILED", "external preview URL is invalid");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    fail("VALIDATION_FAILED", "external preview URL must be HTTPS without credentials");
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (privateHost) fail("VALIDATION_FAILED", "external preview URL points to a private destination");
  return parsed.toString();
}

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
    return insertBook(ctx, user._id, {
      publisherId: args.publisherId,
      title: args.title,
      slug: args.slug,
      author: args.author,
      description: args.description,
      categories: args.categories,
      coverImageUrl: args.coverImageUrl,
    });
  },
});

export const getForAdmin = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) return null;
    const [publisher, variants, gallery] = await Promise.all([
      ctx.db.get(book.publisherId),
      ctx.db
        .query("bookVariants")
        .withIndex("by_book", (query) => query.eq("bookId", book._id))
        .collect(),
      ctx.db
        .query("bookMedia")
        .withIndex("by_book_and_order", (query) => query.eq("bookId", book._id))
        .order("asc")
        .take(galleryLimit),
    ]);
    return {
      ...book,
      coverUrl: book.coverStorageId ? await ctx.storage.getUrl(book.coverStorageId) : (book.coverImageUrl ?? null),
      gallery: await Promise.all(
        gallery.map(async (media) => ({
          mediaId: media._id,
          storageId: media.storageId,
          displayOrder: media.displayOrder,
          altText: media.altText,
          url: await ctx.storage.getUrl(media.storageId),
        })),
      ),
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

export const generateCoverUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "books.manage");
    await enforceRateLimit(ctx, "bookUploadUser", String(user._id));
    fail("VALIDATION_FAILED", "use the validated upload endpoint");
  },
});

export const generateGalleryUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "books.manage");
    await enforceRateLimit(ctx, "bookUploadUser", String(user._id));
    fail("VALIDATION_FAILED", "use the validated upload endpoint");
  },
});

export const assertBookUploadAccess = internalQuery({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    return null;
  },
});

export const attachCover = action({
  args: {
    bookId: v.id("books"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    presentation: v.optional(coverPresentationValidator),
  },
  handler: async (ctx, args): Promise<{ storageId: Id<"_storage"> }> => {
    await ctx.runQuery(internal.books.assertBookUploadAccess, { bookId: args.bookId });
    await ctx.runQuery(internal.uploads.assertClaim, { storageId: args.storageId, purpose: "book-cover" });
    await validateUploadedFile(
      ctx,
      args.storageId,
      args.fileName,
      args.mimeType,
      IMAGE_CONTENT_TYPES,
      "cover must be a valid JPG, PNG, or WebP image up to 5 MB",
    );
    return ctx.runMutation(internal.books.attachCoverValidated, {
      bookId: args.bookId,
      storageId: args.storageId,
      presentation: args.presentation,
    });
  },
});

export const attachCoverValidated = internalMutation({
  args: { bookId: v.id("books"), storageId: v.id("_storage"), presentation: v.optional(coverPresentationValidator) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    await consumeClaim(ctx, args.storageId, "book-cover", user._id);
    await validateStoredFile(
      ctx,
      args.storageId,
      IMAGE_CONTENT_TYPES,
      "cover must be a JPG, PNG, or WebP image up to 5 MB",
    );
    const coverPresentation = normalizeCoverPresentation(args.presentation);
    const previousStorageId = book.coverStorageId;
    await ctx.db.patch(book._id, {
      coverStorageId: args.storageId,
      coverImageUrl: undefined,
      coverPresentation,
      updatedAt: Date.now(),
    });
    if (previousStorageId && previousStorageId !== args.storageId) await ctx.storage.delete(previousStorageId);
    await recordAudit(ctx, user._id, "book.cover_attached", "book", book._id);
    return { storageId: args.storageId };
  },
});

export const updateCoverPresentation = mutation({
  args: { bookId: v.id("books"), presentation: v.optional(coverPresentationValidator) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    if (!book.coverStorageId && !book.coverImageUrl) fail("VALIDATION_FAILED", "book has no cover to present");
    const coverPresentation = normalizeCoverPresentation(args.presentation);
    await ctx.db.patch(book._id, { coverPresentation, updatedAt: Date.now() });
    await recordAudit(ctx, user._id, "book.cover_presentation_updated", "book", book._id);
    return coverPresentation ?? null;
  },
});

export const attachGalleryImage = action({
  args: {
    bookId: v.id("books"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"bookMedia">> => {
    await ctx.runQuery(internal.books.assertBookUploadAccess, { bookId: args.bookId });
    await ctx.runQuery(internal.uploads.assertClaim, { storageId: args.storageId, purpose: "book-gallery" });
    await validateUploadedFile(
      ctx,
      args.storageId,
      args.fileName,
      args.mimeType,
      IMAGE_CONTENT_TYPES,
      "gallery image must be a valid JPG, PNG, or WebP image up to 5 MB",
    );
    return ctx.runMutation(internal.books.attachGalleryImageValidated, {
      bookId: args.bookId,
      storageId: args.storageId,
      altText: args.altText,
    });
  },
});

export const attachGalleryImageValidated = internalMutation({
  args: { bookId: v.id("books"), storageId: v.id("_storage"), altText: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    await consumeClaim(ctx, args.storageId, "book-gallery", user._id);
    if (book.publicationStatus === "archived") fail("VALIDATION_FAILED", "archived books cannot change media");
    const gallery = await ctx.db
      .query("bookMedia")
      .withIndex("by_book_and_order", (query) => query.eq("bookId", book._id))
      .order("asc")
      .take(galleryLimit + 1);
    if (gallery.length >= galleryLimit) fail("VALIDATION_FAILED", "a book can have at most 8 gallery images");
    await validateStoredFile(
      ctx,
      args.storageId,
      IMAGE_CONTENT_TYPES,
      "gallery image must be JPG, PNG, or WebP up to 5 MB",
    );
    const [sameStorage, coverStorage] = await Promise.all([
      ctx.db
        .query("bookMedia")
        .withIndex("by_storage_id", (query) => query.eq("storageId", args.storageId))
        .first(),
      ctx.db
        .query("books")
        .withIndex("by_cover_storage_id", (query) => query.eq("coverStorageId", args.storageId))
        .first(),
    ]);
    if (sameStorage || coverStorage || book.coverStorageId === args.storageId)
      fail("VALIDATION_FAILED", "storage reference is already attached to a product");
    const altText = (args.altText?.trim() || book.title).trim();
    if (altText.length > 160) fail("VALIDATION_FAILED", "gallery alt text is too long");
    const now = Date.now();
    const mediaId = await ctx.db.insert("bookMedia", {
      bookId: book._id,
      storageId: args.storageId,
      displayOrder: gallery.length,
      altText,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(book._id, { updatedAt: now });
    await recordAudit(ctx, user._id, "book.gallery_image_added", "bookMedia", mediaId);
    return mediaId;
  },
});

export const removeGalleryImage = mutation({
  args: { mediaId: v.id("bookMedia") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const media = await ctx.db.get(args.mediaId);
    if (!media) fail("VALIDATION_FAILED", "gallery image not found");
    const book = await ctx.db.get(media.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    if (book.publicationStatus === "archived") fail("VALIDATION_FAILED", "archived books cannot change media");
    await ctx.db.delete(media._id);
    const [otherMedia, coverStorage] = await Promise.all([
      ctx.db
        .query("bookMedia")
        .withIndex("by_storage_id", (query) => query.eq("storageId", media.storageId))
        .first(),
      ctx.db
        .query("books")
        .withIndex("by_cover_storage_id", (query) => query.eq("coverStorageId", media.storageId))
        .first(),
    ]);
    if (!otherMedia && !coverStorage) await ctx.storage.delete(media.storageId);
    const now = Date.now();
    await ctx.db.patch(book._id, { updatedAt: now });
    await recordAudit(ctx, user._id, "book.gallery_image_removed", "book", book._id);
    return { removed: true };
  },
});

export const moveGalleryImage = mutation({
  args: { mediaId: v.id("bookMedia"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const media = await ctx.db.get(args.mediaId);
    if (!media) fail("VALIDATION_FAILED", "gallery image not found");
    const book = await ctx.db.get(media.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    if (book.publicationStatus === "archived") fail("VALIDATION_FAILED", "archived books cannot change media");
    const gallery = await ctx.db
      .query("bookMedia")
      .withIndex("by_book_and_order", (query) => query.eq("bookId", book._id))
      .order("asc")
      .take(galleryLimit);
    const index = gallery.findIndex((item) => item._id === media._id);
    const swapIndex = args.direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= gallery.length) return media._id;
    const other = gallery[swapIndex];
    const now = Date.now();
    await ctx.db.patch(media._id, { displayOrder: other.displayOrder, updatedAt: now });
    await ctx.db.patch(other._id, { displayOrder: media.displayOrder, updatedAt: now });
    await ctx.db.patch(book._id, { updatedAt: now });
    await recordAudit(ctx, user._id, "book.gallery_image_reordered", "book", book._id);
    return media._id;
  },
});

export const updateExternalPreview = mutation({
  args: { bookId: v.id("books"), label: v.optional(v.string()), url: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    if (book.publicationStatus === "archived") fail("VALIDATION_FAILED", "archived books cannot change media");
    const url = args.url?.trim();
    const label = args.label?.trim();
    if (label && label.length > 120) fail("VALIDATION_FAILED", "external preview label is too long");
    const previewUrl = url ? validateExternalPreviewUrl(url) : undefined;
    const now = Date.now();
    await ctx.db.patch(book._id, {
      externalPreviewLabel: previewUrl ? label || "Pratinjau eksternal" : undefined,
      externalPreviewUrl: previewUrl,
      updatedAt: now,
    });
    await recordAudit(ctx, user._id, "book.external_preview_updated", "book", book._id);
    return { url: previewUrl ?? null };
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

export const remove = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const book = await ctx.db.get(args.bookId);
    if (!book) fail("BOOK_NOT_FOUND");
    const [variants, media] = await Promise.all([
      ctx.db
        .query("bookVariants")
        .withIndex("by_book", (query) => query.eq("bookId", book._id))
        .collect(),
      ctx.db
        .query("bookMedia")
        .withIndex("by_book_and_order", (query) => query.eq("bookId", book._id))
        .collect(),
    ]);

    const orderAdjustments = new Map<Id<"orders">, Doc<"orders">>();
    const removableItems = new Set<Id<"orderItems">>();
    for (const item of await ctx.db
      .query("orderItems")
      .withIndex("by_book", (query) => query.eq("bookId", book._id))
      .take(2000)) {
      const order = await ctx.db.get(item.orderId);
      if (!order) continue;
      const linkedInvoices = await ctx.db
        .query("invoiceItems")
        .withIndex("by_order_item", (query) => query.eq("orderItemId", item._id))
        .take(50);
      let preserveItem = order.status !== "submitted";
      for (const linkedInvoice of linkedInvoices) {
        const invoice = await ctx.db.get(linkedInvoice.invoiceId);
        if (!invoice || invoice.status === "void") continue;
        if (invoice.status !== "draft") {
          preserveItem = true;
          continue;
        }
        const confirmations = await ctx.db
          .query("paymentConfirmations")
          .withIndex("by_invoice", (query) => query.eq("invoiceId", invoice._id))
          .take(200);
        if (
          invoice.allocatedDepositAmount > 0 ||
          invoice.verifiedPaymentAmount > 0 ||
          confirmations.some(
            (confirmation) => confirmation.status === "submitted" || confirmation.status === "under_review",
          )
        ) {
          fail("ENTITY_IN_USE", "book has an unsettled invoice");
        }
        const now = Date.now();
        await ctx.db.patch(invoice._id, { status: "void", voidedAt: now, updatedAt: now });
        await recordAudit(ctx, user._id, "invoice.voided_for_book_delete", "invoice", invoice._id, {
          bookId: String(book._id),
        });
      }
      const exceptions = await ctx.db
        .query("orderExceptions")
        .withIndex("by_order_item", (query) => query.eq("orderItemId", item._id))
        .take(1);
      if (exceptions.length) preserveItem = true;
      const adjustments = await ctx.db
        .query("orderExceptionFinancialAdjustments")
        .withIndex("by_order_item", (query) => query.eq("orderItemId", item._id))
        .take(1);
      if (adjustments.length) preserveItem = true;
      if (preserveItem) continue;
      removableItems.add(item._id);
      orderAdjustments.set(order._id, order);
    }

    for (const variant of variants) {
      const reservations = await ctx.db
        .query("readyStockReservations")
        .withIndex("by_variant", (query) => query.eq("bookVariantId", variant._id))
        .take(200);
      for (const reservation of reservations) {
        if (reservation.status !== "active") continue;
        const inventory = await ctx.db
          .query("readyStockInventory")
          .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
          .unique();
        const reservedQuantity = inventory?.reservedQuantity ?? 0;
        if (!inventory || reservedQuantity < reservation.quantity) {
          fail("ENTITY_IN_USE", "book has an invalid active stock reservation");
        }
        await ctx.db.patch(inventory._id, {
          reservedQuantity: reservedQuantity - reservation.quantity,
          updatedAt: Date.now(),
          updatedByUserId: user._id,
        });
        await ctx.db.patch(reservation._id, {
          status: "released",
          releasedAt: Date.now(),
          updatedAt: Date.now(),
          changedByUserId: user._id,
        });
        await recordAudit(
          ctx,
          user._id,
          "ready_stock.reservation_released_for_book_delete",
          "readyStockReservation",
          reservation._id,
          {
            bookId: String(book._id),
          },
        );
      }
    }

    for (const itemId of removableItems) {
      const assignments = await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_order_item", (query) => query.eq("orderItemId", itemId))
        .take(200);
      for (const assignment of assignments) await ctx.db.delete(assignment._id);
      await ctx.db.delete(itemId);
    }
    for (const order of orderAdjustments.values()) {
      const remainingItems = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (query) => query.eq("orderId", order._id))
        .take(200);
      const total = remainingItems.reduce((sum, item) => sum + item.subtotalAmount, 0);
      if (!Number.isSafeInteger(total) || total < 0) fail("ENTITY_IN_USE", "book removal would corrupt order totals");
      const now = Date.now();
      if (!remainingItems.length) {
        await ctx.db.patch(order._id, {
          status: "cancelled",
          cancelledAt: order.cancelledAt ?? now,
          subtotalAmount: 0,
          totalAmount: 0,
          updatedAt: now,
        });
        await ctx.db.insert("orderStatusHistory", {
          orderId: order._id,
          fromStatus: order.status,
          toStatus: "cancelled",
          changedAt: now,
          changedByUserId: user._id,
          note: "Active item reconciled because its Book Master was deleted.",
        });
      } else {
        await ctx.db.patch(order._id, {
          subtotalAmount: total,
          totalAmount: total,
          updatedAt: now,
        });
      }
    }

    for (const variant of variants) {
      const catalogItems = await ctx.db
        .query("catalogItems")
        .withIndex("by_variant", (query) => query.eq("bookVariantId", variant._id))
        .take(500);
      for (const catalogItem of catalogItems) await ctx.db.delete(catalogItem._id);
      const inventory = await ctx.db
        .query("readyStockInventory")
        .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
        .unique();
      if (inventory) await ctx.db.delete(inventory._id);
    }
    const coverStorageId = book.coverStorageId;
    for (const image of media) {
      await ctx.db.delete(image._id);
      const [otherMedia, otherCover] = await Promise.all([
        ctx.db
          .query("bookMedia")
          .withIndex("by_storage_id", (query) => query.eq("storageId", image.storageId))
          .first(),
        ctx.db
          .query("books")
          .withIndex("by_cover_storage_id", (query) => query.eq("coverStorageId", image.storageId))
          .first(),
      ]);
      if (!otherMedia && !otherCover && image.storageId !== coverStorageId) await ctx.storage.delete(image.storageId);
    }
    for (const variant of variants) {
      const inventory = await ctx.db
        .query("readyStockInventory")
        .withIndex("by_book_variant_id", (query) => query.eq("bookVariantId", variant._id))
        .unique();
      if (inventory) await ctx.db.delete(inventory._id);
      await ctx.db.delete(variant._id);
    }
    await ctx.db.delete(book._id);
    if (coverStorageId) {
      const [otherCover, otherMedia] = await Promise.all([
        ctx.db
          .query("books")
          .withIndex("by_cover_storage_id", (query) => query.eq("coverStorageId", coverStorageId))
          .first(),
        ctx.db
          .query("bookMedia")
          .withIndex("by_storage_id", (query) => query.eq("storageId", coverStorageId))
          .first(),
      ]);
      if (!otherCover && !otherMedia) await ctx.storage.delete(coverStorageId);
    }
    await recordAudit(ctx, user._id, "book.deleted", "book", book._id);
    return { removed: true };
  },
});
