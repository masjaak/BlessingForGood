/// <reference types="vite/client" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { recordCartIntentEvent } from "./analytics";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

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
    expect(report.customers.every((row) => !("email" in row) && !("phone" in row))).toBe(true);
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
