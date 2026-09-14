/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function setCatalogOverride(
  t: ReturnType<typeof testConvex>,
  catalogId: Id<"secretCatalogs">,
  variantId: Id<"bookVariants">,
  priceOverrideAmount: number | undefined,
) {
  await t.run(async (ctx) => {
    const item = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog_and_variant", (query) => query.eq("catalogId", catalogId).eq("bookVariantId", variantId))
      .unique();
    if (!item) throw new Error("catalog item missing");
    await ctx.db.patch(item._id, { priceOverrideAmount });
  });
}

async function graphCounts(t: ReturnType<typeof testConvex>) {
  return t.run(async (ctx) => ({
    orders: (await ctx.db.query("orders").collect()).length,
    orderItems: (await ctx.db.query("orderItems").collect()).length,
    assignments: (await ctx.db.query("orderItemBatchAssignments").collect()).length,
  }));
}

describe("BFG Secret Catalog price reconciliation", () => {
  beforeEach(configureTestEnvironment);

  it("allows a stable observed price and snapshots the canonical amount", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Stable Price Catalog", "7201", "stable-price-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "stable-price-code" });

    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Stable Price Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 }],
    });

    expect(order.items[0]).toMatchObject({ unitPriceAmountSnapshot: 125000 });
  });

  it("rejects a changed Catalog override before insertion and allows deliberate resubmission", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Price Reconciliation Catalog", "7202", "price-reconciliation-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "price-reconciliation-code" });

    const observed = await customer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId });
    expect(observed?.books[0]?.variants[0]?.price).toBe(125000);
    const variantId = catalog.variantIds[0];

    await setCatalogOverride(t, catalog.catalogId, variantId, 130000);

    const before = await graphCounts(t);
    const rejection = await customer
      .mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Price Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 125000 }],
      })
      .then(
        () => null,
        (reason) => reason,
      );
    expect(rejection).toMatchObject({
      data: {
        code: "PRICE_CHANGED",
        changes: [
          {
            catalogItemId: expect.any(String),
            variantId,
            observedUnitPriceAmount: 125000,
            currentUnitPriceAmount: 130000,
          },
        ],
      },
    });
    await expect(graphCounts(t)).resolves.toEqual(before);
    await expect(
      customer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId }),
    ).resolves.toMatchObject({
      books: [expect.objectContaining({ variants: [expect.objectContaining({ id: variantId, price: 130000 })] })],
    });

    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Price Customer",
      items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 130000 }],
    });
    expect(order.items[0]).toMatchObject({ unitPriceAmountSnapshot: 130000 });
  });

  it("rejects a changed Variant base price", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Base Price Catalog", "7203", "base-price-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "base-price-code" });
    const variantId = catalog.variantIds[0];
    await admin.mutation(api.bookVariants.update, { bookVariantId: variantId, priceAmount: 130000 });

    const rejection = await customer
      .mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Base Price Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 125000 }],
      })
      .then(
        () => null,
        (reason) => reason,
      );
    expect(rejection).toMatchObject({ data: { code: "PRICE_CHANGED", changes: [{ currentUnitPriceAmount: 130000 }] } });
    await expect(graphCounts(t)).resolves.toEqual({ orders: 0, orderItems: 0, assignments: 0 });
  });

  it("does not reject when the effective amount stays unchanged across override changes", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Same Amount Catalog", "7204", "same-amount-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "same-amount-code" });
    const variantId = catalog.variantIds[0];

    await setCatalogOverride(t, catalog.catalogId, variantId, 125000);
    await expect(
      customer.mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Same Amount Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 125000 }],
      }),
    ).resolves.toBeDefined();

    await setCatalogOverride(t, catalog.catalogId, variantId, undefined);
    await expect(
      customer.mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Same Amount Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 125000 }],
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    [254998, 254999],
    [254999, 255000],
    [255000, 255001],
    [255001, 255000],
  ])("treats an exact Rp1 change as a mismatch (%s to %s)", async (observedAmount, currentAmount) => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(
      admin,
      `Exact Money ${observedAmount}`,
      String(observedAmount),
      `exact-money-${observedAmount}`,
    );
    await customer.mutation(api.catalogAccess.unlock, { accessCode: `exact-money-${observedAmount}` });
    const variantId = catalog.variantIds[0];
    await admin.mutation(api.bookVariants.update, { bookVariantId: variantId, priceAmount: currentAmount });

    const rejection = await customer
      .mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Exact Money Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: observedAmount }],
      })
      .then(
        () => null,
        (reason) => reason,
      );
    expect(rejection).toMatchObject({
      data: {
        code: "PRICE_CHANGED",
        changes: [{ observedUnitPriceAmount: observedAmount, currentUnitPriceAmount: currentAmount }],
      },
    });
    await expect(graphCounts(t)).resolves.toEqual({ orders: 0, orderItems: 0, assignments: 0 });
  });

  it("rejects the whole multi-line submission when one or more prices are stale", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await admin.mutation(api.secretCatalogs.createBundle, {
      name: "Multi-line Price Catalog",
      publisherName: "Multi-line Publisher",
      bookTitle: "Multi-line Book",
      accessCode: "multi-line-price-code",
      variants: [
        { format: "PB", isbn: "97800007201", priceAmount: 125000 },
        { format: "HB", isbn: "97800007202", priceAmount: 125001 },
        { format: "BB", isbn: "97800007203", priceAmount: 125002 },
      ],
    });
    await admin.mutation(api.secretCatalogs.open, { catalogId: catalog.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-line-price-code" });

    await admin.mutation(api.bookVariants.update, { bookVariantId: catalog.variantIds[1], priceAmount: 130001 });
    const oneStaleRejection = await customer
      .mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Multi-line Customer",
        items: [
          { variantId: catalog.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 },
          { variantId: catalog.variantIds[1], quantity: 1, expectedUnitPriceAmount: 125001 },
          { variantId: catalog.variantIds[2], quantity: 1, expectedUnitPriceAmount: 125002 },
        ],
      })
      .then(
        () => null,
        (reason) => reason,
      );
    expect(oneStaleRejection).toMatchObject({
      data: { code: "PRICE_CHANGED", changes: [{ variantId: catalog.variantIds[1], currentUnitPriceAmount: 130001 }] },
    });
    await expect(graphCounts(t)).resolves.toEqual({ orders: 0, orderItems: 0, assignments: 0 });

    await admin.mutation(api.bookVariants.update, { bookVariantId: catalog.variantIds[2], priceAmount: 130002 });
    const multipleStaleRejection = await customer
      .mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Multi-line Customer",
        items: [
          { variantId: catalog.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 },
          { variantId: catalog.variantIds[1], quantity: 1, expectedUnitPriceAmount: 125001 },
          { variantId: catalog.variantIds[2], quantity: 1, expectedUnitPriceAmount: 125002 },
        ],
      })
      .then(
        () => null,
        (reason) => reason,
      );
    expect(multipleStaleRejection).toMatchObject({
      data: {
        code: "PRICE_CHANGED",
        changes: expect.arrayContaining([
          expect.objectContaining({ variantId: catalog.variantIds[1], currentUnitPriceAmount: 130001 }),
          expect.objectContaining({ variantId: catalog.variantIds[2], currentUnitPriceAmount: 130002 }),
        ]),
      },
    });
    expect(multipleStaleRejection.data.changes).toHaveLength(2);
    await expect(graphCounts(t)).resolves.toEqual({ orders: 0, orderItems: 0, assignments: 0 });
  });

  it("revalidates after reconciliation when the price changes twice", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Changing Price Catalog", "7205", "changing-price-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "changing-price-code" });
    const variantId = catalog.variantIds[0];

    await setCatalogOverride(t, catalog.catalogId, variantId, 130000);
    await expect(
      customer.mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Changing Price Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 125000 }],
      }),
    ).rejects.toMatchObject({ data: { code: "PRICE_CHANGED" } });

    await setCatalogOverride(t, catalog.catalogId, variantId, 135000);
    await expect(
      customer.mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Changing Price Customer",
        items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 130000 }],
      }),
    ).rejects.toMatchObject({ data: { code: "PRICE_CHANGED" } });

    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Changing Price Customer",
      items: [{ variantId, quantity: 1, expectedUnitPriceAmount: 135000 }],
    });
    expect(order.items[0]).toMatchObject({ unitPriceAmountSnapshot: 135000 });
  });
});
