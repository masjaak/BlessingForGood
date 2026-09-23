import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireActiveCatalogGrant } from "./lib/catalogAccess";
import { requireActiveCustomer } from "./lib/auth";
import { recordCartIntentEvent } from "./analytics";
import {
  emptyCartSummary,
  emptyCartView,
  nextAvailabilityState,
  projectCart,
  projectCartSummary,
  resolveCartCatalogItem,
} from "./lib/cartProjection";
import { fail } from "./lib/errors";

function cartQuantity(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) fail("INVALID_QUANTITY");
  return value;
}

function mergedQuantity(current: number, added: number): number {
  const next = current + added;
  if (!Number.isSafeInteger(next)) fail("INVALID_QUANTITY");
  return next;
}

async function findCart(ctx: Parameters<typeof requireActiveCustomer>[0], customerUserId: Id<"appUsers">) {
  return ctx.db
    .query("carts")
    .withIndex("by_customer_user_id", (query) => query.eq("customerUserId", customerUserId))
    .unique();
}

async function ownedLine(
  ctx: Parameters<typeof requireActiveCustomer>[0],
  customerUserId: Id<"appUsers">,
  id: Id<"cartItems">,
) {
  const item = await ctx.db.get(id);
  const cart = item ? await ctx.db.get(item.cartId) : null;
  if (!item || !cart || cart.customerUserId !== customerUserId) fail("CART_ITEM_NOT_FOUND");
  return { cart, item };
}

function assertAddable(availability: Awaited<ReturnType<typeof resolveCartCatalogItem>>["availability"]) {
  if (availability === "catalog_closed") fail("CATALOG_NOT_OPEN");
  if (availability === "po_closed") fail("NO_ELIGIBLE_BATCH");
  if (availability !== "active")
    fail("CART_LINE_UNAVAILABLE", "Cart item is not currently available", { availability });
}

function cartIntentMetadata(resolved: Awaited<ReturnType<typeof resolveCartCatalogItem>>) {
  return {
    bookId: resolved.book?._id,
    bookVariantId: resolved.variant?._id,
    bookTitle: resolved.book?.title,
    format: resolved.variant?.format,
  };
}

async function clearCatalogCheckout(ctx: MutationCtx, cartId: Id<"carts">, catalogId: Id<"secretCatalogs">) {
  const checkout = await ctx.db
    .query("cartCheckouts")
    .withIndex("by_cart_and_catalog", (query) => query.eq("cartId", cartId).eq("catalogId", catalogId))
    .first();
  if (checkout) await ctx.db.delete(checkout._id);
}

export async function clearUnsubmittedCatalogItems(
  ctx: MutationCtx,
  catalogId: Id<"secretCatalogs">,
  now = Date.now(),
) {
  const catalogItems = await ctx.db
    .query("catalogItems")
    .withIndex("by_catalog", (query) => query.eq("catalogId", catalogId))
    .collect();
  const removedCartIds = new Set<Id<"carts">>();

  for (const catalogItem of catalogItems) {
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_catalog_item", (query) => query.eq("catalogItemId", catalogItem._id))
      .collect();
    for (const item of cartItems) {
      const cart = await ctx.db.get(item.cartId);
      if (!cart) continue;
      const resolved = await resolveCartCatalogItem(ctx, item.catalogItemId, catalogItem, {
        skipCatalogStateChecks: true,
      });
      await recordCartIntentEvent(ctx, {
        eventType: "cart_item_removed",
        customerUserId: cart.customerUserId,
        cartId: cart._id,
        cartItemId: item._id,
        catalogItemId: item.catalogItemId,
        ...cartIntentMetadata(resolved),
        quantity: item.quantity,
        createdAt: now,
      });
      await ctx.db.delete(item._id);
      removedCartIds.add(cart._id);
    }
  }

  for (const cartId of removedCartIds) {
    const cart = await ctx.db.get(cartId);
    if (!cart) continue;
    const remaining = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (query) => query.eq("cartId", cart._id))
      .first();
    await ctx.db.patch(cart._id, { catalogId: remaining ? cart.catalogId : undefined, updatedAt: now });
  }
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveCustomer(ctx);
    const cart = await findCart(ctx, user._id);
    return cart ? projectCart(ctx, cart) : emptyCartView();
  },
});

export const getMineSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveCustomer(ctx);
    const cart = await findCart(ctx, user._id);
    return cart ? projectCartSummary(ctx, cart) : emptyCartSummary();
  },
});

export const addItem = mutation({
  args: {
    catalogItemId: v.id("catalogItems"),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveCustomer(ctx);
    const quantity = cartQuantity(args.quantity ?? 1);
    const resolved = await resolveCartCatalogItem(ctx, args.catalogItemId);
    if (!resolved.catalogItem || !resolved.catalog) fail("CART_ITEM_NOT_FOUND");
    if (resolved.availability === "catalog_closed") fail("CATALOG_NOT_OPEN");
    await requireActiveCatalogGrant(ctx, user._id, resolved.catalog._id);
    assertAddable(resolved.availability);
    if (resolved.currentUnitPriceAmount === null) fail("CART_ITEM_NOT_FOUND");

    let cart = await findCart(ctx, user._id);
    const now = Date.now();
    if (!cart) {
      const cartId = await ctx.db.insert("carts", {
        customerUserId: user._id,
        catalogId: resolved.catalog._id,
        createdAt: now,
        updatedAt: now,
      });
      cart = await ctx.db.get(cartId);
    } else if (!cart.catalogId) {
      await ctx.db.patch(cart._id, { catalogId: resolved.catalog._id, updatedAt: now });
      cart = await ctx.db.get(cart._id);
    }
    if (!cart) fail("CART_ITEM_NOT_FOUND");

    await clearCatalogCheckout(ctx, cart._id, resolved.catalog._id);

    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_cart_and_catalog_item", (query) =>
        query.eq("cartId", cart!._id).eq("catalogItemId", args.catalogItemId),
      )
      .unique();
    let cartItemId: Id<"cartItems">;
    if (existing) {
      await ctx.db.patch(existing._id, { quantity: mergedQuantity(existing.quantity, quantity), updatedAt: now });
      cartItemId = existing._id;
    } else {
      cartItemId = await ctx.db.insert("cartItems", {
        cartId: cart._id,
        catalogItemId: args.catalogItemId,
        quantity,
        observedUnitPriceAmount: resolved.currentUnitPriceAmount,
        availabilityState: "active",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(cart._id, { lastCheckout: undefined, updatedAt: now });
    await recordCartIntentEvent(ctx, {
      eventType: "cart_item_added",
      customerUserId: user._id,
      cartId: cart._id,
      cartItemId,
      catalogItemId: args.catalogItemId,
      ...cartIntentMetadata(resolved),
      quantity,
      createdAt: now,
    });
    return projectCart(ctx, (await ctx.db.get(cart._id))!);
  },
});

export const updateQuantity = mutation({
  args: { cartItemId: v.id("cartItems"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireActiveCustomer(ctx);
    const quantity = cartQuantity(args.quantity);
    const { cart, item } = await ownedLine(ctx, user._id, args.cartItemId);
    await ctx.db.patch(item._id, { quantity, updatedAt: Date.now() });
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
    return projectCart(ctx, (await ctx.db.get(cart._id))!);
  },
});

export const removeItem = mutation({
  args: { cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    const user = await requireActiveCustomer(ctx);
    const { cart, item } = await ownedLine(ctx, user._id, args.cartItemId);
    const now = Date.now();
    await recordCartIntentEvent(ctx, {
      eventType: "cart_item_removed",
      customerUserId: user._id,
      cartId: cart._id,
      cartItemId: item._id,
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
      createdAt: now,
    });
    await ctx.db.delete(item._id);
    const remaining = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (query) => query.eq("cartId", cart._id))
      .first();
    await ctx.db.patch(cart._id, { catalogId: remaining ? cart.catalogId : undefined, updatedAt: now });
    return projectCart(ctx, (await ctx.db.get(cart._id))!);
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveCustomer(ctx);
    const cart = await findCart(ctx, user._id);
    if (!cart) return emptyCartView();
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (query) => query.eq("cartId", cart._id))
      .collect();
    const now = Date.now();
    for (const item of items) {
      await recordCartIntentEvent(ctx, {
        eventType: "cart_item_removed",
        customerUserId: user._id,
        cartId: cart._id,
        cartItemId: item._id,
        catalogItemId: item.catalogItemId,
        quantity: item.quantity,
        createdAt: now,
      });
      await ctx.db.delete(item._id);
    }
    const checkouts = await ctx.db
      .query("cartCheckouts")
      .withIndex("by_cart_and_catalog", (query) => query.eq("cartId", cart._id))
      .collect();
    for (const checkout of checkouts) await ctx.db.delete(checkout._id);
    await ctx.db.patch(cart._id, { catalogId: undefined, lastCheckout: undefined, updatedAt: now });
    return projectCart(ctx, (await ctx.db.get(cart._id))!);
  },
});

export const reconcile = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveCustomer(ctx);
    const cart = await findCart(ctx, user._id);
    if (!cart) return emptyCartView();
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (query) => query.eq("cartId", cart._id))
      .collect();
    for (const item of items) {
      const resolved = await resolveCartCatalogItem(ctx, item.catalogItemId);
      const availabilityState = nextAvailabilityState(resolved.availability, item.availabilityState);
      if (availabilityState !== item.availabilityState) {
        await ctx.db.patch(item._id, { availabilityState, updatedAt: Date.now() });
      }
    }
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
    return projectCart(ctx, (await ctx.db.get(cart._id))!);
  },
});

export const acknowledgeCurrentLineState = mutation({
  args: { cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    const user = await requireActiveCustomer(ctx);
    const { cart, item } = await ownedLine(ctx, user._id, args.cartItemId);
    const resolved = await resolveCartCatalogItem(ctx, item.catalogItemId);
    if (resolved.availability !== "active" || !resolved.catalog || resolved.currentUnitPriceAmount === null) {
      fail("CART_LINE_UNAVAILABLE", "Cart item is not currently available", { availability: resolved.availability });
    }
    await requireActiveCatalogGrant(ctx, user._id, resolved.catalog._id);
    const now = Date.now();
    await ctx.db.patch(item._id, {
      observedUnitPriceAmount: resolved.currentUnitPriceAmount,
      availabilityState: "active",
      updatedAt: now,
    });
    await ctx.db.patch(cart._id, { updatedAt: now });
    return projectCart(ctx, (await ctx.db.get(cart._id))!);
  },
});
