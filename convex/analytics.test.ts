/// <reference types="vite/client" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { recordCartIntentEvent } from "./analytics";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

async function catalogItemId(
  t: ReturnType<typeof testConvex>,
  catalogId: Id<"secretCatalogs">,
  variantId: Id<"bookVariants">,
) {
  return t.run(async (ctx) => {
    const item = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog_and_variant", (query) => query.eq("catalogId", catalogId).eq("bookVariantId", variantId))
      .unique();
    if (!item) throw new Error("Analytics fixture Catalog Item missing");
    return item._id;
  });
}

describe("BFG cart intent analytics", () => {
  beforeEach(configureTestEnvironment);

  it("does not propagate an observational event write failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = {
      insert: vi.fn(async () => {
        throw new Error("simulated analytics failure with secret-like detail");
      }),
    };

    await expect(
      recordCartIntentEvent({ db } as never, {
        eventType: "cart_item_added",
        customerUserId: "customer" as Id<"appUsers">,
        cartId: "cart" as Id<"carts">,
        cartItemId: "line" as Id<"cartItems">,
        quantity: 1,
        createdAt: 0,
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("bfg_cart_intent_event_failed", {
      eventType: "cart_item_added",
      errorClass: "Error",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret-like detail");
    errorSpy.mockRestore();
  });

  it("aggregates add intent, current/removed status, and canonical Order conversion", async () => {
    const t = testConvex();
    const { owner, admin, customer, secondCustomer } = await setupUsers(t);
    const firstCatalog = await createOpenCatalog(admin, "Analytics First", "3101", "analytics-first-code");
    const secondCatalog = await createOpenCatalog(admin, "Analytics Second", "3102", "analytics-second-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-first-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-second-code" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-first-code" });

    const firstItemId = await catalogItemId(t, firstCatalog.catalogId, firstCatalog.variantIds[0]);
    const secondItemId = await catalogItemId(t, secondCatalog.catalogId, secondCatalog.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: firstItemId, quantity: 2 });
    const secondAdd = await customer.mutation(api.carts.addItem, { catalogItemId: secondItemId });
    const removedLine = secondAdd.lines.find((line) => line.catalogItemId === secondItemId);
    if (!removedLine) throw new Error("Analytics removed Cart line missing");
    await customer.mutation(api.carts.removeItem, { cartItemId: removedLine.id as Id<"cartItems"> });
    await secondCustomer.mutation(api.carts.addItem, { catalogItemId: firstItemId });
    const order = await customer.mutation(api.orders.submitCart, {
      catalogId: firstCatalog.catalogId,
      requestKey: "analytics-conversion",
    });

    const report = await admin.query(api.analytics.get, { days: 30 });
    expect(report.metrics).toEqual({
      addActions: 3,
      interestedCustomers: 2,
      unconvertedIntents: 2,
      convertedIntents: 1,
    });
    expect(report.books).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ addActions: 2, customers: 2, convertedIntents: 1, conversionRate: 0.5 }),
        expect.objectContaining({ addActions: 1, customers: 1, convertedIntents: 0, conversionRate: 0 }),
      ]),
    );
    expect(report.customers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemCount: 2, status: "removed" }),
        expect.objectContaining({ itemCount: 1, status: "in_cart" }),
      ]),
    );
    expect(new Set(report.customers.map((row) => row.customerId)).size).toBe(report.customers.length);
    expect(report.customers.every((row) => !("email" in row) && !("phone" in row))).toBe(true);
    expect(report.bookInterestTotal).toBe(report.metrics.addActions);
    expect(report.books.reduce((total, book) => total + book.intentCount, 0)).toBe(report.bookInterestTotal);
    report.trends.addActions.forEach((count, index) => {
      expect(count).toBe(report.trends.unconvertedIntents[index] + report.trends.convertedIntents[index]);
    });
    expect(report.metrics.addActions).toBe(report.metrics.unconvertedIntents + report.metrics.convertedIntents);
    await expect(owner.query(api.analytics.get, { days: 30 })).resolves.toMatchObject({
      metrics: report.metrics,
    });
    await expect(customer.query(api.analytics.get, { days: 30 })).rejects.toThrow("PERMISSION_DENIED");
    await expect(t.query(api.analytics.get, { days: 30 })).rejects.toThrow("IDENTITY_REQUIRED");

    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("Analytics Admin fixture missing");
    await owner.mutation(api.users.suspend, { userId: adminUser.appUserId });
    await expect(admin.query(api.analytics.get, { days: 30 })).rejects.toThrow("USER_SUSPENDED");

    expect(order.orderId).toBeDefined();
    await expect(
      t.run(async (ctx) => (await ctx.db.query("cartIntentEvents").collect()).map((event) => event.eventType)),
    ).resolves.toEqual(
      expect.arrayContaining(["cart_item_added", "cart_item_removed", "cart_item_converted_to_order"]),
    );
  });

  it("reconciles a pre-release current cart without fabricating events", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Analytics Pre-release Cart", "3104", "analytics-pre-release");
    const catalogItem = await catalogItemId(t, catalog.catalogId, catalog.variantIds[0]);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("Analytics customer fixture missing");
    const createdAt = Date.now() - 10 * 24 * 60 * 60 * 1000;

    await t.run(async (ctx) => {
      const cartId = await ctx.db.insert("carts", {
        customerUserId: customerUser.appUserId,
        catalogId: catalog.catalogId,
        createdAt,
        updatedAt: createdAt,
      });
      await ctx.db.insert("cartItems", {
        cartId,
        catalogItemId: catalogItem,
        quantity: 2,
        observedUnitPriceAmount: 125000,
        availabilityState: "active",
        createdAt,
        updatedAt: createdAt,
      });
    });

    const report = await admin.query(api.analytics.get, { days: 30 });
    expect(report.trackingStartedAt).toBeNull();
    expect(report.metrics).toEqual({
      addActions: 1,
      interestedCustomers: 1,
      unconvertedIntents: 1,
      convertedIntents: 0,
    });
    expect(report.books).toEqual([
      expect.objectContaining({
        addActions: 1,
        customers: 1,
        convertedIntents: 0,
        conversionRate: 0,
      }),
    ]);
    expect(report.customers).toEqual([
      expect.objectContaining({
        customerId: customerUser.appUserId,
        itemCount: 1,
        quantity: 2,
        status: "in_cart",
        items: [{ title: "Analytics Pre-release Cart Book", quantity: 2 }],
      }),
    ]);
    await expect(t.run(async (ctx) => ctx.db.query("cartIntentEvents").collect())).resolves.toEqual([]);
  });

  it("reconciles current carts and canonical conversions when event history is absent", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(
      admin,
      "Analytics Production Contradiction",
      "3106",
      "analytics-contradiction",
    );
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-contradiction" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-contradiction" });
    const itemId = await catalogItemId(t, catalog.catalogId, catalog.variantIds[0]);

    await customer.mutation(api.carts.addItem, { catalogItemId: itemId });
    await customer.mutation(api.orders.submitCart, {
      catalogId: catalog.catalogId,
      requestKey: "analytics-contradiction-order",
    });

    const secondCustomerUser = await secondCustomer.query(api.users.current, {});
    if (!secondCustomerUser) throw new Error("Analytics second customer fixture missing");
    const createdAt = Date.now() - 5 * DAY_MS;
    await t.run(async (ctx) => {
      const cartId = await ctx.db.insert("carts", {
        customerUserId: secondCustomerUser.appUserId,
        catalogId: catalog.catalogId,
        createdAt,
        updatedAt: createdAt,
      });
      await ctx.db.insert("cartItems", {
        cartId,
        catalogItemId: itemId,
        quantity: 1,
        observedUnitPriceAmount: 125000,
        availabilityState: "active",
        createdAt,
        updatedAt: createdAt,
      });
      for (const event of await ctx.db.query("cartIntentEvents").collect()) await ctx.db.delete(event._id);
    });

    const report = await admin.query(api.analytics.get, { days: 30 });
    expect(report.metrics).toEqual({
      addActions: 2,
      interestedCustomers: 2,
      unconvertedIntents: 1,
      convertedIntents: 1,
    });
    expect(report.customers).toHaveLength(2);
    expect(report.bookInterestTotal).toBe(2);
    expect(report.books[0]).toMatchObject({
      intentCount: 2,
      distinctCustomerCount: 2,
      unconvertedCount: 1,
      convertedCount: 1,
    });
    expect(await t.run(async (ctx) => ctx.db.query("cartIntentEvents").collect())).toEqual([]);
  });

  it("counts multiple books as intents but one interested Customer", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalogs: Array<Awaited<ReturnType<typeof createOpenCatalog>>> = [];
    for (const suffix of ["A", "B", "C"]) {
      const accessCode = `analytics-book-${suffix}`;
      const catalog = await createOpenCatalog(admin, `Analytics Multiple Books ${suffix}`, `310${suffix}`, accessCode);
      await customer.mutation(api.catalogAccess.unlock, { accessCode });
      catalogs.push(catalog);
    }
    const itemIds = await Promise.all(
      catalogs.map((catalog) => catalogItemId(t, catalog.catalogId, catalog.variantIds[0])),
    );
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("Analytics customer fixture missing");
    const createdAt = Date.now() - 5 * DAY_MS;

    await t.run(async (ctx) => {
      const cartId = await ctx.db.insert("carts", {
        customerUserId: customerUser.appUserId,
        catalogId: catalogs[0].catalogId,
        createdAt,
        updatedAt: createdAt,
      });
      for (const itemId of itemIds) {
        await ctx.db.insert("cartItems", {
          cartId,
          catalogItemId: itemId,
          quantity: 1,
          observedUnitPriceAmount: 125000,
          availabilityState: "active",
          createdAt,
          updatedAt: createdAt,
        });
      }
    });

    const report = await admin.query(api.analytics.get, { days: 30 });
    expect(report.metrics).toMatchObject({
      addActions: 3,
      interestedCustomers: 1,
      unconvertedIntents: 3,
      convertedIntents: 0,
    });
    expect(report.customers).toEqual([expect.objectContaining({ itemCount: 3, status: "in_cart" })]);
    expect(report.trends.interestedCustomers.filter((count) => count > 0)).toEqual([1]);
    expect(report.trends.addActions.filter((count) => count > 0)).toEqual([3]);
    expect(report.bookInterestTotal).toBe(3);
  });

  it("keeps Customer trend counts distinct per bucket across the same period", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const firstCatalog = await createOpenCatalog(admin, "Analytics Trend Day One", "3107", "analytics-trend-one");
    const secondCatalog = await createOpenCatalog(admin, "Analytics Trend Day Two", "3108", "analytics-trend-two");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-trend-one" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-trend-two" });
    const firstItemId = await catalogItemId(t, firstCatalog.catalogId, firstCatalog.variantIds[0]);
    const secondItemId = await catalogItemId(t, secondCatalog.catalogId, secondCatalog.variantIds[0]);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("Analytics customer fixture missing");
    const dayOne = Date.now() - 2 * DAY_MS;
    const dayTwo = Date.now() - DAY_MS;

    await t.run(async (ctx) => {
      const cartId = await ctx.db.insert("carts", {
        customerUserId: customerUser.appUserId,
        catalogId: firstCatalog.catalogId,
        createdAt: dayTwo,
        updatedAt: dayTwo,
      });
      await ctx.db.insert("cartItems", {
        cartId,
        catalogItemId: firstItemId,
        quantity: 1,
        observedUnitPriceAmount: 125000,
        availabilityState: "active",
        createdAt: dayOne,
        updatedAt: dayOne,
      });
      await ctx.db.insert("cartItems", {
        cartId,
        catalogItemId: secondItemId,
        quantity: 1,
        observedUnitPriceAmount: 125000,
        availabilityState: "active",
        createdAt: dayTwo,
        updatedAt: dayTwo,
      });
    });

    const report = await admin.query(api.analytics.get, { days: 30 });
    expect(report.metrics.interestedCustomers).toBe(1);
    expect(report.trends.interestedCustomers.filter((count) => count > 0)).toEqual([1, 1]);
    expect(report.trends.addActions.reduce((total, count) => total + count, 0)).toBe(2);
    report.trends.addActions.forEach((count, index) => {
      expect(count).toBe(report.trends.unconvertedIntents[index] + report.trends.convertedIntents[index]);
    });
  });

  it("keeps canonical conversion truth when the conversion event is unavailable", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Analytics Canonical Conversion", "3105", "analytics-canonical");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-canonical" });
    const itemId = await catalogItemId(t, catalog.catalogId, catalog.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: itemId });
    const order = await customer.mutation(api.orders.submitCart, {
      catalogId: catalog.catalogId,
      requestKey: "analytics-canonical-conversion",
    });

    await t.run(async (ctx) => {
      const event = await ctx.db.query("cartIntentEvents").withIndex("by_created_at").order("desc").first();
      if (!event || event.eventType !== "cart_item_converted_to_order") {
        throw new Error("Analytics conversion event fixture missing");
      }
      await ctx.db.delete(event._id);
    });

    const report = await admin.query(api.analytics.get, { days: 30 });
    expect(report.metrics).toMatchObject({ addActions: 1, unconvertedIntents: 0, convertedIntents: 1 });
    expect(report.customers).toEqual([expect.objectContaining({ status: "converted", itemCount: 1 })]);

    const repeatedOrder = await customer.mutation(api.orders.submitCart, {
      catalogId: catalog.catalogId,
      requestKey: "analytics-canonical-conversion",
    });
    expect(repeatedOrder.orderId).toBe(order.orderId);
    await expect(
      t.run(async (ctx) => ({
        orders: (await ctx.db.query("orders").collect()).length,
        cartItems: (await ctx.db.query("cartItems").collect()).length,
      })),
    ).resolves.toEqual({ orders: 1, cartItems: 0 });
  });

  it("filters add intent by the selected period without changing Cart authority", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Analytics Period", "3103", "analytics-period-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-period-code" });
    const itemId = await catalogItemId(t, catalog.catalogId, catalog.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: itemId });
    await t.run(async (ctx) => {
      const event = await ctx.db.query("cartIntentEvents").withIndex("by_created_at").first();
      if (!event) throw new Error("Analytics event missing");
      await ctx.db.patch(event._id, { createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000 });
    });

    await expect(admin.query(api.analytics.get, { days: 7 })).resolves.toMatchObject({
      metrics: { addActions: 0, interestedCustomers: 0, unconvertedIntents: 0, convertedIntents: 0 },
      books: [],
      customers: [],
    });
    await expect(customer.query(api.carts.getMineSummary, {})).resolves.toMatchObject({
      retainedLineCount: 1,
      retainedQuantity: 1,
    });
  });
});
