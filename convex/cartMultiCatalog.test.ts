/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

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
    if (!item) throw new Error("Multi-Catalog Cart fixture item missing");
    return item._id;
  });
}

async function createCatalogSet(
  t: ReturnType<typeof testConvex>,
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
) {
  const first = await admin.mutation(api.secretCatalogs.createBundle, {
    name: "Multi Cart A",
    publisherName: "Multi Cart A Publisher",
    bookTitle: "Multi Cart Shared Book",
    accessCode: "multi-cart-a-code",
    variants: [
      { format: "PB", isbn: "9780000002001", priceAmount: 125000 },
      { format: "HB", isbn: "9780000002002", priceAmount: 150000 },
    ],
  });
  const second = await admin.mutation(api.secretCatalogs.createBundle, {
    name: "Multi Cart B",
    publisherName: "Multi Cart B Publisher",
    bookTitle: "Multi Cart B Book",
    accessCode: "multi-cart-b-code",
    variants: [{ format: "PB", isbn: "9780000002101", priceAmount: 130000 }],
  });
  const third = await admin.mutation(api.secretCatalogs.createBundle, {
    name: "Multi Cart C",
    publisherName: "Multi Cart C Publisher",
    bookTitle: "Multi Cart C Book",
    accessCode: "multi-cart-c-code",
    variants: [{ format: "HB", isbn: "9780000002201", priceAmount: 175000 }],
  });
  for (const catalogId of [first.catalogId, second.catalogId, third.catalogId]) {
    await admin.mutation(api.secretCatalogs.open, { catalogId });
  }
  const sharedSecondItemId = await admin.mutation(api.catalogItems.add, {
    catalogId: second.catalogId,
    bookVariantId: first.variantIds[0],
    priceOverrideAmount: 135000,
  });
  return {
    first,
    second,
    third,
    firstItemId: await catalogItemId(t, first.catalogId, first.variantIds[0]),
    sharedSecondItemId,
    secondItemId: await catalogItemId(t, second.catalogId, second.variantIds[0]),
    thirdItemId: await catalogItemId(t, third.catalogId, third.variantIds[0]),
  };
}

async function createCatalogFixture(
  t: ReturnType<typeof testConvex>,
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
) {
  const first = await admin.mutation(api.secretCatalogs.createBundle, {
    name: "Multi Cart A",
    publisherName: "Multi Cart A Publisher",
    bookTitle: "Multi Cart A Book",
    accessCode: "multi-cart-a-code",
    variants: [{ format: "PB", isbn: "9780000002301", priceAmount: 125000 }],
  });
  const second = await admin.mutation(api.secretCatalogs.createBundle, {
    name: "Multi Cart B",
    publisherName: "Multi Cart B Publisher",
    bookTitle: "Multi Cart B Book",
    accessCode: "multi-cart-b-code",
    variants: [{ format: "HB", isbn: "9780000002401", priceAmount: 150000 }],
  });
  await admin.mutation(api.secretCatalogs.open, { catalogId: first.catalogId });
  await admin.mutation(api.secretCatalogs.open, { catalogId: second.catalogId });
  const firstItemId = await catalogItemId(t, first.catalogId, first.variantIds[0]);
  const secondItemId = await catalogItemId(t, second.catalogId, second.variantIds[0]);
  return { first, second, firstItemId, secondItemId };
}

async function addDirectLine(
  t: ReturnType<typeof testConvex>,
  customer: Awaited<ReturnType<typeof setupUsers>>["customer"],
  catalogItemId: Id<"catalogItems">,
  quantity: number,
) {
  const cart = await customer.query(api.carts.getMine, {});
  if (!cart.id) throw new Error("Multi-Catalog Cart root missing");
  await t.run(async (ctx) => {
    const catalogItem = await ctx.db.get(catalogItemId);
    if (!catalogItem) throw new Error("Multi-Catalog Cart Catalog Item missing");
    const variant = await ctx.db.get(catalogItem.bookVariantId);
    if (!variant) throw new Error("Multi-Catalog Cart Variant missing");
    const now = Date.now();
    await ctx.db.insert("cartItems", {
      cartId: cart.id as Id<"carts">,
      catalogItemId,
      quantity,
      observedUnitPriceAmount: catalogItem.priceOverrideAmount ?? variant.priceAmount,
      availabilityState: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

type CartView = NonNullable<FunctionReturnType<typeof api.carts.getMine>>;

function groupFor(cart: CartView, catalogId: Id<"secretCatalogs">) {
  return cart.groups.find((group) => group.id === catalogId);
}

describe("Multi-Catalog Cart M2 projection", () => {
  beforeEach(configureTestEnvironment);

  it("runs the CARGO 1 → CARGO 2 → CARGO 3 customer journey end to end", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogSet(t, admin);
    for (const accessCode of ["multi-cart-a-code", "multi-cart-b-code", "multi-cart-c-code"]) {
      await customer.mutation(api.catalogAccess.unlock, { accessCode });
    }

    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.sharedSecondItemId });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.thirdItemId });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      retainedQuantity: 3,
      groups: [
        expect.objectContaining({ id: fixture.first.catalogId, retainedQuantity: 1 }),
        expect.objectContaining({ id: fixture.second.catalogId, retainedQuantity: 1 }),
        expect.objectContaining({ id: fixture.third.catalogId, retainedQuantity: 1 }),
      ],
    });

    await t.run((ctx) => ctx.db.patch(fixture.firstItemId, { isAvailable: false }));
    const blockedCart = await customer.query(api.carts.getMine, {});
    expect(groupFor(blockedCart, fixture.first.catalogId)).toMatchObject({ checkoutEligible: false });
    expect(groupFor(blockedCart, fixture.second.catalogId)).toMatchObject({ checkoutEligible: true });
    expect(groupFor(blockedCart, fixture.third.catalogId)).toMatchObject({ checkoutEligible: true });

    const secondOrder = await customer.mutation(api.orders.submitCart, {
      requestKey: "cargo-2-checkout",
      catalogId: fixture.second.catalogId,
    });
    expect(secondOrder).toMatchObject({ catalogId: fixture.second.catalogId, totalAmount: 135000 });
    await expect(
      customer.mutation(api.orders.submitCart, {
        requestKey: "cargo-2-checkout",
        catalogId: fixture.second.catalogId,
      }),
    ).resolves.toMatchObject({ orderId: secondOrder.orderId });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ retainedQuantity: 2 });

    await t.run((ctx) => ctx.db.patch(fixture.firstItemId, { isAvailable: true }));
    const firstOrder = await customer.mutation(api.orders.submitCart, {
      requestKey: "cargo-1-checkout",
      catalogId: fixture.first.catalogId,
    });
    const thirdOrder = await customer.mutation(api.orders.submitCart, {
      requestKey: "cargo-3-checkout",
      catalogId: fixture.third.catalogId,
    });
    expect(firstOrder.catalogId).toBe(fixture.first.catalogId);
    expect(thirdOrder.catalogId).toBe(fixture.third.catalogId);
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(3);
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ lines: [], retainedQuantity: 0 });
  });

  it("derives A/B/C groups from Catalog Items and preserves the legacy root contract", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogSet(t, admin);
    for (const accessCode of ["multi-cart-a-code", "multi-cart-b-code", "multi-cart-c-code"]) {
      await customer.mutation(api.catalogAccess.unlock, { accessCode });
    }

    const first = await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId, quantity: 2 });
    expect(first).toMatchObject({ catalogId: fixture.first.catalogId, catalogConsistency: "consistent" });
    await addDirectLine(t, customer, fixture.sharedSecondItemId, 3);
    await addDirectLine(t, customer, fixture.thirdItemId, 4);

    const cart = await customer.query(api.carts.getMine, {});
    const concurrentReads = await Promise.all([
      customer.query(api.carts.getMine, {}),
      customer.query(api.carts.getMine, {}),
    ]);
    expect(concurrentReads[0].groups).toEqual(concurrentReads[1].groups);
    expect(cart).toMatchObject({
      catalogId: fixture.first.catalogId,
      catalogConsistency: "legacy_mismatch",
      retainedLineCount: 3,
      retainedQuantity: 9,
      activeLineCount: 3,
      activeQuantity: 9,
      estimatedSubtotalAmount: 250000 + 405000 + 700000,
    });
    expect(cart.groups).toHaveLength(3);
    expect(new Set(cart.groups.map((group) => group.id))).toEqual(
      new Set([fixture.first.catalogId, fixture.second.catalogId, fixture.third.catalogId]),
    );
    expect(groupFor(cart, fixture.first.catalogId)).toMatchObject({
      retainedQuantity: 2,
      activeQuantity: 2,
      activeSubtotalAmount: 250000,
      checkoutEligible: true,
      accessState: "granted",
    });
    expect(groupFor(cart, fixture.second.catalogId)).toMatchObject({
      retainedQuantity: 3,
      activeQuantity: 3,
      activeSubtotalAmount: 405000,
      checkoutEligible: true,
    });
    expect(groupFor(cart, fixture.third.catalogId)).toMatchObject({
      retainedQuantity: 4,
      activeQuantity: 4,
      activeSubtotalAmount: 700000,
      checkoutEligible: true,
    });
    const firstLine = groupFor(cart, fixture.first.catalogId)?.lines[0];
    const secondLine = groupFor(cart, fixture.second.catalogId)?.lines[0];
    expect(firstLine?.catalogItemId).not.toBe(secondLine?.catalogItemId);
    expect(firstLine?.title).toBe(secondLine?.title);

    await t.run((ctx) => ctx.db.patch(cart.id as Id<"carts">, { catalogId: undefined }));
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      catalogId: null,
      catalogConsistency: "legacy_missing",
      groups: expect.arrayContaining([
        expect.objectContaining({ id: fixture.first.catalogId }),
        expect.objectContaining({ id: fixture.second.catalogId }),
        expect.objectContaining({ id: fixture.third.catalogId }),
      ]),
    });
  });

  it("characterizes ten Catalog groups and 100 retained lines without changing the page contract", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixtures: Array<{ catalogId: Id<"secretCatalogs">; itemId: Id<"catalogItems"> }> = [];
    for (let index = 0; index < 10; index += 1) {
      const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
        name: `Cart Scale Catalog ${index}`,
        publisherName: `Cart Scale Publisher ${index}`,
        bookTitle: `Cart Scale Book ${index}`,
        accessCode: `cart-scale-${index}-code`,
        variants: [{ format: "PB", isbn: `9780000003${String(index).padStart(3, "0")}`, priceAmount: 125000 }],
      });
      await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
      await customer.mutation(api.catalogAccess.unlock, { accessCode: `cart-scale-${index}-code` });
      fixtures.push({
        catalogId: bundle.catalogId,
        itemId: await catalogItemId(t, bundle.catalogId, bundle.variantIds[0]),
      });
    }

    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("scale Customer missing");
    await t.run(async (ctx) => {
      const now = Date.now();
      const cartId = await ctx.db.insert("carts", {
        customerUserId: customerUser.appUserId,
        catalogId: fixtures[0].catalogId,
        createdAt: now,
        updatedAt: now,
      });
      for (const [groupIndex, fixture] of fixtures.entries()) {
        const catalogItem = await ctx.db.get(fixture.itemId);
        if (!catalogItem) throw new Error("scale Catalog Item missing");
        const variant = await ctx.db.get(catalogItem.bookVariantId);
        if (!variant) throw new Error("scale Variant missing");
        const unitPriceAmount = catalogItem.priceOverrideAmount ?? variant.priceAmount;
        for (let lineIndex = 0; lineIndex < 10; lineIndex += 1) {
          await ctx.db.insert("cartItems", {
            cartId,
            catalogItemId: fixture.itemId,
            quantity: 1,
            observedUnitPriceAmount: unitPriceAmount,
            availabilityState: "active",
            createdAt: now + groupIndex * 10 + lineIndex,
            updatedAt: now + groupIndex * 10 + lineIndex,
          });
        }
      }
    });

    await expect(customer.query(api.carts.getMineSummary, {})).resolves.toMatchObject({
      retainedLineCount: 100,
      retainedQuantity: 100,
    });
    const cart = await customer.query(api.carts.getMine, {});
    expect(cart).toMatchObject({ retainedLineCount: 100, retainedQuantity: 100 });
    expect(cart.groups).toHaveLength(10);
    expect(cart.groups.every((group) => group.lines.length === 10)).toBe(true);
  }, 30000);

  it("isolates availability, price, and PO failures to one Catalog group and clears it on close", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogFixture(t, admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-b-code" });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await addDirectLine(t, customer, fixture.secondItemId, 2);

    const ids = await t.run(async (ctx) => {
      const item = await ctx.db.get(fixture.firstItemId);
      if (!item) throw new Error("first item missing");
      const variant = await ctx.db.get(item.bookVariantId);
      if (!variant) throw new Error("first variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("first book missing");
      return { itemId: item._id, variantId: variant._id, bookId: book._id, publisherId: book.publisherId };
    });
    const assertSecondGroupActive = async () => {
      const cart = await customer.query(api.carts.getMine, {});
      expect(groupFor(cart, fixture.second.catalogId)).toMatchObject({
        activeQuantity: 2,
        activeSubtotalAmount: 300000,
        checkoutEligible: true,
      });
      return cart;
    };

    await t.run((ctx) => ctx.db.patch(ids.itemId, { isAvailable: false }));
    expect(groupFor(await assertSecondGroupActive(), fixture.first.catalogId)).toMatchObject({
      blockedReason: "catalog_item_unavailable",
      checkoutEligible: false,
    });
    await t.run((ctx) => ctx.db.patch(ids.itemId, { isAvailable: true }));

    await t.run((ctx) => ctx.db.patch(ids.variantId, { isAvailable: false }));
    expect(groupFor(await assertSecondGroupActive(), fixture.first.catalogId)).toMatchObject({
      blockedReason: "variant_unavailable",
    });
    await t.run((ctx) => ctx.db.patch(ids.variantId, { isAvailable: true }));

    await t.run((ctx) => ctx.db.patch(ids.bookId, { isActive: false }));
    expect(groupFor(await assertSecondGroupActive(), fixture.first.catalogId)).toMatchObject({
      blockedReason: "book_unavailable",
    });
    await t.run((ctx) => ctx.db.patch(ids.bookId, { isActive: true }));

    await t.run((ctx) => ctx.db.patch(ids.publisherId, { isActive: false }));
    expect(groupFor(await assertSecondGroupActive(), fixture.first.catalogId)).toMatchObject({
      blockedReason: "publisher_unavailable",
    });
    await t.run((ctx) => ctx.db.patch(ids.publisherId, { isActive: true }));

    await admin.mutation(api.bookVariants.update, { bookVariantId: ids.variantId, priceAmount: 125001 });
    expect(groupFor(await assertSecondGroupActive(), fixture.first.catalogId)).toMatchObject({
      blockedReason: "price_changed",
      checkoutEligible: false,
    });
    await admin.mutation(api.bookVariants.update, { bookVariantId: ids.variantId, priceAmount: 125000 });

    const batch = await admin.mutation(api.batches.create, { name: "Multi Cart Closed PO" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: fixture.first.catalogId });
    await t.run((ctx) => ctx.db.patch(batch.batchId, { currentShipmentStage: "po_closed" }));
    expect(groupFor(await assertSecondGroupActive(), fixture.first.catalogId)).toMatchObject({
      blockedReason: "po_closed",
      checkoutEligible: false,
    });

    await admin.mutation(api.secretCatalogs.close, { catalogId: fixture.first.catalogId });
    const afterClose = await assertSecondGroupActive();
    expect(groupFor(afterClose, fixture.first.catalogId)).toBeUndefined();
    expect(afterClose).toMatchObject({
      retainedQuantity: 2,
      groups: [expect.objectContaining({ id: fixture.second.catalogId })],
    });
  });

  it("isolates revoked access and removed Catalog Items without breaking another group", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogFixture(t, admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-b-code" });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await addDirectLine(t, customer, fixture.secondItemId, 2);
    const cartBeforeRemoval = await customer.query(api.carts.getMine, {});
    const firstLineId = cartBeforeRemoval.lines.find((line) => line.catalogItemId === fixture.firstItemId)?.id;
    if (!firstLineId) throw new Error("first Cart line missing");

    const access = await admin.query(api.catalogAccess.listForAdmin, { catalogId: fixture.first.catalogId });
    await admin.mutation(api.catalogAccess.revokeGrant, { grantId: access.grants[0].grantId });
    const revoked = await customer.query(api.carts.getMine, {});
    expect(groupFor(revoked, fixture.first.catalogId)).toMatchObject({
      accessState: "revoked",
      blockedReason: "access_revoked",
      retainedQuantity: 1,
      activeQuantity: 0,
      checkoutEligible: false,
      lines: [expect.objectContaining({ title: null, isbn: null, availability: "removed" })],
    });
    expect(groupFor(revoked, fixture.second.catalogId)).toMatchObject({
      accessState: "granted",
      activeQuantity: 2,
      checkoutEligible: true,
    });

    await t.run((ctx) => ctx.db.delete(fixture.firstItemId));
    const removed = await customer.query(api.carts.getMine, {});
    expect(removed.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: null, blockedReason: "removed" }),
        expect.objectContaining({ id: fixture.second.catalogId, checkoutEligible: true }),
      ]),
    );
    await customer.mutation(api.carts.removeItem, { cartItemId: firstLineId as Id<"cartItems"> });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ retainedQuantity: 2 });
  });

  it("requires a Catalog selector and submits only the selected mixed-Cart group", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogFixture(t, admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-b-code" });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await addDirectLine(t, customer, fixture.secondItemId, 2);

    await expect(customer.mutation(api.orders.submitCart, { requestKey: "mixed-m2-cart" })).rejects.toThrow(
      "CART_CHECKOUT_CATALOG_REQUIRED",
    );
    const firstOrder = await customer.mutation(api.orders.submitCart, {
      requestKey: "mixed-m2-cart-a",
      catalogId: fixture.first.catalogId,
    });
    expect(firstOrder).toMatchObject({ catalogId: fixture.first.catalogId, totalAmount: 125000 });
    expect(firstOrder.items).toEqual([expect.objectContaining({ catalogItemId: fixture.firstItemId, quantity: 1 })]);
    await expect(
      customer.mutation(api.orders.submitCart, {
        requestKey: "mixed-m2-cart-a",
        catalogId: fixture.first.catalogId,
      }),
    ).resolves.toMatchObject({ orderId: firstOrder.orderId });
    await expect(
      customer.mutation(api.orders.submitCart, {
        requestKey: "mixed-m2-cart-a-retry-with-new-key",
        catalogId: fixture.first.catalogId,
      }),
    ).rejects.toThrow("CART_CHECKOUT_ALREADY_SUBMITTED");
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      retainedQuantity: 2,
      groups: [expect.objectContaining({ id: fixture.second.catalogId, retainedQuantity: 2 })],
    });
    const secondOrder = await customer.mutation(api.orders.submitCart, {
      requestKey: "mixed-m2-cart-b",
      catalogId: fixture.second.catalogId,
    });
    expect(secondOrder).toMatchObject({ catalogId: fixture.second.catalogId, totalAmount: 300000 });
    await expect(
      customer.mutation(api.orders.submitCart, { requestKey: "mixed-m2-cart-b", catalogId: fixture.second.catalogId }),
    ).resolves.toMatchObject({ orderId: secondOrder.orderId });
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(2);
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ retainedQuantity: 0, lines: [] });

    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    const futureOrder = await customer.mutation(api.orders.submitCart, {
      requestKey: "mixed-m2-cart-future",
      catalogId: fixture.first.catalogId,
    });
    expect(futureOrder.orderId).not.toBe(firstOrder.orderId);
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(3);
  });

  it("checks out a selected group while 250 retained lines remain in another group", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogFixture(t, admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-b-code" });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await addDirectLine(t, customer, fixture.secondItemId, 1);

    const cart = await customer.query(api.carts.getMine, {});
    if (!cart.id) throw new Error("scale Cart root missing");
    const secondItem = await t.run((ctx) => ctx.db.get(fixture.secondItemId));
    if (!secondItem) throw new Error("scale second Catalog Item missing");
    const secondVariant = await t.run((ctx) => ctx.db.get(secondItem.bookVariantId));
    if (!secondVariant) throw new Error("scale second Variant missing");
    const unitPriceAmount = secondItem.priceOverrideAmount ?? secondVariant.priceAmount;
    await t.run(async (ctx) => {
      const now = Date.now();
      for (let index = 0; index < 250; index += 1) {
        await ctx.db.insert("cartItems", {
          cartId: cart.id as Id<"carts">,
          catalogItemId: fixture.secondItemId,
          quantity: 1,
          observedUnitPriceAmount: unitPriceAmount,
          availabilityState: "active",
          createdAt: now + index,
          updatedAt: now + index,
        });
      }
    });

    await expect(customer.query(api.carts.getMineSummary, {})).resolves.toMatchObject({
      retainedLineCount: 252,
      retainedQuantity: 252,
    });
    const order = await customer.mutation(api.orders.submitCart, {
      requestKey: "selected-group-with-retained-lines",
      catalogId: fixture.first.catalogId,
    });
    expect(order).toMatchObject({ catalogId: fixture.first.catalogId, totalAmount: 125000 });

    const remaining = await t.run(async (ctx) => {
      const lines = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (query) => query.eq("cartId", cart.id as Id<"carts">))
        .collect();
      return {
        count: lines.length,
        allSecondCatalogItem: lines.every((line) => line.catalogItemId === fixture.secondItemId),
      };
    });
    expect(remaining).toEqual({ count: 251, allSecondCatalogItem: true });
    await expect(customer.query(api.carts.getMineSummary, {})).resolves.toMatchObject({
      retainedLineCount: 251,
      retainedQuantity: 251,
    });
  }, 30000);

  it("checks out different Catalog groups independently under concurrency", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogFixture(t, admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-b-code" });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await addDirectLine(t, customer, fixture.secondItemId, 2);

    const results = await Promise.allSettled([
      customer.mutation(api.orders.submitCart, {
        requestKey: "concurrent-catalog-a",
        catalogId: fixture.first.catalogId,
      }),
      customer.mutation(api.orders.submitCart, {
        requestKey: "concurrent-catalog-b",
        catalogId: fixture.second.catalogId,
      }),
    ]);
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    expect(results.map((result) => (result.status === "fulfilled" ? result.value.catalogId : null))).toEqual(
      expect.arrayContaining([fixture.first.catalogId, fixture.second.catalogId]),
    );
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(2);
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ lines: [], retainedQuantity: 0 });
  }, 30000);

  it("leaves a blocked Catalog group untouched while a valid group checks out", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const fixture = await createCatalogFixture(t, admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-cart-b-code" });
    await customer.mutation(api.carts.addItem, { catalogItemId: fixture.firstItemId });
    await addDirectLine(t, customer, fixture.secondItemId, 2);
    await t.run((ctx) => ctx.db.patch(fixture.firstItemId, { isAvailable: false }));

    await expect(
      customer.mutation(api.orders.submitCart, {
        requestKey: "blocked-catalog-a",
        catalogId: fixture.first.catalogId,
      }),
    ).rejects.toThrow("BOOK_VARIANT_UNAVAILABLE");
    const order = await customer.mutation(api.orders.submitCart, {
      requestKey: "valid-catalog-b",
      catalogId: fixture.second.catalogId,
    });
    expect(order).toMatchObject({ catalogId: fixture.second.catalogId, totalAmount: 300000 });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      retainedQuantity: 1,
      groups: [expect.objectContaining({ id: fixture.first.catalogId, checkoutEligible: false })],
    });
  });
});
