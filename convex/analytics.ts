import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requirePermission } from "./lib/auth";

export type CartIntentEventType = "cart_item_added" | "cart_item_removed" | "cart_item_converted_to_order";

type CartIntentEventInput = {
  eventType: CartIntentEventType;
  customerUserId: Id<"appUsers">;
  cartId: Id<"carts">;
  cartItemId: Id<"cartItems">;
  catalogItemId?: Id<"catalogItems">;
  bookId?: Id<"books">;
  bookVariantId?: Id<"bookVariants">;
  bookTitle?: string;
  format?: string;
  quantity: number;
  orderId?: Id<"orders">;
  createdAt: number;
};

export async function recordCartIntentEvent(ctx: MutationCtx, event: CartIntentEventInput) {
  try {
    await ctx.db.insert("cartIntentEvents", event);
  } catch (error) {
    // Analytics is observational; a failed event must not roll back Cart or Order state.
    console.error("bfg_cart_intent_event_failed", {
      eventType: event.eventType,
      errorClass: error instanceof Error ? error.name : typeof error,
    });
  }
}

const periodDays = v.union(v.literal(7), v.literal(30), v.literal(90));
const MAX_ACTIVITY_ROWS = 100;
type BookFormat = Doc<"bookVariants">["format"];

type IntentAggregate = {
  cartId: Id<"carts">;
  cartItemId: Id<"cartItems"> | null;
  customerUserId: Id<"appUsers">;
  catalogItemId?: Id<"catalogItems">;
  bookId: Id<"books">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: string;
  quantity: number;
  startedAt: number;
  addActions: number;
};

type IntentState = IntentAggregate & {
  history: Doc<"cartIntentEvents">[];
  currentQuantity: number | null;
  status: "in_cart" | "converted" | "removed" | "unconverted";
  lastActivityAt: number;
};

type CurrentCartLine = {
  cartId: Id<"carts">;
  cartItemId: Id<"cartItems">;
  customerUserId: Id<"appUsers">;
  catalogItemId: Id<"catalogItems">;
  bookId: Id<"books">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: BookFormat;
  quantity: number;
  createdAt: number;
  updatedAt: number;
};

type CanonicalConversion = {
  cartId: Id<"carts">;
  customerUserId: Id<"appUsers">;
  orderId: Id<"orders">;
  orderItemId: Id<"orderItems">;
  catalogItemId?: Id<"catalogItems">;
  bookId: Id<"books">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: BookFormat;
  quantity: number;
  createdAt: number;
};

async function currentCartLines(ctx: QueryCtx): Promise<CurrentCartLine[]> {
  const [carts, cartItems, customers] = await Promise.all([
    ctx.db.query("carts").collect(),
    ctx.db.query("cartItems").collect(),
    ctx.db
      .query("appUsers")
      .withIndex("by_role_and_status", (index) => index.eq("role", "customer").eq("status", "active"))
      .collect(),
  ]);
  const cartsById = new Map(carts.map((cart) => [String(cart._id), cart]));
  const activeCustomerIds = new Set(customers.map((customer) => String(customer._id)));
  const lines = await Promise.all(
    cartItems.map(async (item) => {
      const cart = cartsById.get(String(item.cartId));
      if (!cart || !activeCustomerIds.has(String(cart.customerUserId))) return null;
      const catalogItem = await ctx.db.get(item.catalogItemId);
      const variant = catalogItem ? await ctx.db.get(catalogItem.bookVariantId) : null;
      const book = variant ? await ctx.db.get(variant.bookId) : null;
      if (!catalogItem || !variant || !book) return null;
      return {
        cartId: cart._id,
        cartItemId: item._id,
        customerUserId: cart.customerUserId,
        catalogItemId: catalogItem._id,
        bookId: book._id,
        bookVariantId: variant._id,
        bookTitle: book.title,
        format: variant.format,
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      } satisfies CurrentCartLine;
    }),
  );
  return lines.filter((line): line is CurrentCartLine => line !== null);
}

async function canonicalCartConversions(ctx: QueryCtx, from: number, to: number): Promise<CanonicalConversion[]> {
  const checkouts = (await ctx.db.query("cartCheckouts").collect()).filter(
    (checkout) => checkout.createdAt >= from && checkout.createdAt <= to,
  );
  const conversions = await Promise.all(
    checkouts.map(async (checkout) => {
      const order = await ctx.db.get(checkout.orderId);
      if (!order) return [];
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (index) => index.eq("orderId", order._id))
        .collect();
      return items.map(
        (item): CanonicalConversion => ({
          cartId: checkout.cartId,
          customerUserId: order.customerUserId,
          orderId: order._id,
          orderItemId: item._id,
          catalogItemId: item.catalogItemId,
          bookId: item.bookId,
          bookVariantId: item.bookVariantId,
          bookTitle: item.bookTitleSnapshot,
          format: item.formatSnapshot,
          quantity: item.quantity,
          createdAt: checkout.createdAt,
        }),
      );
    }),
  );
  return conversions.flat();
}

function latestEvent(events: Doc<"cartIntentEvents">[], type: CartIntentEventType) {
  return events.find((event) => event.eventType === type) ?? null;
}

function statusForIntent(
  history: Doc<"cartIntentEvents">[],
  currentQuantity: number | null,
  canonicalConverted: boolean,
): IntentState["status"] {
  if (canonicalConverted || latestEvent(history, "cart_item_converted_to_order")) return "converted";
  if (currentQuantity !== null) return "in_cart";
  if (latestEvent(history, "cart_item_removed")) return "removed";
  return "unconverted";
}

function matchesCanonicalConversion(intent: IntentAggregate, conversion: CanonicalConversion) {
  return (
    intent.cartId === conversion.cartId &&
    intent.customerUserId === conversion.customerUserId &&
    intent.bookVariantId === conversion.bookVariantId &&
    conversion.createdAt >= intent.startedAt &&
    (!intent.catalogItemId || !conversion.catalogItemId || intent.catalogItemId === conversion.catalogItemId)
  );
}

export const get = query({
  args: { days: periodDays },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const to = Date.now();
    const from = to - args.days * 24 * 60 * 60 * 1000;
    const [trackingStartEvent, currentLines, canonicalConversions] = await Promise.all([
      ctx.db.query("cartIntentEvents").withIndex("by_created_at").order("asc").first(),
      currentCartLines(ctx),
      canonicalCartConversions(ctx, from, to),
    ]);
    // ponytail: a bounded 90-day server-side scan keeps raw events out of the browser; add rollups when measured volume needs them.
    const events = await ctx.db
      .query("cartIntentEvents")
      .withIndex("by_created_at", (index) => index.gte("createdAt", from).lte("createdAt", to))
      .order("asc")
      .collect();
    const additions = events.filter(
      (
        event,
      ): event is typeof event & {
        bookId: Id<"books">;
        bookVariantId: Id<"bookVariants">;
        bookTitle: string;
        format: string;
      } =>
        event.eventType === "cart_item_added" &&
        Boolean(event.bookId && event.bookVariantId && event.bookTitle && event.format),
    );
    const aggregates = new Map<string, IntentAggregate>();
    for (const event of additions) {
      const key = String(event.cartItemId);
      const existing = aggregates.get(key);
      if (existing) {
        existing.addActions += 1;
        existing.quantity = event.quantity;
        continue;
      }
      aggregates.set(key, {
        cartId: event.cartId,
        cartItemId: event.cartItemId,
        customerUserId: event.customerUserId,
        catalogItemId: event.catalogItemId,
        bookId: event.bookId,
        bookVariantId: event.bookVariantId,
        bookTitle: event.bookTitle,
        format: event.format,
        quantity: event.quantity,
        startedAt: event.createdAt,
        addActions: 1,
      });
    }

    const currentLinesById = new Map(currentLines.map((line) => [String(line.cartItemId), line]));
    for (const line of currentLines) {
      const key = String(line.cartItemId);
      const existing = aggregates.get(key);
      if (existing) {
        existing.cartId = line.cartId;
        existing.catalogItemId = line.catalogItemId;
        existing.bookId = line.bookId;
        existing.bookVariantId = line.bookVariantId;
        existing.bookTitle = line.bookTitle;
        existing.format = line.format;
        existing.quantity = line.quantity;
        continue;
      }
      aggregates.set(key, {
        cartId: line.cartId,
        cartItemId: line.cartItemId,
        customerUserId: line.customerUserId,
        catalogItemId: line.catalogItemId,
        bookId: line.bookId,
        bookVariantId: line.bookVariantId,
        bookTitle: line.bookTitle,
        format: line.format,
        quantity: line.quantity,
        startedAt: line.createdAt,
        addActions: 0,
      });
    }

    for (const conversion of canonicalConversions) {
      const existing = [...aggregates.values()].find((intent) => matchesCanonicalConversion(intent, conversion));
      if (existing) continue;
      const key = `order:${String(conversion.orderId)}:${String(conversion.orderItemId)}`;
      aggregates.set(key, {
        cartId: conversion.cartId,
        cartItemId: null,
        customerUserId: conversion.customerUserId,
        catalogItemId: conversion.catalogItemId,
        bookId: conversion.bookId,
        bookVariantId: conversion.bookVariantId,
        bookTitle: conversion.bookTitle,
        format: conversion.format,
        quantity: conversion.quantity,
        startedAt: conversion.createdAt,
        addActions: 0,
      });
    }

    const intents: IntentState[] = await Promise.all(
      [...aggregates.values()].map(async (aggregate) => {
        const history = aggregate.cartItemId
          ? await ctx.db
              .query("cartIntentEvents")
              .withIndex("by_cart_item_id", (index) => index.eq("cartItemId", aggregate.cartItemId!))
              .order("desc")
              .collect()
          : [];
        const currentLine = aggregate.cartItemId ? currentLinesById.get(String(aggregate.cartItemId)) : undefined;
        const currentQuantity = currentLine?.quantity ?? null;
        const selectedPeriodEvents = history.filter((event) => event.createdAt >= from && event.createdAt <= to);
        const canonicalConversionAt = canonicalConversions
          .filter((conversion) => matchesCanonicalConversion(aggregate, conversion))
          .reduce((latest, conversion) => Math.max(latest, conversion.createdAt), 0);
        return {
          ...aggregate,
          history,
          currentQuantity,
          status: statusForIntent(history, currentQuantity, canonicalConversionAt > 0),
          lastActivityAt: Math.max(
            aggregate.startedAt,
            currentLine?.updatedAt ?? 0,
            canonicalConversionAt,
            ...selectedPeriodEvents.map((event) => event.createdAt),
          ),
        };
      }),
    );

    const historicalIntents = intents.filter((intent) => intent.addActions > 0);
    const convertedIntents = intents.filter((intent) => intent.status === "converted").length;
    const bookAggregates = new Map<
      string,
      {
        bookId: Id<"books">;
        bookVariantId: Id<"bookVariants">;
        bookTitle: string;
        format: string;
        addActions: number;
        customers: Set<string>;
        intentLines: number;
        convertedIntents: number;
      }
    >();
    for (const intent of historicalIntents) {
      const key = `${String(intent.bookId)}:${String(intent.bookVariantId)}`;
      const existing = bookAggregates.get(key);
      if (existing) {
        existing.addActions += intent.addActions;
        existing.customers.add(String(intent.customerUserId));
        existing.intentLines += 1;
        existing.convertedIntents += intent.status === "converted" ? 1 : 0;
      } else {
        bookAggregates.set(key, {
          bookId: intent.bookId,
          bookVariantId: intent.bookVariantId,
          bookTitle: intent.bookTitle,
          format: intent.format,
          addActions: intent.addActions,
          customers: new Set([String(intent.customerUserId)]),
          intentLines: 1,
          convertedIntents: intent.status === "converted" ? 1 : 0,
        });
      }
    }
    const books = [...bookAggregates.values()]
      .map((book) => ({
        bookId: book.bookId,
        bookVariantId: book.bookVariantId,
        bookTitle: book.bookTitle,
        format: book.format,
        addActions: book.addActions,
        customers: book.customers.size,
        convertedIntents: book.convertedIntents,
        conversionRate: book.intentLines ? book.convertedIntents / book.intentLines : 0,
      }))
      .sort((first, second) => second.addActions - first.addActions || first.bookTitle.localeCompare(second.bookTitle))
      .slice(0, MAX_ACTIVITY_ROWS);

    const customerAggregates = new Map<
      string,
      {
        customerUserId: Id<"appUsers">;
        itemCount: number;
        quantity: number;
        lastActivityAt: number;
        status: IntentState["status"];
        items: Array<{ title: string; quantity: number }>;
      }
    >();
    const statusPriority: Record<IntentState["status"], number> = {
      unconverted: 0,
      converted: 1,
      removed: 2,
      in_cart: 3,
    };
    for (const intent of intents) {
      const key = String(intent.customerUserId);
      const existing = customerAggregates.get(key);
      const quantity =
        intent.currentQuantity ??
        latestEvent(intent.history, "cart_item_converted_to_order")?.quantity ??
        latestEvent(intent.history, "cart_item_removed")?.quantity ??
        latestEvent(intent.history, "cart_item_added")?.quantity ??
        0;
      if (existing) {
        existing.itemCount += 1;
        existing.quantity += quantity;
        existing.lastActivityAt = Math.max(existing.lastActivityAt, intent.lastActivityAt);
        if (statusPriority[intent.status] > statusPriority[existing.status]) existing.status = intent.status;
        if (existing.items.length < 3) existing.items.push({ title: intent.bookTitle, quantity });
      } else {
        customerAggregates.set(key, {
          customerUserId: intent.customerUserId,
          itemCount: 1,
          quantity,
          lastActivityAt: intent.lastActivityAt,
          status: intent.status,
          items: [{ title: intent.bookTitle, quantity }],
        });
      }
    }
    const customers = (
      await Promise.all(
        [...customerAggregates.values()].map(async (aggregate) => {
          const user = await ctx.db.get(aggregate.customerUserId);
          if (!user) return null;
          return {
            customerId: user._id,
            name: user.displayNameSnapshot || "Customer BFG",
            memberCode: user.memberCode || null,
            itemCount: aggregate.itemCount,
            quantity: aggregate.quantity,
            lastActivityAt: aggregate.lastActivityAt,
            status: aggregate.status,
            items: aggregate.items,
          };
        }),
      )
    )
      .filter((customer): customer is NonNullable<typeof customer> => customer !== null)
      .sort((first, second) => second.lastActivityAt - first.lastActivityAt)
      .slice(0, MAX_ACTIVITY_ROWS);

    return {
      periodDays: args.days,
      from,
      to,
      trackingStartedAt: trackingStartEvent?.createdAt ?? null,
      metrics: {
        addActions: additions.length,
        interestedCustomers: new Set(additions.map((event) => String(event.customerUserId))).size,
        unconvertedIntents: historicalIntents.filter((intent) => intent.status !== "converted").length,
        convertedIntents,
      },
      books,
      customers,
      customerActivityTruncated: customerAggregates.size > MAX_ACTIVITY_ROWS,
    };
  },
});
