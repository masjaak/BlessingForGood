/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

const checkoutScaleFormats = [
  "BB",
  "PB",
  "HB",
  "Cards",
  "Pack",
  "Slipcase HB",
  "Slipcase PB",
  "Boxset PB",
  "Boxset HB",
  "FLEXIBOUND",
] as const;

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
    if (!item) throw new Error("Cart checkout fixture Catalog Item missing");
    return item._id;
  });
}

async function createMultiLineCatalog(
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
  name: string,
  accessCode: string,
) {
  const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
    name,
    publisherName: `${name} Publisher`,
    bookTitle: `${name} Book`,
    accessCode,
    variants: [
      { format: "FLEXIBOUND", isbn: "9780000000101", priceAmount: 125000 },
      { format: "HB", isbn: "9780000000102", priceAmount: 150000 },
    ],
  });
  await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
  return bundle;
}

async function addLine(
  t: ReturnType<typeof testConvex>,
  customer: Awaited<ReturnType<typeof setupUsers>>["customer"],
  catalogId: Id<"secretCatalogs">,
  variantId: Id<"bookVariants">,
  quantity = 1,
) {
  return customer.mutation(api.carts.addItem, {
    catalogItemId: await catalogItemId(t, catalogId, variantId),
    quantity,
  });
}

async function createScaleCheckoutCart(
  t: ReturnType<typeof testConvex>,
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
  customer: Awaited<ReturnType<typeof setupUsers>>["customer"],
) {
  const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
    name: "Cart Checkout Scale",
    publisherName: "Cart Checkout Scale Publisher",
    bookTitle: "Cart Checkout Scale Book",
    accessCode: "cart-checkout-scale-code",
    variants: checkoutScaleFormats.map((format, index) => ({
      format,
      isbn: `9780000005${String(index).padStart(3, "0")}`,
      priceAmount: 125000 + index * 1000,
    })),
  });
  await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
  await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-checkout-scale-code" });
  const customerUser = await customer.query(api.users.current, {});
  if (!customerUser) throw new Error("checkout scale Customer missing");

  return t.run(async (ctx) => {
    const firstVariant = await ctx.db.get(bundle.variantIds[0]);
    if (!firstVariant) throw new Error("checkout scale Variant missing");
    const firstBook = await ctx.db.get(firstVariant.bookId);
    if (!firstBook) throw new Error("checkout scale Book missing");
    const now = Date.now();
    const cartId = await ctx.db.insert("carts", {
      customerUserId: customerUser.appUserId,
      catalogId: bundle.catalogId,
      createdAt: now,
      updatedAt: now,
    });
    let totalAmount = 0;
    let lineCount = 0;

    for (const variantId of bundle.variantIds) {
      const catalogItem = await ctx.db
        .query("catalogItems")
        .withIndex("by_catalog_and_variant", (query) =>
          query.eq("catalogId", bundle.catalogId).eq("bookVariantId", variantId),
        )
        .unique();
      if (!catalogItem) throw new Error("checkout scale Catalog Item missing");
      await ctx.db.insert("cartItems", {
        cartId,
        catalogItemId: catalogItem._id,
        quantity: 1,
        observedUnitPriceAmount: catalogItem.priceOverrideAmount ?? firstVariant.priceAmount + lineCount * 1000,
        availabilityState: "active",
        createdAt: now + lineCount,
        updatedAt: now + lineCount,
      });
      totalAmount += catalogItem.priceOverrideAmount ?? firstVariant.priceAmount + lineCount * 1000;
      lineCount += 1;
    }

    for (let bookIndex = 1; bookIndex < 5; bookIndex += 1) {
      const bookId = await ctx.db.insert("books", {
        publisherId: firstBook.publisherId,
        title: `Cart Checkout Scale Book ${bookIndex}`,
        slug: `cart-checkout-scale-book-${bookIndex}`,
        categories: [],
        publicationStatus: "special",
        isActive: true,
        createdAt: now + bookIndex,
        updatedAt: now + bookIndex,
        createdByUserId: customerUser.appUserId,
      });
      for (const [formatIndex, format] of checkoutScaleFormats.entries()) {
        const priceAmount = 125000 + formatIndex * 1000;
        const variantId = await ctx.db.insert("bookVariants", {
          bookId,
          format,
          isbn: `9780000006${bookIndex}${String(formatIndex).padStart(2, "0")}`,
          priceAmount,
          currency: "IDR",
          isAvailable: true,
          createdAt: now + lineCount,
          updatedAt: now + lineCount,
        });
        const catalogItemId = await ctx.db.insert("catalogItems", {
          catalogId: bundle.catalogId,
          bookVariantId: variantId,
          bookId,
          isAvailable: true,
          createdAt: now + lineCount,
          updatedAt: now + lineCount,
        });
        await ctx.db.insert("cartItems", {
          cartId,
          catalogItemId,
          quantity: 1,
          observedUnitPriceAmount: priceAmount,
          availabilityState: "active",
          createdAt: now + lineCount,
          updatedAt: now + lineCount,
        });
        totalAmount += priceAmount;
        lineCount += 1;
      }
    }

    return { cartId, lineCount, totalAmount };
  });
}

async function graphCounts(t: ReturnType<typeof testConvex>) {
  return t.run(async (ctx) => ({
    orders: (await ctx.db.query("orders").collect()).length,
    orderItems: (await ctx.db.query("orderItems").collect()).length,
    assignments: (await ctx.db.query("orderItemBatchAssignments").collect()).length,
    statusHistory: (await ctx.db.query("orderStatusHistory").collect()).length,
  }));
}

async function expectCheckoutError(
  customer: Awaited<ReturnType<typeof setupUsers>>["customer"],
  requestKey: string,
  code: string,
) {
  await expect(customer.mutation(api.orders.submitCart, { requestKey })).rejects.toThrow(code);
}

describe("BFG Cart checkout", () => {
  beforeEach(configureTestEnvironment);

  it("creates one multi-line Order, snapshots canonical values, and consumes the Cart", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createMultiLineCatalog(admin, "Cart Checkout Catalog", "cart-checkout-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-checkout-code" });
    await addLine(t, customer, catalog.catalogId, catalog.variantIds[0], 2);
    await addLine(t, customer, catalog.catalogId, catalog.variantIds[1], 3);

    const order = await customer.mutation(api.orders.submitCart, { requestKey: "cart-checkout-success" });

    expect(order).toMatchObject({
      customerUserId: expect.any(String),
      source: "customer_self_service",
      totalAmount: 700000,
      status: "submitted",
    });
    expect(order.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 2,
          unitPriceAmountSnapshot: 125000,
          subtotalAmount: 250000,
          formatSnapshot: "FLEXIBOUND",
        }),
        expect.objectContaining({ quantity: 3, unitPriceAmountSnapshot: 150000, subtotalAmount: 450000 }),
      ]),
    );
    expect(order.statusHistory).toEqual([expect.objectContaining({ status: "submitted" })]);
    expect(await graphCounts(t)).toEqual({ orders: 1, orderItems: 2, assignments: 0, statusHistory: 1 });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      catalogId: null,
      lines: [],
      retainedQuantity: 0,
    });
    const rawCart = await t.run((ctx) => ctx.db.query("carts").withIndex("by_customer_user_id").unique());
    expect(rawCart?.catalogId).toBeUndefined();
    expect(rawCart).toMatchObject({ lastCheckout: { requestKey: "cart-checkout-success" } });
    expect(rawCart?.lastCheckout?.orderId).toBe(order.orderId);

    await expect(
      customer.mutation(api.orders.submitCart, { requestKey: "cart-checkout-success" }),
    ).resolves.toMatchObject({ orderId: order.orderId });
    await expectCheckoutError(customer, "cart-checkout-other-tab", "CART_CHECKOUT_ALREADY_SUBMITTED");
  });

  it("scales selected-group checkout to 50 lines without retained Product graph work", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createScaleCheckoutCart(t, admin, customer);

    const order = await customer.mutation(api.orders.submitCart, {
      requestKey: "cart-checkout-selected-50",
      catalogId: await t.run(async (ctx) => {
        const cart = await ctx.db.get(fixture.cartId);
        if (!cart?.catalogId) throw new Error("checkout scale Catalog missing");
        return cart.catalogId;
      }),
    });

    expect(order).toMatchObject({ totalAmount: fixture.totalAmount });
    expect(order.items).toHaveLength(fixture.lineCount);
    expect(await graphCounts(t)).toMatchObject({ orders: 1, orderItems: fixture.lineCount, statusHistory: 1 });
    await expect(customer.query(api.carts.getMineSummary, {})).resolves.toMatchObject({
      retainedLineCount: 0,
      retainedQuantity: 0,
    });
  }, 30000);

  it("rejects empty and non-Customer checkout without creating an Order", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    await expectCheckoutError(customer, "empty-cart", "ORDER_EMPTY");
    await expectCheckoutError(admin, "admin-cart", "CUSTOMER_REQUIRED");
    expect(await graphCounts(t)).toEqual({ orders: 0, orderItems: 0, assignments: 0, statusHistory: 0 });
  });

  it("rejects unavailable, price-changed, and unacknowledged retained lines as a whole Cart", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createMultiLineCatalog(admin, "Cart Checkout Stale", "cart-checkout-stale-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-checkout-stale-code" });
    const firstItemId = await catalogItemId(t, catalog.catalogId, catalog.variantIds[0]);
    const secondItemId = await catalogItemId(t, catalog.catalogId, catalog.variantIds[1]);
    await customer.mutation(api.carts.addItem, { catalogItemId: firstItemId });
    const secondLine = await customer.mutation(api.carts.addItem, { catalogItemId: secondItemId });
    const secondCartLine = secondLine.lines.find((line) => line.catalogItemId === secondItemId);
    if (!secondCartLine) throw new Error("second Cart line missing");
    const ids = await t.run(async (ctx) => {
      const item = await ctx.db.get(secondItemId);
      if (!item) throw new Error("catalog item missing");
      const variant = await ctx.db.get(item.bookVariantId);
      if (!variant) throw new Error("variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("book missing");
      return { itemId: item._id, variantId: variant._id, bookId: book._id, publisherId: book.publisherId };
    });

    await t.run((ctx) => ctx.db.patch(ids.itemId, { isAvailable: false, updatedAt: Date.now() }));
    await expectCheckoutError(customer, "stale-item", "BOOK_VARIANT_UNAVAILABLE");
    await t.run((ctx) => ctx.db.patch(ids.itemId, { isAvailable: true, updatedAt: Date.now() }));

    await t.run((ctx) => ctx.db.patch(ids.variantId, { isAvailable: false, updatedAt: Date.now() }));
    await expectCheckoutError(customer, "stale-variant", "BOOK_VARIANT_UNAVAILABLE");
    await t.run((ctx) => ctx.db.patch(ids.variantId, { isAvailable: true, updatedAt: Date.now() }));

    await t.run((ctx) => ctx.db.patch(ids.bookId, { isActive: false, updatedAt: Date.now() }));
    await expectCheckoutError(customer, "stale-book", "BOOK_VARIANT_UNAVAILABLE");
    await t.run((ctx) => ctx.db.patch(ids.bookId, { isActive: true, updatedAt: Date.now() }));

    await t.run((ctx) => ctx.db.patch(ids.publisherId, { isActive: false, updatedAt: Date.now() }));
    await expectCheckoutError(customer, "stale-publisher", "BOOK_VARIANT_UNAVAILABLE");
    await t.run((ctx) => ctx.db.patch(ids.publisherId, { isActive: true, updatedAt: Date.now() }));

    await t.run((ctx) => ctx.db.patch(secondCartLine.id as Id<"cartItems">, { availabilityState: "unavailable" }));
    await expectCheckoutError(customer, "needs-ack", "CART_CHECKOUT_REQUIRES_ACKNOWLEDGEMENT");
    await t.run((ctx) => ctx.db.patch(secondCartLine.id as Id<"cartItems">, { availabilityState: "active" }));

    await t.run((ctx) => ctx.db.patch(ids.itemId, { priceOverrideAmount: 150001, updatedAt: Date.now() }));
    await expectCheckoutError(customer, "price-race", "PRICE_CHANGED");
    expect(await graphCounts(t)).toEqual({ orders: 0, orderItems: 0, assignments: 0, statusHistory: 0 });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ retainedQuantity: 2 });
  });

  it("rechecks Catalog state, access, quantity, and single-Catalog integrity", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const first = await createOpenCatalog(admin, "Cart Checkout Closed", "F104", "cart-closed-code");
    const second = await createOpenCatalog(admin, "Cart Checkout Other", "F105", "cart-other-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-closed-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-other-code" });
    const firstItemId = await catalogItemId(t, first.catalogId, first.variantIds[0]);
    const secondItemId = await catalogItemId(t, second.catalogId, second.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: firstItemId });
    await expect(secondCustomer.mutation(api.orders.submitCart, { requestKey: "other-customer" })).rejects.toThrow(
      "ORDER_EMPTY",
    );

    const cart = await customer.query(api.carts.getMine, {});
    const cartLineId = cart.lines[0].id as Id<"cartItems">;
    await t.run((ctx) => ctx.db.patch(cartLineId, { quantity: 0 }));
    await expectCheckoutError(customer, "bad-quantity", "INVALID_QUANTITY");
    await t.run((ctx) => ctx.db.patch(cartLineId, { quantity: 1, catalogItemId: secondItemId }));
    await expect(
      customer.mutation(api.orders.submitCart, { requestKey: "mixed-catalog", catalogId: first.catalogId }),
    ).rejects.toThrow("ORDER_EMPTY");
    await t.run((ctx) => ctx.db.patch(cartLineId, { catalogItemId: firstItemId }));

    await admin.mutation(api.secretCatalogs.close, { catalogId: first.catalogId });
    await expectCheckoutError(customer, "closed-catalog", "ORDER_EMPTY");
    await admin.mutation(api.secretCatalogs.reopen, { catalogId: first.catalogId });
    await customer.mutation(api.carts.addItem, { catalogItemId: firstItemId });
    const access = await admin.query(api.catalogAccess.listForAdmin, { catalogId: first.catalogId });
    await admin.mutation(api.catalogAccess.revokeGrant, { grantId: access.grants[0].grantId });
    await expectCheckoutError(customer, "revoked-access", "ACCESS_GRANT_REQUIRED");
    expect(await graphCounts(t)).toEqual({ orders: 0, orderItems: 0, assignments: 0, statusHistory: 0 });
  });

  it("preserves the zero-Batch path and reuses mixed Batch eligibility/assignment", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const zeroBatchCatalog = await createOpenCatalog(admin, "Cart Zero Batch", "F106", "cart-zero-batch-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-zero-batch-code" });
    await addLine(t, customer, zeroBatchCatalog.catalogId, zeroBatchCatalog.variantIds[0]);
    const unassignedOrder = await customer.mutation(api.orders.submitCart, { requestKey: "zero-batch" });
    expect(unassignedOrder.orderId).toBeDefined();

    const mixedCatalog = await createOpenCatalog(admin, "Cart Mixed Batch", "F107", "cart-mixed-batch-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-mixed-batch-code" });
    await addLine(t, customer, mixedCatalog.catalogId, mixedCatalog.variantIds[0]);
    const eligibleBatch = await admin.mutation(api.batches.create, { name: "Cart Eligible Batch" });
    const closedBatch = await admin.mutation(api.batches.create, { name: "Cart Closed Batch" });
    await admin.mutation(api.batches.linkCatalog, {
      batchId: eligibleBatch.batchId,
      catalogId: mixedCatalog.catalogId,
    });
    await admin.mutation(api.batches.linkCatalog, { batchId: closedBatch.batchId, catalogId: mixedCatalog.catalogId });
    await t.run((ctx) => ctx.db.patch(closedBatch.batchId, { currentShipmentStage: "po_closed" }));

    const order = await customer.mutation(api.orders.submitCart, { requestKey: "mixed-batch" });
    const assignments = await t.run((ctx) => ctx.db.query("orderItemBatchAssignments").collect());
    expect(order.orderId).not.toBe(unassignedOrder.orderId);
    expect(assignments).toEqual([expect.objectContaining({ batchId: eligibleBatch.batchId, assignedQuantity: 1 })]);
  });

  it("rejects a linked Catalog with no receiving Batch before any Order write", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Cart Closed PO", "F108", "cart-closed-po-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-closed-po-code" });
    await addLine(t, customer, catalog.catalogId, catalog.variantIds[0]);
    const batch = await admin.mutation(api.batches.create, { name: "Cart Closed PO Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await t.run((ctx) => ctx.db.patch(batch.batchId, { currentShipmentStage: "po_closed" }));

    await expectCheckoutError(customer, "closed-po", "NO_ELIGIBLE_BATCH");
    expect(await graphCounts(t)).toEqual({ orders: 0, orderItems: 0, assignments: 0, statusHistory: 0 });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ retainedQuantity: 1 });
  });

  it("returns one Order for duplicate keys and at most one for concurrent tabs", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Cart Checkout Concurrency", "F109", "cart-concurrency-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-concurrency-code" });
    await addLine(t, customer, catalog.catalogId, catalog.variantIds[0]);

    const sameKey = await Promise.allSettled([
      customer.mutation(api.orders.submitCart, { requestKey: "same-key" }),
      customer.mutation(api.orders.submitCart, { requestKey: "same-key" }),
    ]);
    const sameKeyOrderIds = sameKey.flatMap((result) => (result.status === "fulfilled" ? [result.value.orderId] : []));
    expect(sameKeyOrderIds).toHaveLength(2);
    expect(new Set(sameKeyOrderIds).size).toBe(1);
    expect(await graphCounts(t)).toMatchObject({ orders: 1, orderItems: 1 });

    const secondCatalog = await createOpenCatalog(admin, "Cart Checkout Two Tabs", "F110", "cart-two-tabs-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-two-tabs-code" });
    await addLine(t, customer, secondCatalog.catalogId, secondCatalog.variantIds[0]);
    const differentKeys = await Promise.allSettled([
      customer.mutation(api.orders.submitCart, { requestKey: "tab-a" }),
      customer.mutation(api.orders.submitCart, { requestKey: "tab-b" }),
    ]);
    expect(differentKeys.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(differentKeys.filter((result) => result.status === "rejected")[0]?.reason.message).toContain(
      "CART_CHECKOUT_ALREADY_SUBMITTED",
    );
    expect(await graphCounts(t)).toMatchObject({ orders: 2, orderItems: 2 });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ lines: [], retainedQuantity: 0 });
  }, 30000);
});
