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
const MAX_BOOK_ROWS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
type BookFormat = Doc<"bookVariants">["format"];
type IntentStatus = "in_cart" | "converted" | "removed" | "unconverted";
type CartIntentEvent = Doc<"cartIntentEvents">;

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

type IntentDraft = {
  key: string;
  cartId: Id<"carts">;
  cartItemId: Id<"cartItems"> | null;
  customerUserId: Id<"appUsers">;
  catalogItemId?: Id<"catalogItems">;
  bookId: Id<"books">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: string;
  quantity: number;
  firstSeenAt: number;
  currentQuantity: number | null;
  currentUpdatedAt: number;
  history: CartIntentEvent[];
  convertedAt: number | null;
};

type KnownCartIntent = Omit<IntentDraft, "convertedAt"> & {
  convertedAt: number | null;
  status: IntentStatus;
  lastActivityAt: number;
};

type StatusCounts = Record<IntentStatus, number>;

type TrendBucket = {
  startAt: number;
  endAt: number;
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
  const checkouts = await ctx.db
    .query("cartCheckouts")
    .withIndex("by_created_at", (index) => index.gte("createdAt", from).lte("createdAt", to))
    .order("asc")
    .collect();
  const conversions = await Promise.all(
    checkouts.map(async (checkout) => {
      const order = await ctx.db.get(checkout.orderId);
      if (!order) return [];
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (index) => index.eq("orderId", order._id))
        .collect();
      return items.map((item): CanonicalConversion => ({
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
      }));
    }),
  );
  const seen = new Set<string>();
  return conversions.flat().filter((conversion) => {
    const key = String(conversion.orderItemId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAddEvent(event: CartIntentEvent): event is CartIntentEvent & {
  eventType: "cart_item_added";
  bookId: Id<"books">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: string;
} {
  return (
    event.eventType === "cart_item_added" &&
    Boolean(event.bookId && event.bookVariantId && event.bookTitle && event.format)
  );
}

function latestEventAt(events: CartIntentEvent[], type: CartIntentEventType) {
  return events.reduce((latest, event) => {
    return event.eventType === type ? Math.max(latest, event.createdAt) : latest;
  }, 0);
}

function statusForIntent(intent: IntentDraft): IntentStatus {
  if (intent.convertedAt !== null) return "converted";
  if (intent.currentQuantity !== null) return "in_cart";
  if (latestEventAt(intent.history, "cart_item_removed") > latestEventAt(intent.history, "cart_item_added")) {
    return "removed";
  }
  return "unconverted";
}

function sameCommerceLine(intent: IntentDraft, conversion: CanonicalConversion) {
  return (
    String(intent.cartId) === String(conversion.cartId) &&
    String(intent.customerUserId) === String(conversion.customerUserId) &&
    String(intent.bookVariantId) === String(conversion.bookVariantId) &&
    conversion.createdAt >= intent.firstSeenAt &&
    (!intent.catalogItemId ||
      !conversion.catalogItemId ||
      String(intent.catalogItemId) === String(conversion.catalogItemId))
  );
}

function matchesCanonicalConversion(intent: IntentDraft, conversion: CanonicalConversion) {
  const eventMatch = intent.history.some(
    (event) =>
      event.eventType === "cart_item_converted_to_order" &&
      event.orderId &&
      String(event.orderId) === String(conversion.orderId) &&
      event.bookVariantId &&
      String(event.bookVariantId) === String(conversion.bookVariantId),
  );
  return eventMatch || sameCommerceLine(intent, conversion);
}

function emptyStatusCounts(): StatusCounts {
  return { in_cart: 0, converted: 0, removed: 0, unconverted: 0 };
}

function trendBuckets(days: 7 | 30 | 90, from: number, to: number): TrendBucket[] {
  const size = days === 90 ? 7 * DAY_MS : DAY_MS;
  return Array.from({ length: Math.ceil((to - from) / size) }, (_, index) => {
    const startAt = from + index * size;
    return { startAt, endAt: Math.min(startAt + size, to) };
  });
}

function inBucket(timestamp: number, bucket: TrendBucket, isLast: boolean) {
  return timestamp >= bucket.startAt && (timestamp < bucket.endAt || (isLast && timestamp <= bucket.endAt));
}

export const get = query({
  args: { days: periodDays },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const to = Date.now();
    const from = to - args.days * DAY_MS;
    const [trackingStartEvent, currentLines, canonicalConversions, events] = await Promise.all([
      ctx.db.query("cartIntentEvents").withIndex("by_created_at").order("asc").first(),
      currentCartLines(ctx),
      canonicalCartConversions(ctx, from, to),
      ctx.db
        .query("cartIntentEvents")
        .withIndex("by_created_at", (index) => index.gte("createdAt", from).lte("createdAt", to))
        .order("asc")
        .collect(),
    ]);

    // KnownCartIntent identity is the persisted cartItemId; remove/re-add creates a new cycle.
    // firstSeenAt uses the earliest real add event, falling back to cartItem.createdAt for legacy lines.
    const drafts = new Map<string, IntentDraft>();
    for (const event of events.filter(isAddEvent)) {
      const key = String(event.cartItemId);
      const draftKey = `line:${key}`;
      const existing = drafts.get(draftKey);
      if (existing) {
        existing.firstSeenAt = Math.min(existing.firstSeenAt, event.createdAt);
        existing.quantity = event.quantity;
        continue;
      }
      drafts.set(draftKey, {
        key: draftKey,
        cartId: event.cartId,
        cartItemId: event.cartItemId,
        customerUserId: event.customerUserId,
        catalogItemId: event.catalogItemId,
        bookId: event.bookId,
        bookVariantId: event.bookVariantId,
        bookTitle: event.bookTitle,
        format: event.format,
        quantity: event.quantity,
        firstSeenAt: event.createdAt,
        currentQuantity: null,
        currentUpdatedAt: 0,
        history: [],
        convertedAt: null,
      });
    }

    for (const line of currentLines) {
      const key = String(line.cartItemId);
      const draftKey = `line:${key}`;
      const existing = drafts.get(draftKey);
      if (existing) {
        existing.cartId = line.cartId;
        existing.catalogItemId = line.catalogItemId;
        existing.bookId = line.bookId;
        existing.bookVariantId = line.bookVariantId;
        existing.bookTitle = line.bookTitle;
        existing.format = line.format;
        existing.quantity = line.quantity;
        existing.firstSeenAt = Math.min(existing.firstSeenAt, line.createdAt);
        existing.currentQuantity = line.quantity;
        existing.currentUpdatedAt = line.updatedAt;
        continue;
      }
      drafts.set(draftKey, {
        key: draftKey,
        cartId: line.cartId,
        cartItemId: line.cartItemId,
        customerUserId: line.customerUserId,
        catalogItemId: line.catalogItemId,
        bookId: line.bookId,
        bookVariantId: line.bookVariantId,
        bookTitle: line.bookTitle,
        format: line.format,
        quantity: line.quantity,
        firstSeenAt: line.createdAt,
        currentQuantity: line.quantity,
        currentUpdatedAt: line.updatedAt,
        history: [],
        convertedAt: null,
      });
    }

    await Promise.all(
      [...drafts.values()]
        .filter((draft): draft is IntentDraft & { cartItemId: Id<"cartItems"> } => draft.cartItemId !== null)
        .map(async (draft) => {
          draft.history = await ctx.db
            .query("cartIntentEvents")
            .withIndex("by_cart_item_id", (index) => index.eq("cartItemId", draft.cartItemId))
            .order("asc")
            .collect();
          const additions = draft.history.filter(isAddEvent);
          if (additions.length) {
            draft.firstSeenAt = Math.min(draft.firstSeenAt, additions[0].createdAt);
            if (draft.currentQuantity === null) {
              draft.bookId = additions[additions.length - 1].bookId;
              draft.bookVariantId = additions[additions.length - 1].bookVariantId;
              draft.bookTitle = additions[additions.length - 1].bookTitle;
              draft.format = additions[additions.length - 1].format;
            }
          }
          const latest = draft.history[draft.history.length - 1];
          if (latest && draft.currentQuantity === null) draft.quantity = latest.quantity;
        }),
    );

    const matchedIntentKeys = new Set<string>();
    for (const conversion of [...canonicalConversions].sort((first, second) => first.createdAt - second.createdAt)) {
      const match = [...drafts.values()].find(
        (intent) =>
          !intent.convertedAt && !matchedIntentKeys.has(intent.key) && matchesCanonicalConversion(intent, conversion),
      );
      if (match) {
        match.convertedAt = conversion.createdAt;
        match.quantity = conversion.quantity;
        matchedIntentKeys.add(match.key);
        continue;
      }

      if (conversion.createdAt < from || conversion.createdAt > to) continue;
      const key = `order:${String(conversion.orderId)}:${String(conversion.orderItemId)}`;
      if (drafts.has(key)) continue;
      drafts.set(key, {
        key,
        cartId: conversion.cartId,
        cartItemId: null,
        customerUserId: conversion.customerUserId,
        catalogItemId: conversion.catalogItemId,
        bookId: conversion.bookId,
        bookVariantId: conversion.bookVariantId,
        bookTitle: conversion.bookTitle,
        format: conversion.format,
        quantity: conversion.quantity,
        firstSeenAt: conversion.createdAt,
        currentQuantity: null,
        currentUpdatedAt: 0,
        history: [],
        convertedAt: conversion.createdAt,
      });
    }

    const intents: KnownCartIntent[] = [...drafts.values()]
      .filter((draft) => draft.firstSeenAt >= from && draft.firstSeenAt <= to)
      .map((draft) => ({
        ...draft,
        status: statusForIntent(draft),
        lastActivityAt: Math.max(
          draft.firstSeenAt,
          draft.currentUpdatedAt,
          draft.convertedAt ?? 0,
          ...draft.history.map((event) => event.createdAt),
        ),
      }));

    const users = await Promise.all(
      [...new Set(intents.map((intent) => String(intent.customerUserId)))].map(async (id) => {
        const user = await ctx.db.get(id as Id<"appUsers">);
        return user ? ([String(user._id), user] as const) : null;
      }),
    );
    const usersById = new Map(users.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
    const cohort = intents.filter((intent) => usersById.has(String(intent.customerUserId)));

    const convertedIntents = cohort.filter((intent) => intent.status === "converted").length;
    const unconvertedIntents = cohort.length - convertedIntents;
    const customerIds = new Set(cohort.map((intent) => String(intent.customerUserId)));

    const bookAggregates = new Map<
      string,
      {
        bookId: Id<"books">;
        bookVariantId: Id<"bookVariants">;
        bookTitle: string;
        format: string;
        intentCount: number;
        customers: Set<string>;
        unconvertedCount: number;
        convertedCount: number;
      }
    >();
    for (const intent of cohort) {
      const key = `${String(intent.bookId)}:${String(intent.bookVariantId)}`;
      const existing = bookAggregates.get(key);
      if (existing) {
        existing.intentCount += 1;
        existing.customers.add(String(intent.customerUserId));
        existing.unconvertedCount += intent.status === "converted" ? 0 : 1;
        existing.convertedCount += intent.status === "converted" ? 1 : 0;
      } else {
        bookAggregates.set(key, {
          bookId: intent.bookId,
          bookVariantId: intent.bookVariantId,
          bookTitle: intent.bookTitle,
          format: intent.format,
          intentCount: 1,
          customers: new Set([String(intent.customerUserId)]),
          unconvertedCount: intent.status === "converted" ? 0 : 1,
          convertedCount: intent.status === "converted" ? 1 : 0,
        });
      }
    }
    const allBooks = [...bookAggregates.values()]
      .map((book) => ({
        bookId: book.bookId,
        bookVariantId: book.bookVariantId,
        bookTitle: book.bookTitle,
        format: book.format,
        intentCount: book.intentCount,
        distinctCustomerCount: book.customers.size,
        unconvertedCount: book.unconvertedCount,
        convertedCount: book.convertedCount,
        conversionRate: book.intentCount ? book.convertedCount / book.intentCount : 0,
        // Retained aliases keep the existing table contract while the values now mean intent lines, not raw clicks.
        addActions: book.intentCount,
        customers: book.customers.size,
        convertedIntents: book.convertedCount,
      }))
      .sort(
        (first, second) => second.intentCount - first.intentCount || first.bookTitle.localeCompare(second.bookTitle),
      );
    const books = allBooks.slice(0, MAX_BOOK_ROWS);

    const statusPriority: Record<IntentStatus, number> = {
      unconverted: 0,
      converted: 1,
      removed: 2,
      in_cart: 3,
    };
    const customerAggregates = new Map<
      string,
      {
        customerUserId: Id<"appUsers">;
        itemCount: number;
        quantity: number;
        lastActivityAt: number;
        status: IntentStatus;
        statusCounts: StatusCounts;
        items: Array<{ title: string; quantity: number }>;
      }
    >();
    for (const intent of cohort) {
      const key = String(intent.customerUserId);
      const quantity = intent.currentQuantity ?? intent.quantity;
      const existing = customerAggregates.get(key);
      if (existing) {
        existing.itemCount += 1;
        existing.quantity += quantity;
        existing.lastActivityAt = Math.max(existing.lastActivityAt, intent.lastActivityAt);
        existing.statusCounts[intent.status] += 1;
        if (statusPriority[intent.status] > statusPriority[existing.status]) existing.status = intent.status;
        if (existing.items.length < 3) existing.items.push({ title: intent.bookTitle, quantity });
      } else {
        const statusCounts = emptyStatusCounts();
        statusCounts[intent.status] = 1;
        customerAggregates.set(key, {
          customerUserId: intent.customerUserId,
          itemCount: 1,
          quantity,
          lastActivityAt: intent.lastActivityAt,
          status: intent.status,
          statusCounts,
          items: [{ title: intent.bookTitle, quantity }],
        });
      }
    }
    const customers = [...customerAggregates.values()]
      .map((aggregate) => {
        const user = usersById.get(String(aggregate.customerUserId));
        if (!user) return null;
        return {
          customerId: user._id,
          name: user.displayNameSnapshot || "Customer BFG",
          memberCode: user.memberCode || null,
          itemCount: aggregate.itemCount,
          quantity: aggregate.quantity,
          lastActivityAt: aggregate.lastActivityAt,
          status: aggregate.status,
          statusCounts: aggregate.statusCounts,
          items: aggregate.items,
        };
      })
      .filter((customer): customer is NonNullable<typeof customer> => customer !== null)
      .sort((first, second) => second.lastActivityAt - first.lastActivityAt);

    const buckets = trendBuckets(args.days, from, to);
    const trends = {
      buckets,
      addActions: buckets.map((bucket, index) => {
        const bucketIntents = cohort.filter((intent) =>
          inBucket(intent.firstSeenAt, bucket, index === buckets.length - 1),
        );
        return bucketIntents.length;
      }),
      interestedCustomers: buckets.map(
        (bucket, index) =>
          new Set(
            cohort
              .filter((intent) => inBucket(intent.firstSeenAt, bucket, index === buckets.length - 1))
              .map((intent) => String(intent.customerUserId)),
          ).size,
      ),
      unconvertedIntents: buckets.map(
        (bucket, index) =>
          cohort.filter(
            (intent) =>
              inBucket(intent.firstSeenAt, bucket, index === buckets.length - 1) && intent.status !== "converted",
          ).length,
      ),
      convertedIntents: buckets.map(
        (bucket, index) =>
          cohort.filter(
            (intent) =>
              inBucket(intent.firstSeenAt, bucket, index === buckets.length - 1) && intent.status === "converted",
          ).length,
      ),
    };

    // All headline and bucket outcome counts use this same cohort, so the invariant is structural.
    const addIntentCount = cohort.length;
    if (addIntentCount !== unconvertedIntents + convertedIntents) {
      throw new Error("Analytics intent cohort invariant violated");
    }

    return {
      periodDays: args.days,
      from,
      to,
      trackingStartedAt: trackingStartEvent?.createdAt ?? null,
      metrics: {
        addActions: addIntentCount,
        interestedCustomers: customerIds.size,
        unconvertedIntents,
        convertedIntents,
      },
      trends,
      books,
      bookInterestTotal: allBooks.reduce((total, book) => total + book.intentCount, 0),
      bookInterestTruncated: allBooks.length > MAX_BOOK_ROWS,
      customers: customers.slice(0, MAX_ACTIVITY_ROWS),
      customerActivityTruncated: customers.length > MAX_ACTIVITY_ROWS,
    };
  },
});
