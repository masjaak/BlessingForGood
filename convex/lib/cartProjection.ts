import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { eligibleReceivingBatches } from "../batches";
import { hasActiveCatalogGrant } from "./catalogAccess";
import { catalogIsOpen } from "./catalogView";

type DataCtx = QueryCtx | MutationCtx;
type CartGroupAccessState = "granted" | "revoked" | "unresolved";
type CartGroupBlockedReason =
  Exclude<CartAvailability, "active"> | "access_revoked" | "price_changed" | "acknowledgement_required";

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

type CartCatalogResolutionOptions = {
  skipCatalogStateChecks?: boolean;
};

export async function resolveCartCatalogItem(
  ctx: DataCtx,
  catalogItemId: Id<"catalogItems">,
  knownCatalogItem?: Doc<"catalogItems"> | null,
  options?: CartCatalogResolutionOptions,
): Promise<CartCatalogResolution> {
  const catalogItem = knownCatalogItem === undefined ? await ctx.db.get(catalogItemId) : knownCatalogItem;
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
  if (!options?.skipCatalogStateChecks && !(await catalogIsOpen(ctx, catalog._id))) {
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

  if (!options?.skipCatalogStateChecks) {
    const linkedBatch = await ctx.db
      .query("catalogBatchLinks")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
      .first();
    if (linkedBatch && !(await eligibleReceivingBatches(ctx, catalog._id)).length) {
      return { catalogItem, catalog, variant, book, publisher, currentUnitPriceAmount, availability: "po_closed" };
    }
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
  return projectResolvedCartLine(ctx, item, resolved, "granted");
}

export async function projectCartSummary(ctx: DataCtx, cart: Doc<"carts">) {
  const items = await ctx.db
    .query("cartItems")
    .withIndex("by_cart", (query) => query.eq("cartId", cart._id))
    .collect();
  return {
    id: cart._id,
    retainedLineCount: items.length,
    retainedQuantity: items.reduce((total, item) => total + item.quantity, 0),
  };
}

async function projectResolvedCartLine(
  ctx: DataCtx,
  item: Doc<"cartItems">,
  resolved: CartCatalogResolution,
  accessState: CartGroupAccessState,
) {
  const canPresentCatalogLine = accessState === "granted";
  const priceChanged =
    canPresentCatalogLine &&
    resolved.currentUnitPriceAmount !== null &&
    item.observedUnitPriceAmount !== resolved.currentUnitPriceAmount;
  const checkoutEligible =
    canPresentCatalogLine && resolved.availability === "active" && item.availabilityState === "active" && !priceChanged;
  return {
    id: item._id,
    catalogItemId: item.catalogItemId,
    bookId: canPresentCatalogLine ? (resolved.book?._id ?? null) : null,
    variantId: canPresentCatalogLine ? (resolved.variant?._id ?? null) : null,
    title: canPresentCatalogLine ? (resolved.book?.title ?? null) : null,
    publisherName: canPresentCatalogLine ? (resolved.publisher?.name ?? null) : null,
    format: canPresentCatalogLine ? (resolved.variant?.format ?? null) : null,
    isbn: canPresentCatalogLine ? (resolved.variant?.isbn ?? null) : null,
    coverImageUrl: canPresentCatalogLine ? await coverUrl(ctx, resolved.book) : null,
    quantity: item.quantity,
    observedUnitPriceAmount: item.observedUnitPriceAmount,
    currentUnitPriceAmount: canPresentCatalogLine ? resolved.currentUnitPriceAmount : null,
    priceChanged,
    availability: canPresentCatalogLine ? resolved.availability : "removed",
    reconciliationState: canPresentCatalogLine ? item.availabilityState : "unavailable",
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

function catalogGroupId(resolved: CartCatalogResolution): Id<"secretCatalogs"> | null {
  return resolved.catalog?._id ?? resolved.catalogItem?.catalogId ?? null;
}

function groupBlockedReason(group: {
  accessState: CartGroupAccessState;
  catalog: ReturnType<typeof projectCatalog>;
  lines: Array<{ availability: CartAvailability; priceChanged: boolean; reconciliationState: CartAvailabilityState }>;
}): CartGroupBlockedReason | null {
  if (group.catalog?.status === "closed") return "catalog_closed";
  if (group.accessState === "revoked") return "access_revoked";
  if (group.accessState === "unresolved") return "removed";
  const unavailableLine = group.lines.find((line) => line.availability !== "active");
  if (unavailableLine && unavailableLine.availability !== "active") return unavailableLine.availability;
  if (group.lines.some((line) => line.priceChanged)) return "price_changed";
  if (group.lines.some((line) => line.reconciliationState !== "active")) return "acknowledgement_required";
  return null;
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
  const resolvedItems = await Promise.all(
    items.map(async (item) => ({
      item,
      resolved: await resolveCartCatalogItem(ctx, item.catalogItemId),
    })),
  );
  const groupAccess = new Map<string, CartGroupAccessState>();
  for (const { resolved } of resolvedItems) {
    const id = catalogGroupId(resolved);
    const key = id ? String(id) : "unresolved";
    if (!groupAccess.has(key)) {
      groupAccess.set(
        key,
        id && resolved.catalog
          ? (await hasActiveCatalogGrant(ctx, cart.customerUserId, id))
            ? "granted"
            : "revoked"
          : "unresolved",
      );
    }
  }
  const projectedItems = await Promise.all(
    resolvedItems.map(async ({ item, resolved }) => {
      const id = catalogGroupId(resolved);
      const key = id ? String(id) : "unresolved";
      return {
        item,
        resolved,
        line: await projectResolvedCartLine(ctx, item, resolved, groupAccess.get(key) || "unresolved"),
      };
    }),
  );
  const lines = projectedItems.map(({ line }) => line);
  const activeLines = lines.filter((line) => line.checkoutEligible);
  const groups = new Map<
    string,
    {
      id: Id<"secretCatalogs"> | null;
      catalog: ReturnType<typeof projectCatalog>;
      accessState: CartGroupAccessState;
      lines: typeof lines;
    }
  >();
  projectedItems.forEach(({ resolved, line }) => {
    const id = catalogGroupId(resolved);
    const key = id ? String(id) : "unresolved";
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(line);
      return;
    }
    groups.set(key, {
      id,
      catalog: projectCatalog(resolved.catalog),
      accessState: groupAccess.get(key) || "unresolved",
      lines: [line],
    });
  });
  const groupViews = Array.from(groups.values()).map((group) => {
    const activeGroupLines = group.lines.filter((line) => line.checkoutEligible);
    return {
      id: group.id,
      catalog: group.catalog,
      accessState: group.accessState,
      lines: group.lines,
      retainedLineCount: group.lines.length,
      retainedQuantity: group.lines.reduce((total, line) => total + line.quantity, 0),
      activeLineCount: activeGroupLines.length,
      activeQuantity: activeGroupLines.reduce((total, line) => total + line.quantity, 0),
      activeSubtotalAmount: activeGroupLines.reduce((total, line) => total + line.subtotalAmount, 0),
      checkoutEligible: group.lines.length > 0 && activeGroupLines.length === group.lines.length,
      blockedReason: groupBlockedReason(group),
    };
  });
  return {
    id: cart._id,
    catalogId: cart.catalogId ?? null,
    catalog: projectCatalog(catalog),
    catalogConsistency: !lines.length
      ? "empty"
      : groupViews.length === 1 && groupViews[0].id === cart.catalogId
        ? "consistent"
        : cart.catalogId
          ? "legacy_mismatch"
          : "legacy_missing",
    lines,
    groups: groupViews,
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
    catalogConsistency: "empty",
    lines: [],
    groups: [],
    retainedLineCount: 0,
    retainedQuantity: 0,
    activeLineCount: 0,
    activeQuantity: 0,
    estimatedSubtotalAmount: 0,
  };
}

export function emptyCartSummary() {
  return { id: null, retainedLineCount: 0, retainedQuantity: 0 };
}
