/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("order analytics report", () => {
  beforeEach(configureTestEnvironment);

  it("projects order items with customer, Catalog, close date, format, and source prices", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const closeDate = Date.parse("2026-10-10T23:59:59.999+07:00");
    const cargoTwo = await admin.mutation(api.secretCatalogs.createBundle, {
      name: "CARGO 2 Analytics",
      publisherName: "Publisher A",
      bookTitle: "Book A",
      accessCode: "analytics-cargo-two",
      closesAt: closeDate,
      variants: [
        { format: "HB", isbn: "9780002000001", priceAmount: 255000 },
        { format: "PB", isbn: "9780002000002", priceAmount: 170000 },
      ],
    });
    const publisherB = await admin.mutation(api.publishers.create, { name: "Publisher B" });
    const bookB = await admin.mutation(api.books.create, { publisherId: publisherB, title: "Book B" });
    await admin.mutation(api.books.update, { bookId: bookB, publicationStatus: "special" });
    const variantB = await admin.mutation(api.bookVariants.create, {
      bookId: bookB,
      format: "FLEXIBOUND",
      isbn: "9780002000003",
      priceAmount: 170000,
    });
    await admin.mutation(api.catalogItems.add, { catalogId: cargoTwo.catalogId, bookVariantId: variantB });
    const cargoThree = await createOpenCatalog(admin, "CARGO 3 Analytics", "2003", "analytics-cargo-three");
    await admin.mutation(api.secretCatalogs.update, {
      catalogId: cargoThree.catalogId,
      name: "CARGO 3 Analytics",
      closesAt: Date.parse("2026-11-10T23:59:59.999+07:00"),
    });
    await admin.mutation(api.secretCatalogs.open, { catalogId: cargoTwo.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-cargo-two" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-cargo-two" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-cargo-three" });

    await t.run(async (ctx) => {
      await ctx.db.patch(cargoTwo.variantIds[0], { supplierPriceGbpMinor: 1499 });
    });
    const firstOrder = await customer.mutation(api.orders.submit, {
      catalogId: cargoTwo.catalogId,
      customerName: "Blessy 6608",
      items: [
        { variantId: cargoTwo.variantIds[0], quantity: 1, expectedUnitPriceAmount: 255000 },
        { variantId: variantB, quantity: 2, expectedUnitPriceAmount: 170000 },
      ],
    });
    const secondOrder = await secondCustomer.mutation(api.orders.submit, {
      catalogId: cargoTwo.catalogId,
      customerName: "Second Blessfriend",
      items: [{ variantId: cargoTwo.variantIds[0], quantity: 1, expectedUnitPriceAmount: 255000 }],
    });
    const thirdOrder = await customer.mutation(api.orders.submit, {
      catalogId: cargoThree.catalogId,
      customerName: "Blessy 6608",
      items: [{ variantId: cargoThree.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 }],
    });
    await admin.mutation(api.secretCatalogs.close, { catalogId: cargoThree.catalogId });

    const report = await admin.query(api.reports.get, {
      from: Date.now() - 86_400_000,
      to: Date.now() + 86_400_000,
    });
    expect(report.orderAnalytics).toHaveLength(4);
    expect(report.orderAnalytics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: firstOrder.orderId,
          customerName: "Blessy 6608",
          publisherName: "Publisher A",
          isbn: "9780002000001",
          bookTitle: "Book A",
          format: "HB",
          quantity: 1,
          catalogName: "CARGO 2 Analytics",
          closeDate: closeDate,
          supplierPriceGbpMinor: 1499,
          unitPriceAmount: 255000,
        }),
        expect.objectContaining({
          orderId: firstOrder.orderId,
          publisherName: "Publisher B",
          isbn: "9780002000003",
          bookTitle: "Book B",
          format: "FLEXIBOUND",
          quantity: 2,
          unitPriceAmount: 170000,
          supplierPriceGbpMinor: null,
        }),
        expect.objectContaining({
          orderId: secondOrder.orderId,
          customerName: "Second Blessfriend",
          catalogName: "CARGO 2 Analytics",
        }),
        expect.objectContaining({
          orderId: thirdOrder.orderId,
          catalogName: "CARGO 3 Analytics",
          closeDate: Date.parse("2026-11-10T23:59:59.999+07:00"),
        }),
      ]),
    );
    expect(report.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orderId: firstOrder.orderId, customerName: "Blessy 6608" }),
        expect.objectContaining({ orderId: secondOrder.orderId, customerName: "Second Blessfriend" }),
      ]),
    );
    expect(report.invoices).toEqual([]);
    expect(report.batches).toEqual([]);
  });

  it("uses effective quantities and omits fully cancelled items", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "CARGO Cancellation Analytics", "2004", "analytics-cancellation");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "analytics-cancellation" });
    const partial = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Cancellation Customer",
      items: [{ variantId: bundle.variantIds[0], quantity: 3, expectedUnitPriceAmount: 125000 }],
    });
    const full = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Cancellation Customer",
      items: [{ variantId: bundle.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 }],
    });
    const orderItemId = async (orderId: typeof partial.orderId) =>
      t.run(async (ctx) => {
        const item = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (query) => query.eq("orderId", orderId))
          .first();
        if (!item) throw new Error("order item missing");
        return item._id;
      });
    await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: await orderItemId(partial.orderId),
      affectedQuantity: 1,
      reason: "partial cancellation test",
    });
    await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: await orderItemId(full.orderId),
      affectedQuantity: 1,
      reason: "full cancellation test",
    });

    const report = await admin.query(api.reports.get, {
      from: Date.now() - 86_400_000,
      to: Date.now() + 86_400_000,
    });
    expect(report.orderAnalytics).toEqual([expect.objectContaining({ orderId: partial.orderId, quantity: 2 })]);
  });
});
