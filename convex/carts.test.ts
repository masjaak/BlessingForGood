/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

async function createCartCatalog(admin: Awaited<ReturnType<typeof setupUsers>>["admin"], name = "Cart Catalog") {
  const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
    name,
    publisherName: `${name} Publisher`,
    bookTitle: `${name} Book`,
    accessCode: `${name.toLowerCase().replaceAll(" ", "-")}-code`,
    variants: [
      { format: "PB", isbn: `978${Date.now()}01`, priceAmount: 125000 },
      { format: "HB", isbn: `978${Date.now()}02`, priceAmount: 150000 },
    ],
  });
  await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
  return bundle;
}

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
    if (!item) throw new Error("Cart fixture Catalog Item missing");
    return item._id;
  });
}

async function patchCartCatalogItem(
  t: ReturnType<typeof testConvex>,
  catalogItemId: Id<"catalogItems">,
  values: Record<string, unknown>,
) {
  await t.run(async (ctx) => ctx.db.patch(catalogItemId, values));
}

describe("Customer Cart server domain", () => {
  beforeEach(configureTestEnvironment);

  it("starts empty, merges duplicate lines, separates Variants, and clears to an empty root", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createCartCatalog(admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-catalog-code" });
    const firstItemId = await catalogItemId(t, bundle.catalogId, bundle.variantIds[0]);
    const secondItemId = await catalogItemId(t, bundle.catalogId, bundle.variantIds[1]);

    expect(await customer.query(api.carts.getMine, {})).toMatchObject({ lines: [], retainedQuantity: 0 });
    await customer.mutation(api.carts.addItem, {
      catalogItemId: firstItemId,
      quantity: 2,
    });
    await customer.mutation(api.carts.addItem, { catalogItemId: firstItemId });
    const twoLines = await customer.mutation(api.carts.addItem, { catalogItemId: secondItemId });
    expect(twoLines).toMatchObject({ retainedLineCount: 2, retainedQuantity: 4, activeQuantity: 4 });
    expect(twoLines.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ catalogItemId: firstItemId, quantity: 3, observedUnitPriceAmount: 125000 }),
        expect.objectContaining({ catalogItemId: secondItemId, quantity: 1 }),
      ]),
    );

    const firstLine = twoLines.lines.find((line) => line.catalogItemId === firstItemId);
    if (!firstLine) throw new Error("first Cart line missing");
    const updated = await customer.mutation(api.carts.updateQuantity, { cartItemId: firstLine.id, quantity: 5 });
    expect(updated).toMatchObject({ retainedQuantity: 6, activeQuantity: 6 });
    const secondLine = updated.lines.find((line) => line.catalogItemId === secondItemId);
    if (!secondLine) throw new Error("second Cart line missing");
    const removed = await customer.mutation(api.carts.removeItem, { cartItemId: secondLine.id });
    expect(removed).toMatchObject({ retainedLineCount: 1, retainedQuantity: 5 });
    const emptyAfterLastRemove = await customer.mutation(api.carts.removeItem, { cartItemId: firstLine.id });
    expect(emptyAfterLastRemove).toMatchObject({
      id: updated.id,
      catalogId: null,
      lines: [],
      retainedQuantity: 0,
    });
    const cleared = await customer.mutation(api.carts.clear, {});
    expect(cleared).toMatchObject({ id: updated.id, catalogId: null, lines: [], retainedQuantity: 0 });
  });

  it("adds valid items from different Catalogs while preserving the legacy root metadata", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const first = await createCartCatalog(admin, "Cart Catalog A");
    const second = await createCartCatalog(admin, "Cart Catalog B");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-catalog-a-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-catalog-b-code" });
    const firstItemId = await catalogItemId(t, first.catalogId, first.variantIds[0]);
    const secondItemId = await catalogItemId(t, second.catalogId, second.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: firstItemId });

    const mixed = await customer.mutation(api.carts.addItem, { catalogItemId: secondItemId });
    expect(mixed).toMatchObject({
      catalogId: first.catalogId,
      retainedQuantity: 2,
      groups: expect.arrayContaining([
        expect.objectContaining({ id: first.catalogId }),
        expect.objectContaining({ id: second.catalogId }),
      ]),
    });
    await customer.mutation(api.carts.clear, {});
    await expect(customer.mutation(api.carts.addItem, { catalogItemId: secondItemId })).resolves.toMatchObject({
      catalogId: second.catalogId,
      retainedQuantity: 1,
    });
  });

  it("retains observed IDR price until explicit acknowledgement", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createCartCatalog(admin, "Cart Price Catalog");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-price-catalog-code" });
    const itemId = await catalogItemId(t, bundle.catalogId, bundle.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: itemId });

    await admin.mutation(api.bookVariants.update, { bookVariantId: bundle.variantIds[0], priceAmount: 125001 });
    let cart = await customer.query(api.carts.getMine, {});
    expect(cart.lines[0]).toMatchObject({
      observedUnitPriceAmount: 125000,
      currentUnitPriceAmount: 125001,
      priceChanged: true,
      checkoutEligible: false,
    });
    expect(cart).toMatchObject({ activeQuantity: 0, estimatedSubtotalAmount: 0 });

    cart = await customer.mutation(api.carts.acknowledgeCurrentLineState, { cartItemId: cart.lines[0].id });
    expect(cart.lines[0]).toMatchObject({
      observedUnitPriceAmount: 125001,
      priceChanged: false,
      checkoutEligible: true,
    });

    await patchCartCatalogItem(t, itemId, { priceOverrideAmount: 255000, updatedAt: Date.now() });
    cart = await customer.query(api.carts.getMine, {});
    expect(cart.lines[0]).toMatchObject({ currentUnitPriceAmount: 255000, priceChanged: true });
    await admin.mutation(api.bookVariants.update, { bookVariantId: bundle.variantIds[0], priceAmount: 255000 });
    cart = await customer.mutation(api.carts.acknowledgeCurrentLineState, { cartItemId: cart.lines[0].id });
    await patchCartCatalogItem(t, itemId, { priceOverrideAmount: undefined, updatedAt: Date.now() });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [expect.objectContaining({ currentUnitPriceAmount: 255000, priceChanged: false })],
    });
  });

  it("uses exact Rp1 comparisons and records unavailable-to-reopened acknowledgement state", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
      name: "Cart Exact Catalog",
      publisherName: "Cart Exact Publisher",
      bookTitle: "Cart Exact Book",
      accessCode: "cart-exact-code",
      variants: [{ format: "PB", isbn: `978${Date.now()}11`, priceAmount: 254998 }],
    });
    await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-exact-code" });
    const itemId = await catalogItemId(t, bundle.catalogId, bundle.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: itemId });
    await admin.mutation(api.bookVariants.update, { bookVariantId: bundle.variantIds[0], priceAmount: 254999 });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [expect.objectContaining({ currentUnitPriceAmount: 254999, priceChanged: true })],
    });
    for (const amount of [255000, 255001]) {
      await admin.mutation(api.bookVariants.update, { bookVariantId: bundle.variantIds[0], priceAmount: amount });
      await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
        lines: [expect.objectContaining({ currentUnitPriceAmount: amount, priceChanged: true })],
      });
    }

    await admin.mutation(api.secretCatalogs.close, { catalogId: bundle.catalogId });
    let cart = await customer.query(api.carts.getMine, {});
    expect(cart.lines[0]).toMatchObject({ availability: "catalog_closed", checkoutEligible: false });
    cart = await customer.mutation(api.carts.reconcile, {});
    expect(cart.lines[0]).toMatchObject({ reconciliationState: "unavailable" });
    await admin.mutation(api.secretCatalogs.reopen, { catalogId: bundle.catalogId });
    cart = await customer.query(api.carts.getMine, {});
    expect(cart.lines[0]).toMatchObject({
      availability: "active",
      reconciliationState: "unavailable",
      checkoutEligible: false,
    });
    cart = await customer.mutation(api.carts.reconcile, {});
    expect(cart.lines[0]).toMatchObject({
      reconciliationState: "available_pending_acknowledgement",
      checkoutEligible: false,
    });
    cart = await customer.mutation(api.carts.acknowledgeCurrentLineState, { cartItemId: cart.lines[0].id });
    expect(cart.lines[0]).toMatchObject({
      reconciliationState: "active",
      observedUnitPriceAmount: 255001,
      checkoutEligible: true,
    });
  });

  it("projects item, Variant, Book, Publisher, PO, and missing-data states without deleting intent", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createCartCatalog(admin, "Cart Availability Catalog");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-availability-catalog-code" });
    const itemId = await catalogItemId(t, bundle.catalogId, bundle.variantIds[0]);
    await customer.mutation(api.carts.addItem, { catalogItemId: itemId });
    const ids = await t.run(async (ctx) => {
      const item = await ctx.db.get(itemId);
      if (!item) throw new Error("item missing");
      const variant = await ctx.db.get(item.bookVariantId);
      if (!variant) throw new Error("variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("book missing");
      return { variantId: variant._id, bookId: book._id, publisherId: book.publisherId };
    });

    await patchCartCatalogItem(t, itemId, { isAvailable: false, updatedAt: Date.now() });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [
        expect.objectContaining({ availability: "catalog_item_unavailable", title: "Cart Availability Catalog Book" }),
      ],
    });
    await patchCartCatalogItem(t, itemId, { isAvailable: true, updatedAt: Date.now() });
    await t.run(async (ctx) => ctx.db.patch(ids.variantId, { isAvailable: false, updatedAt: Date.now() }));
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [expect.objectContaining({ availability: "variant_unavailable" })],
    });
    await t.run(async (ctx) => ctx.db.patch(ids.variantId, { isAvailable: true, updatedAt: Date.now() }));
    await t.run(async (ctx) => ctx.db.patch(ids.bookId, { isActive: false, updatedAt: Date.now() }));
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [expect.objectContaining({ availability: "book_unavailable" })],
    });
    await t.run(async (ctx) => ctx.db.patch(ids.bookId, { isActive: true, updatedAt: Date.now() }));
    await t.run(async (ctx) => ctx.db.patch(ids.publisherId, { isActive: false, updatedAt: Date.now() }));
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [expect.objectContaining({ availability: "publisher_unavailable" })],
    });
    await t.run(async (ctx) => ctx.db.patch(ids.publisherId, { isActive: true, updatedAt: Date.now() }));

    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    await t.run(async (ctx) => {
      const now = Date.now();
      const batchId = await ctx.db.insert("batches", {
        name: "Cart Closed PO",
        currentShipmentStage: "po_closed",
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        createdByUserId: adminUser.appUserId as Id<"appUsers">,
      });
      await ctx.db.insert("catalogBatchLinks", {
        catalogId: bundle.catalogId,
        batchId,
        createdAt: now,
        createdByUserId: adminUser.appUserId as Id<"appUsers">,
      });
    });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({
      lines: [expect.objectContaining({ availability: "po_closed" })],
    });

    await patchCartCatalogItem(t, itemId, { isAvailable: true, updatedAt: Date.now() });
    await t.run(async (ctx) => ctx.db.delete(itemId));
    const missing = await customer.query(api.carts.getMine, {});
    expect(missing.lines[0]).toMatchObject({ availability: "removed", title: null, checkoutEligible: false });
    await customer.mutation(api.carts.removeItem, { cartItemId: missing.lines[0].id });
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ lines: [] });
  });

  it("isolates Customers, rejects non-Customer access, validates quantities, and merges concurrent adds", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const bundle = await createCartCatalog(admin, "Cart Security Catalog");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-security-catalog-code" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "cart-security-catalog-code" });
    const itemId = await catalogItemId(t, bundle.catalogId, bundle.variantIds[0]);

    await expect(t.query(api.carts.getMine, {})).rejects.toThrow("IDENTITY_REQUIRED");
    await expect(admin.query(api.carts.getMine, {})).rejects.toThrow("CUSTOMER_REQUIRED");
    const initialResults = await Promise.allSettled([
      customer.mutation(api.carts.addItem, { catalogItemId: itemId }),
      customer.mutation(api.carts.addItem, { catalogItemId: itemId }),
    ]);
    expect(initialResults.every((result) => result.status === "fulfilled")).toBe(true);
    const ownerCart = await customer.query(api.carts.getMine, {});
    expect(ownerCart).toMatchObject({ retainedLineCount: 1, retainedQuantity: 2 });
    await expect(secondCustomer.query(api.carts.getMine, {})).resolves.toMatchObject({ lines: [] });
    await expect(secondCustomer.mutation(api.carts.removeItem, { cartItemId: ownerCart.lines[0].id })).rejects.toThrow(
      "CART_ITEM_NOT_FOUND",
    );
    await expect(
      customer.mutation(api.carts.updateQuantity, { cartItemId: ownerCart.lines[0].id, quantity: 0 }),
    ).rejects.toThrow("INVALID_QUANTITY");
    await expect(
      customer.mutation(api.carts.updateQuantity, { cartItemId: ownerCart.lines[0].id, quantity: 1.5 }),
    ).rejects.toThrow("INVALID_QUANTITY");
    await expect(
      customer.mutation(api.carts.updateQuantity, {
        cartItemId: ownerCart.lines[0].id,
        quantity: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).rejects.toThrow("INVALID_QUANTITY");

    const quantityRemoveResults = await Promise.allSettled([
      customer.mutation(api.carts.updateQuantity, { cartItemId: ownerCart.lines[0].id, quantity: 3 }),
      customer.mutation(api.carts.removeItem, { cartItemId: ownerCart.lines[0].id }),
    ]);
    expect(quantityRemoveResults.some((result) => result.status === "fulfilled")).toBe(true);
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ lines: [], catalogId: null });

    const secondBundle = await createCartCatalog(admin, "Cart Security Catalog B");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "cart-security-catalog-b-code" });
    const secondItemId = await catalogItemId(t, secondBundle.catalogId, secondBundle.variantIds[0]);
    await customer.mutation(api.carts.clear, {});
    const crossCatalogResults = await Promise.allSettled([
      customer.mutation(api.carts.addItem, { catalogItemId: itemId }),
      customer.mutation(api.carts.addItem, { catalogItemId: secondItemId }),
    ]);
    const fulfilledCount = crossCatalogResults.filter((result) => result.status === "fulfilled").length;
    expect(fulfilledCount).toBe(2);
    await expect(customer.query(api.carts.getMine, {})).resolves.toMatchObject({ retainedLineCount: 2 });

    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    await t.run(async (ctx) => {
      await ctx.db.patch(customerUser.appUserId, { status: "suspended", updatedAt: Date.now() });
    });
    await expect(customer.query(api.carts.getMine, {})).rejects.toThrow("USER_SUSPENDED");
    await expect(customer.mutation(api.carts.clear, {})).rejects.toThrow("USER_SUSPENDED");
  });
});
