import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireActiveUser, requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { nextInvoiceNumber } from "./lib/invoiceNumbers";
import { notifyAdmins, notifyUser } from "./lib/notifications";
import { enforceRateLimit } from "./lib/rateLimit";
import { IMAGE_CONTENT_TYPES, validateStoredFile, validateUploadedFile } from "./lib/storage";
import { positiveQuantity, requiredText, slugify } from "./lib/validation";
import { bookFormatValidator } from "./validators";
import { consumeClaim } from "./uploads";

const GALLERY_LIMIT = 8;
const listingStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"));
const fulfillmentStageValidator = v.union(v.literal("packing"), v.literal("shipping"), v.literal("delivered"));
const sortValidator = v.union(v.literal("newest"), v.literal("title"), v.literal("price"));

type DataCtx = QueryCtx | MutationCtx;

function positiveMoney(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) fail("VALIDATION_FAILED", "harga harus Rupiah bulat lebih dari 0");
  return value;
}

function stockQuantity(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) fail("INVALID_STOCK_QUANTITY");
  return value;
}

async function uniqueSlug(ctx: MutationCtx, title: string, requested?: string, ignoreId?: Id<"readyStockListings">) {
  const base = slugify(requested?.trim() || title);
  if (!base) fail("VALIDATION_FAILED", "slug Ready Stock tidak valid");
  let slug = base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const existing = await ctx.db
      .query("readyStockListings")
      .withIndex("by_slug", (index) => index.eq("slug", slug))
      .unique();
    if (!existing || existing._id === ignoreId) return slug;
    slug = `${base}-${suffix}`;
  }
  fail("VALIDATION_FAILED", "slug Ready Stock tidak tersedia");
}

async function mediaView(ctx: DataCtx, listingId: Id<"readyStockListings">) {
  const media = await ctx.db
    .query("readyStockListingMedia")
    .withIndex("by_listing_and_order", (index) => index.eq("listingId", listingId))
    .order("asc")
    .take(GALLERY_LIMIT);
  return Promise.all(
    media.map(async (item) => ({
      mediaId: item._id,
      displayOrder: item.displayOrder,
      altText: item.altText,
      url: await ctx.storage.getUrl(item.storageId),
    })),
  );
}

async function listingView(ctx: DataCtx, listing: Doc<"readyStockListings">) {
  const availableQuantity = Math.max(0, listing.quantity - listing.reservedQuantity);
  return {
    listingId: listing._id,
    id: listing._id,
    slug: listing.slug,
    title: listing.title,
    priceAmount: listing.priceAmount,
    format: listing.format,
    quantity: listing.quantity,
    reservedQuantity: listing.reservedQuantity,
    availableQuantity,
    status: listing.status,
    coverUrl: listing.coverStorageId ? await ctx.storage.getUrl(listing.coverStorageId) : null,
    gallery: await mediaView(ctx, listing._id),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

function purchaseOperationalStatus(
  purchase: Doc<"readyStockPurchases">,
  invoice: Doc<"invoices"> | null,
) {
  if (purchase.status === "cancelled" || invoice?.status === "void") return "cancelled" as const;
  if (purchase.fulfillmentStage === "delivered") return "delivered" as const;
  if (purchase.fulfillmentStage === "shipping") return "shipping" as const;
  if (purchase.fulfillmentStage === "packing") return "packing" as const;
  if (invoice?.paymentStatus === "paid") return "payment_success" as const;
  if (invoice?.paymentStatus === "payment_submitted") return "verifying_payment" as const;
  return "waiting_payment" as const;
}

async function purchaseView(ctx: DataCtx, purchase: Doc<"readyStockPurchases">, includeCustomer: boolean) {
  const [invoice, customer, profile] = await Promise.all([
    purchase.invoiceId ? ctx.db.get(purchase.invoiceId) : Promise.resolve(null),
    includeCustomer ? ctx.db.get(purchase.customerUserId) : Promise.resolve(null),
    includeCustomer
      ? ctx.db
          .query("customerProfiles")
          .withIndex("by_user_id", (index) => index.eq("userId", purchase.customerUserId))
          .unique()
      : Promise.resolve(null),
  ]);
  return {
    purchaseId: purchase._id,
    listingId: purchase.listingId,
    customerUserId: purchase.customerUserId,
    customerName: includeCustomer
      ? profile?.displayName || customer?.displayNameSnapshot || customer?.emailSnapshot || "BFG customer"
      : null,
    customerEmail: includeCustomer ? customer?.emailSnapshot ?? null : null,
    memberCode: includeCustomer ? customer?.memberCode ?? null : null,
    invoiceId: purchase.invoiceId ?? null,
    invoiceNumber: invoice?.invoiceNumber ?? null,
    invoiceStatus: invoice?.status ?? null,
    paymentStatus: invoice?.paymentStatus ?? null,
    title: purchase.titleSnapshot,
    format: purchase.formatSnapshot,
    unitPriceAmount: purchase.unitPriceAmountSnapshot,
    quantity: purchase.quantity,
    subtotalAmount: purchase.subtotalAmount,
    status: purchase.status,
    fulfillmentStage: purchase.fulfillmentStage ?? null,
    operationalStatus: purchaseOperationalStatus(purchase, invoice),
    packedAt: purchase.packedAt ?? null,
    shippedAt: purchase.shippedAt ?? null,
    deliveredAt: purchase.deliveredAt ?? null,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    format: v.optional(bookFormatValidator),
    sort: v.optional(sortValidator),
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("readyStockListings")
      .withIndex("by_status", (index) => index.eq("status", "published"))
      .take(1000);
    const search = args.search?.trim().toLowerCase() ?? "";
    const filtered = listings.filter((listing) => {
      if (listing.quantity - listing.reservedQuantity <= 0) return false;
      if (args.format && listing.format !== args.format) return false;
      if (search && !listing.title.toLowerCase().includes(search)) return false;
      return true;
    });
    const sort = args.sort ?? "newest";
    filtered.sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, "id");
      if (sort === "price") return left.priceAmount - right.priceAmount || left.title.localeCompare(right.title, "id");
      return right.createdAt - left.createdAt;
    });
    const items = await Promise.all(filtered.map((listing) => listingView(ctx, listing)));
    return {
      items,
      filters: {
        formats: [...new Set(listings.map((listing) => listing.format))].sort(),
      },
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("readyStockListings")
      .withIndex("by_slug", (index) => index.eq("slug", args.slug))
      .unique();
    if (!listing || listing.status !== "published" || listing.quantity - listing.reservedQuantity <= 0) return null;
    return listingView(ctx, listing);
  },
});

export const listForSitemap = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("readyStockListings")
      .withIndex("by_status", (index) => index.eq("status", "published"))
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page
        .filter((listing) => listing.quantity - listing.reservedQuantity > 0)
        .map((listing) => ({ slug: listing.slug, updatedAt: listing.updatedAt })),
    };
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "books.manage");
    const listings = await ctx.db.query("readyStockListings").withIndex("by_created_at").order("desc").take(1000);
    return Promise.all(listings.map((listing) => listingView(ctx, listing)));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    priceAmount: v.number(),
    format: bookFormatValidator,
    quantity: v.number(),
    status: v.optional(listingStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const title = requiredText(args.title, "judul", 200);
    const priceAmount = positiveMoney(args.priceAmount);
    const quantity = stockQuantity(args.quantity);
    const status = args.status ?? "draft";
    if (status === "published" && quantity <= 0) fail("INVALID_STOCK_QUANTITY");
    const slug = await uniqueSlug(ctx, title);
    const now = Date.now();
    const listingId = await ctx.db.insert("readyStockListings", {
      title,
      slug,
      priceAmount,
      format: args.format,
      quantity,
      reservedQuantity: 0,
      status,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
      updatedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "ready_stock_manual.created", "readyStockListing", listingId);
    return listingView(ctx, (await ctx.db.get(listingId))!);
  },
});

export const update = mutation({
  args: {
    listingId: v.id("readyStockListings"),
    title: v.string(),
    priceAmount: v.number(),
    format: bookFormatValidator,
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status === "archived") fail("VALIDATION_FAILED", "Ready Stock tidak tersedia");
    const title = requiredText(args.title, "judul", 200);
    const priceAmount = positiveMoney(args.priceAmount);
    const quantity = stockQuantity(args.quantity);
    if (quantity < listing.reservedQuantity) fail("INVALID_STOCK_QUANTITY", "QTY tidak boleh di bawah stok yang sedang dipesan");
    const slug = title === listing.title ? listing.slug : await uniqueSlug(ctx, title, undefined, listing._id);
    await ctx.db.patch(listing._id, {
      title,
      slug,
      priceAmount,
      format: args.format,
      quantity,
      updatedAt: Date.now(),
      updatedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "ready_stock_manual.updated", "readyStockListing", listing._id);
    return listingView(ctx, (await ctx.db.get(listing._id))!);
  },
});

export const setPublicationStatus = mutation({
  args: { listingId: v.id("readyStockListings"), status: listingStatusValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing) fail("VALIDATION_FAILED", "Ready Stock tidak ditemukan");
    if (args.status === "published") {
      if (!listing.coverStorageId) fail("VALIDATION_FAILED", "Cover wajib diunggah sebelum Ready Stock diterbitkan");
      if (listing.quantity - listing.reservedQuantity <= 0) fail("INVALID_STOCK_QUANTITY");
    }
    await ctx.db.patch(listing._id, {
      status: args.status,
      updatedAt: Date.now(),
      updatedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "ready_stock_manual.status_changed", "readyStockListing", listing._id, {
      status: args.status,
    });
    return { status: args.status };
  },
});

export const assertUploadAccess = internalQuery({
  args: { listingId: v.id("readyStockListings") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.manage");
    if (!(await ctx.db.get(args.listingId))) fail("VALIDATION_FAILED", "Ready Stock tidak ditemukan");
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
    await ctx.runQuery(internal.readyStockManual.assertUploadAccess, { listingId: args.listingId });
    await ctx.runQuery(internal.uploads.assertClaim, { storageId: args.storageId, purpose: "ready-stock-cover" });
    await validateUploadedFile(
      ctx,
      args.storageId,
      args.fileName,
      args.mimeType,
      IMAGE_CONTENT_TYPES,
      "cover Ready Stock harus JPG, PNG, atau WebP maksimal 5 MB",
    );
    return ctx.runMutation(internal.readyStockManual.attachCoverValidated, {
      listingId: args.listingId,
      storageId: args.storageId,
    });
  },
});

export const attachCoverValidated = internalMutation({
  args: { listingId: v.id("readyStockListings"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing) fail("VALIDATION_FAILED", "Ready Stock tidak ditemukan");
    await consumeClaim(ctx, args.storageId, "ready-stock-cover", user._id);
    await validateStoredFile(ctx, args.storageId, IMAGE_CONTENT_TYPES, "cover Ready Stock tidak valid");
    const previous = listing.coverStorageId;
    await ctx.db.patch(listing._id, {
      coverStorageId: args.storageId,
      updatedAt: Date.now(),
      updatedByUserId: user._id,
    });
    if (previous && previous !== args.storageId) await ctx.storage.delete(previous);
    await recordAudit(ctx, user._id, "ready_stock_manual.cover_attached", "readyStockListing", listing._id);
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
    await ctx.runQuery(internal.readyStockManual.assertUploadAccess, { listingId: args.listingId });
    await ctx.runQuery(internal.uploads.assertClaim, { storageId: args.storageId, purpose: "ready-stock-gallery" });
    await validateUploadedFile(
      ctx,
      args.storageId,
      args.fileName,
      args.mimeType,
      IMAGE_CONTENT_TYPES,
      "gambar Ready Stock harus JPG, PNG, atau WebP maksimal 5 MB",
    );
    return ctx.runMutation(internal.readyStockManual.attachGalleryImageValidated, {
      listingId: args.listingId,
      storageId: args.storageId,
      altText: args.altText,
    });
  },
});

export const attachGalleryImageValidated = internalMutation({
  args: {
    listingId: v.id("readyStockListings"),
    storageId: v.id("_storage"),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const listing = await ctx.db.get(args.listingId);
    if (!listing) fail("VALIDATION_FAILED", "Ready Stock tidak ditemukan");
    await consumeClaim(ctx, args.storageId, "ready-stock-gallery", user._id);
    await validateStoredFile(ctx, args.storageId, IMAGE_CONTENT_TYPES, "gambar Ready Stock tidak valid");
    const media = await ctx.db
      .query("readyStockListingMedia")
      .withIndex("by_listing_and_order", (index) => index.eq("listingId", listing._id))
      .order("asc")
      .take(GALLERY_LIMIT + 1);
    if (media.length >= GALLERY_LIMIT) fail("VALIDATION_FAILED", "maksimal 8 gambar isi Ready Stock");
    const altText = (args.altText?.trim() || listing.title).slice(0, 160);
    const now = Date.now();
    const mediaId = await ctx.db.insert("readyStockListingMedia", {
      listingId: listing._id,
      storageId: args.storageId,
      displayOrder: media.length,
      altText,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(listing._id, { updatedAt: now, updatedByUserId: user._id });
    await recordAudit(ctx, user._id, "ready_stock_manual.gallery_added", "readyStockListingMedia", mediaId);
    return mediaId;
  },
});

export const removeGalleryImage = mutation({
  args: { mediaId: v.id("readyStockListingMedia") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const media = await ctx.db.get(args.mediaId);
    if (!media) fail("VALIDATION_FAILED", "gambar Ready Stock tidak ditemukan");
    await ctx.db.delete(media._id);
    await ctx.storage.delete(media.storageId);
    await recordAudit(ctx, user._id, "ready_stock_manual.gallery_removed", "readyStockListingMedia", media._id);
    return { removed: true };
  },
});

export const checkout = mutation({
  args: { listingId: v.id("readyStockListings"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    if (user.role !== "customer") fail("CUSTOMER_REQUIRED");
    await enforceRateLimit(ctx, "readyStockOrderUser", String(user._id));
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") fail("READY_STOCK_UNAVAILABLE");
    const quantity = positiveQuantity(args.quantity);
    const available = listing.quantity - listing.reservedQuantity;
    if (available < quantity) fail("READY_STOCK_UNAVAILABLE", available > 0 ? "Jumlah melebihi stok." : "Stok baru saja habis.");
    const subtotalAmount = listing.priceAmount * quantity;
    if (!Number.isSafeInteger(subtotalAmount)) fail("INVOICE_TOTAL_INVALID");
    const now = Date.now();

    const purchaseId = await ctx.db.insert("readyStockPurchases", {
      listingId: listing._id,
      customerUserId: user._id,
      titleSnapshot: listing.title,
      formatSnapshot: listing.format,
      unitPriceAmountSnapshot: listing.priceAmount,
      quantity,
      subtotalAmount,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const invoiceNumber = await nextInvoiceNumber(ctx, now);
    const invoiceId = await ctx.db.insert("invoices", {
      readyStockPurchaseId: purchaseId,
      customerUserId: user._id,
      invoiceNumber,
      status: "issued",
      currency: "IDR",
      subtotalAmount,
      totalAmount: subtotalAmount,
      adjustedTotalAmount: subtotalAmount,
      financialAdjustmentAmount: 0,
      depositRequirementMode: "none",
      depositRequiredAmount: 0,
      allocatedDepositAmount: 0,
      verifiedPaymentAmount: 0,
      outstandingAmount: subtotalAmount,
      overpaymentAmount: 0,
      refundObligationAmount: 0,
      refundObligationStatus: "none",
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now,
      issuedAt: now,
      createdByUserId: user._id,
    });

    await ctx.db.insert("invoiceItems", {
      invoiceId,
      readyStockPurchaseId: purchaseId,
      descriptionSnapshot: `${listing.title} · ${listing.format}`,
      bookTitleSnapshot: listing.title,
      formatSnapshot: listing.format,
      quantity,
      unitPriceAmountSnapshot: listing.priceAmount,
      subtotalAmount,
      createdAt: now,
    });

    await ctx.db.patch(purchaseId, { invoiceId, updatedAt: now });
    await ctx.db.patch(listing._id, {
      reservedQuantity: listing.reservedQuantity + quantity,
      updatedAt: now,
      updatedByUserId: user._id,
    });

    await recordAudit(ctx, user._id, "ready_stock_manual.checkout", "readyStockPurchase", purchaseId, {
      listingId: String(listing._id),
      quantity: String(quantity),
      invoiceId: String(invoiceId),
    });
    await notifyUser(ctx, user._id, {
      surface: "notification",
      eventType: "ready_stock.checkout",
      title: "Ready Stock berhasil di-checkout",
      body: "Tagihan Ready Stock sudah tersedia. Blessy menunggu pembayaranmu.",
      destination: `/account/invoices/${invoiceId}`,
      relatedEntityType: "readyStockPurchase",
      relatedEntityId: String(purchaseId),
    });
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "ready_stock.checkout",
      title: "Checkout Ready Stock baru",
      body: `${listing.title} dipesan sebanyak ${quantity}.`,
      destination: "/admin/ready-stock",
      relatedEntityType: "readyStockPurchase",
      relatedEntityId: String(purchaseId),
    });
    return {
      purchaseId,
      invoiceId,
      subtotalAmount,
      availableQuantity: available - quantity,
    };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const purchases = await ctx.db
      .query("readyStockPurchases")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerUserId", user._id))
      .order("desc")
      .take(200);
    return Promise.all(purchases.map((purchase) => purchaseView(ctx, purchase, false)));
  },
});

export const getMine = query({
  args: { purchaseId: v.id("readyStockPurchases") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) fail("ORDER_NOT_FOUND");
    await requireOwnedResource(ctx, purchase.customerUserId, "ORDER_ACCESS_DENIED");
    return purchaseView(ctx, purchase, false);
  },
});

export const listPurchasesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "orders.read.all");
    const purchases = await ctx.db.query("readyStockPurchases").withIndex("by_created_at").order("desc").take(500);
    return Promise.all(purchases.map((purchase) => purchaseView(ctx, purchase, true)));
  },
});

export const setFulfillmentStage = mutation({
  args: {
    purchaseId: v.id("readyStockPurchases"),
    stage: fulfillmentStageValidator,
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status !== "active") fail("ORDER_INVALID_STATE");
    const invoice = purchase.invoiceId ? await ctx.db.get(purchase.invoiceId) : null;
    if (!invoice || invoice.status === "void" || invoice.paymentStatus !== "paid") {
      fail("ORDER_INVALID_STATE", "Pembayaran harus lunas sebelum fulfillment Ready Stock");
    }
    const expected =
      !purchase.fulfillmentStage ? "packing" : purchase.fulfillmentStage === "packing" ? "shipping" : purchase.fulfillmentStage === "shipping" ? "delivered" : null;
    if (args.stage !== expected) fail("ORDER_INVALID_STATE", "Tahap Ready Stock harus diperbarui secara berurutan");
    const now = Date.now();
    const patch: Partial<Doc<"readyStockPurchases">> = {
      fulfillmentStage: args.stage,
      updatedAt: now,
    };
    if (args.stage === "packing") patch.packedAt = now;
    if (args.stage === "shipping") patch.shippedAt = now;
    if (args.stage === "delivered") {
      patch.deliveredAt = now;
      patch.status = "completed";
      const listing = await ctx.db.get(purchase.listingId);
      if (listing) {
        if (listing.reservedQuantity < purchase.quantity || listing.quantity < purchase.quantity) {
          fail("READY_STOCK_RESERVATION_NOT_FOUND");
        }
        await ctx.db.patch(listing._id, {
          quantity: listing.quantity - purchase.quantity,
          reservedQuantity: listing.reservedQuantity - purchase.quantity,
          updatedAt: now,
          updatedByUserId: user._id,
        });
      }
    }
    await ctx.db.patch(purchase._id, patch);
    await recordAudit(ctx, user._id, "ready_stock_manual.fulfillment_changed", "readyStockPurchase", purchase._id, {
      stage: args.stage,
    });
    await notifyUser(ctx, purchase.customerUserId, {
      surface: "notification",
      eventType: "ready_stock.fulfillment_changed",
      title:
        args.stage === "packing"
          ? "Paket sedang dikemas Blessy"
          : args.stage === "shipping"
            ? "Paket sedang diantar Blessy"
            : "Paket sampai",
      body: purchase.titleSnapshot,
      destination: "/account/orders",
      relatedEntityType: "readyStockPurchase",
      relatedEntityId: String(purchase._id),
    });
    return purchaseView(ctx, (await ctx.db.get(purchase._id))!, true);
  },
});

export const releasePurchaseForVoidedInvoice = internalMutation({
  args: { purchaseId: v.id("readyStockPurchases"), actorUserId: v.id("appUsers") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.status !== "active" || purchase.fulfillmentStage === "delivered") return false;
    const listing = await ctx.db.get(purchase.listingId);
    const now = Date.now();
    if (listing && listing.reservedQuantity >= purchase.quantity) {
      await ctx.db.patch(listing._id, {
        reservedQuantity: listing.reservedQuantity - purchase.quantity,
        updatedAt: now,
        updatedByUserId: args.actorUserId,
      });
    }
    await ctx.db.patch(purchase._id, { status: "cancelled", cancelledAt: now, updatedAt: now });
    return true;
  },
});
