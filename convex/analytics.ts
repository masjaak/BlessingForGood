import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type MutationCtx } from "./_generated/server";
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

type IntentAggregate = {
  cartItemId: Id<"cartItems">;
  customerUserId: Id<"appUsers">;
  bookId: Id<"books">;
  bookVariantId: Id<"bookVariants">;
  bookTitle: string;
  format: string;
  addActions: number;
};

type IntentState = IntentAggregate & {
  history: Doc<"cartIntentEvents">[];
  currentQuantity: number | null;
  status: "in_cart" | "converted" | "removed" | "unconverted";
  lastActivityAt: number;
};

function latestEvent(events: Doc<"cartIntentEvents">[], type: CartIntentEventType) {
  return events.find((event) => event.eventType === type) ?? null;
}

function statusForIntent(history: Doc<"cartIntentEvents">[], currentQuantity: number | null): IntentState["status"] {
  if (latestEvent(history, "cart_item_converted_to_order")) return "converted";
  if (currentQuantity !== null) return "in_cart";
  if (latestEvent(history, "cart_item_removed")) return "removed";
  return "unconverted";
}

export const get = query({
  args: { days: periodDays },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const to = Date.now();
    const from = to - args.days * 24 * 60 * 60 * 1000;
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
        continue;
      }
      aggregates.set(key, {
        cartItemId: event.cartItemId,
        customerUserId: event.customerUserId,
        bookId: event.bookId,
        bookVariantId: event.bookVariantId,
        bookTitle: event.bookTitle,
        format: event.format,
        addActions: 1,
      });
    }

    const intents: IntentState[] = await Promise.all(
      [...aggregates.values()].map(async (aggregate) => {
        const history = await ctx.db
          .query("cartIntentEvents")
          .withIndex("by_cart_item_id", (index) => index.eq("cartItemId", aggregate.cartItemId))
          .order("desc")
          .collect();
        const currentItem = await ctx.db.get(aggregate.cartItemId);
        const currentCart = currentItem ? await ctx.db.get(currentItem.cartId) : null;
        const currentQuantity =
          currentItem && currentCart?.customerUserId === aggregate.customerUserId ? currentItem.quantity : null;
        const selectedPeriodEvents = history.filter((event) => event.createdAt >= from && event.createdAt <= to);
        return {
          ...aggregate,
          history,
          currentQuantity,
          status: statusForIntent(history, currentQuantity),
          lastActivityAt: selectedPeriodEvents.reduce((latest, event) => Math.max(latest, event.createdAt), from),
        };
      }),
    );

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
    for (const intent of intents) {
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
      metrics: {
        addActions: additions.length,
        interestedCustomers: new Set(additions.map((event) => String(event.customerUserId))).size,
        unconvertedIntents: intents.length - convertedIntents,
        convertedIntents,
      },
      books,
      customers,
      customerActivityTruncated: customerAggregates.size > MAX_ACTIVITY_ROWS,
    };
  },
});
