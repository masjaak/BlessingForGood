import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { eligibleReceivingBatches } from "../batches";
import { catalogIsOpen } from "./catalogView";

type DataCtx = QueryCtx | MutationCtx;

export type CartAvailability =
  | "active"
  | "catalog_closed"
  | "catalog_item_unavailable"
  | "variant_unavailable"
  | "book_unavailable"
  | "publisher_unavailable"
  | "po_closed"
  | "removed";

export type CartAvailabilityState = "active" | "unavailable" | "available_pending_acknowledgement";

export type CartCatalogResolution = {
  catalogItem: Doc<"catalogItems"> | null;
  catalog: Doc<"secretCatalogs"> | null;
  variant: Doc<"bookVariants"> | null;
  book: Doc<"books"> | null;
  publisher: Doc<"publishers"> | null;
  currentUnitPriceAmount: number | null;
  availability: CartAvailability;
};

export async function resolveCartCatalogItem(
  ctx: DataCtx,
  catalogItemId: Id<"catalogItems">,
): Promise<CartCatalogResolution> {
  const catalogItem = await ctx.db.get(catalogItemId);
  if (!catalogItem) return removedResolution();

  const [catalog, variant] = await Promise.all([
    ctx.db.get(catalogItem.catalogId),
    ctx.db.get(catalogItem.bookVariantId),
  ]);
  const currentUnitPriceAmount = variant ? (catalogItem.priceOverrideAmount ?? variant.priceAmount) : null;
  const book = variant ? await ctx.db.get(variant.bookId) : null;
  const publisher = book ? await ctx.db.get(book.publisherId) : null;
  if (!catalog || !variant) {
    return {
      catalogItem,
      catalog,
      variant,
      book,
      publisher,
      currentUnitPriceAmount,
      availability: "removed",
    };
  }
  if (!(await catalogIsOpen(ctx, catalog._id))) {
    return {
      catalogItem,
      catalog,
      variant,
      book,
      publisher,
      currentUnitPriceAmount,
      availability: "catalog_closed",
    };
  }
  if (!catalogItem.isAvailable) {
    return {
      catalogItem,
      catalog,
      variant,
      book,
      publisher,
      currentUnitPriceAmount,
      availability: "catalog_item_unavailable",
    };
  }

  if (!variant.isAvailable || !book) {
    return {
      catalogItem,
      catalog,
      variant,
      book,
      publisher,
      currentUnitPriceAmount,
      availability: "variant_unavailable",
    };
  }
  if (!book.isActive || (book.publicationStatus !== "published" && book.publicationStatus !== "special")) {
    return {
      catalogItem,
      catalog,
      variant,
      book,
      publisher,
      currentUnitPriceAmount,
      availability: "book_unavailable",
    };
  }

  if (!publisher) {
    return { catalogItem, catalog, variant, book, publisher, currentUnitPriceAmount, availability: "removed" };
  }
  if (!publisher.isActive) {
    return {
      catalogItem,
      catalog,
      variant,
      book,
      publisher,
      currentUnitPriceAmount,
      availability: "publisher_unavailable",
    };
  }

  const linkedBatch = await ctx.db
    .query("catalogBatchLinks")
    .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
    .first();
  if (linkedBatch && !(await eligibleReceivingBatches(ctx, catalog._id)).length) {
    return { catalogItem, catalog, variant, book, publisher, currentUnitPriceAmount, availability: "po_closed" };
  }
  return { catalogItem, catalog, variant, book, publisher, currentUnitPriceAmount, availability: "active" };
}

function removedResolution(): CartCatalogResolution {
  return {
    catalogItem: null,
    catalog: null,
    variant: null,
    book: null,
    publisher: null,
    currentUnitPriceAmount: null,
    availability: "removed",
  };
}

export function nextAvailabilityState(
  availability: CartAvailability,
  previous: CartAvailabilityState,
): CartAvailabilityState {
  if (availability === "active") {
    return previous === "unavailable" ? "available_pending_acknowledgement" : previous;
  }
  return "unavailable";
}

async function coverUrl(ctx: DataCtx, book: Doc<"books"> | null) {
  if (!book) return null;
  return book.coverStorageId ? await ctx.storage.getUrl(book.coverStorageId) : (book.coverImageUrl ?? null);
}

export async function projectCartLine(ctx: DataCtx, item: Doc<"cartItems">) {
  const resolved = await resolveCartCatalogItem(ctx, item.catalogItemId);
  const priceChanged =
    resolved.currentUnitPriceAmount !== null && item.observedUnitPriceAmount !== resolved.currentUnitPriceAmount;
  const checkoutEligible = resolved.availability === "active" && item.availabilityState === "active" && !priceChanged;
  return {
    id: item._id,
    catalogItemId: item.catalogItemId,
    bookId: resolved.book?._id ?? null,
    variantId: resolved.variant?._id ?? null,
    title: resolved.book?.title ?? null,
    publisherName: resolved.publisher?.name ?? null,
    format: resolved.variant?.format ?? null,
    isbn: resolved.variant?.isbn ?? null,
    coverImageUrl: await coverUrl(ctx, resolved.book),
    quantity: item.quantity,
    observedUnitPriceAmount: item.observedUnitPriceAmount,
    currentUnitPriceAmount: resolved.currentUnitPriceAmount,
    priceChanged,
    availability: resolved.availability,
    reconciliationState: item.availabilityState,
    requiresAcknowledgement: !checkoutEligible,
    checkoutEligible,
    subtotalAmount: checkoutEligible ? resolved.currentUnitPriceAmount! * item.quantity : 0,
  };
}

function projectCatalog(catalog: Doc<"secretCatalogs"> | null) {
  if (!catalog) return null;
  const status =
    catalog.status === "open" && catalog.closesAt && catalog.closesAt <= Date.now() ? "closed" : catalog.status;
  return {
    id: catalog._id,
    name: catalog.name,
    status,
    closingAt: catalog.closesAt ? new Date(catalog.closesAt).toISOString() : null,
    estimatedArrivalMonth: catalog.estimatedArrivalMonth ?? null,
  };
}

export async function projectCart(ctx: DataCtx, cart: Doc<"carts">) {
  const [catalog, items] = await Promise.all([
    cart.catalogId ? ctx.db.get(cart.catalogId) : null,
    ctx.db
      .query("cartItems")
      .withIndex("by_cart", (query) => query.eq("cartId", cart._id))
      .order("asc")
      .collect(),
  ]);
  // ponytail: Cart is intentionally small; hydrate each retained line directly until measured scale requires batching.
  const lines = await Promise.all(items.map((item) => projectCartLine(ctx, item)));
  const activeLines = lines.filter((line) => line.checkoutEligible);
  return {
    id: cart._id,
    catalogId: cart.catalogId ?? null,
    catalog: projectCatalog(catalog),
    lines,
    retainedLineCount: lines.length,
    retainedQuantity: lines.reduce((total, line) => total + line.quantity, 0),
    activeLineCount: activeLines.length,
    activeQuantity: activeLines.reduce((total, line) => total + line.quantity, 0),
    estimatedSubtotalAmount: activeLines.reduce((total, line) => total + line.subtotalAmount, 0),
  };
}

export function emptyCartView() {
  return {
    id: null,
    catalogId: null,
    catalog: null,
    lines: [],
    retainedLineCount: 0,
    retainedQuantity: 0,
    activeLineCount: 0,
    activeQuantity: 0,
    estimatedSubtotalAmount: 0,
  };
}
