/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

async function createPublishedListing(
  title = "Manual Ready Book",
  priceAmount = 195000,
  quantity = 3,
) {
  const t = testConvex();
  const users = await setupUsers(t);
  const created = await users.admin.mutation(api.readyStockManual.create, {
    title,
    priceAmount,
    format: "PB",
    quantity,
    status: "draft",
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(created.listingId, { status: "published" });
  });
  return { t, ...users, listingId: created.listingId };
}

describe("Standalone Ready Stock catalog", () => {
  beforeEach(configureTestEnvironment);

  it("stores manual listings independently from Master Buku", async () => {
    const { t, admin, listingId } = await createPublishedListing();

    expect(await t.run((ctx) => ctx.db.query("books").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("bookVariants").collect())).toEqual([]);
    expect(await t.query(api.readyStockManual.getBySlug, { slug: "manual-ready-book" })).toMatchObject({
      listingId,
      title: "Manual Ready Book",
      priceAmount: 195000,
      format: "PB",
      quantity: 3,
      reservedQuantity: 0,
      availableQuantity: 3,
      status: "published",
    });
    expect((await admin.query(api.readyStockManual.listForAdmin, {}))[0]).toMatchObject({
      listingId,
      priceAmount: 195000,
      availableQuantity: 3,
    });
  });

  it("direct checkout creates its own purchase and issued invoice without Cart or regular Order", async () => {
    const { t, customer, listingId } = await createPublishedListing();

    const checkout = await customer.mutation(api.readyStockManual.checkout, {
      listingId,
      quantity: 2,
    });

    expect(checkout).toMatchObject({
      subtotalAmount: 390000,
      availableQuantity: 1,
    });
    expect(await customer.query(api.readyStockManual.listMine, {})).toEqual([
      expect.objectContaining({
        purchaseId: checkout.purchaseId,
        listingId,
        title: "Manual Ready Book",
        quantity: 2,
        unitPriceAmount: 195000,
        subtotalAmount: 390000,
        operationalStatus: "waiting_payment",
        invoiceId: checkout.invoiceId,
      }),
    ]);
    expect(await customer.query(api.invoices.getMine, { invoiceId: checkout.invoiceId })).toMatchObject({
      source: "ready_stock",
      readyStockPurchaseId: checkout.purchaseId,
      orderId: null,
      status: "issued",
      totalAmount: 390000,
      outstandingAmount: 390000,
      items: [
        expect.objectContaining({
          description: "Manual Ready Book · PB",
          quantity: 2,
          unitPriceAmountSnapshot: 195000,
          subtotalAmount: 390000,
        }),
      ],
    });

    await expect(
      t.run(async (ctx) => ({
        carts: (await ctx.db.query("carts").collect()).length,
        cartItems: (await ctx.db.query("cartItems").collect()).length,
        orders: (await ctx.db.query("orders").collect()).length,
        legacyReservations: (await ctx.db.query("readyStockReservations").collect()).length,
        purchases: (await ctx.db.query("readyStockPurchases").collect()).length,
        invoices: (await ctx.db.query("invoices").collect()).length,
      })),
    ).resolves.toEqual({
      carts: 0,
      cartItems: 0,
      orders: 0,
      legacyReservations: 0,
      purchases: 1,
      invoices: 1,
    });

    expect((await t.query(api.readyStockManual.getBySlug, { slug: "manual-ready-book" }))?.availableQuantity).toBe(1);
  });

  it("keeps checkout price snapshot stable when Admin edits the listing later", async () => {
    const { t, admin, customer, listingId } = await createPublishedListing();
    const checkout = await customer.mutation(api.readyStockManual.checkout, { listingId, quantity: 1 });

    await admin.mutation(api.readyStockManual.update, {
      listingId,
      title: "Manual Ready Book",
      priceAmount: 210000,
      format: "PB",
      quantity: 3,
    });

    expect(await customer.query(api.invoices.getMine, { invoiceId: checkout.invoiceId })).toMatchObject({
      totalAmount: 195000,
      items: [expect.objectContaining({ unitPriceAmountSnapshot: 195000 })],
    });
    expect((await t.query(api.readyStockManual.getBySlug, { slug: "manual-ready-book" }))?.priceAmount).toBe(210000);
  });

  it("tracks paid purchases through packing, shipping, and delivery while fulfilling stock once", async () => {
    const { t, admin, customer, listingId } = await createPublishedListing();
    const checkout = await customer.mutation(api.readyStockManual.checkout, { listingId, quantity: 2 });

    await t.run(async (ctx) => {
      await ctx.db.patch(checkout.invoiceId, {
        paymentStatus: "paid",
        verifiedPaymentAmount: 390000,
        outstandingAmount: 0,
        updatedAt: Date.now(),
      });
    });

    expect((await customer.query(api.readyStockManual.listMine, {}))[0]).toMatchObject({
      operationalStatus: "payment_success",
    });

    await admin.mutation(api.readyStockManual.setFulfillmentStage, {
      purchaseId: checkout.purchaseId,
      stage: "packing",
    });
    expect((await customer.query(api.readyStockManual.listMine, {}))[0]).toMatchObject({
      operationalStatus: "packing",
    });

    await admin.mutation(api.readyStockManual.setFulfillmentStage, {
      purchaseId: checkout.purchaseId,
      stage: "shipping",
    });
    expect((await customer.query(api.readyStockManual.listMine, {}))[0]).toMatchObject({
      operationalStatus: "shipping",
    });

    await admin.mutation(api.readyStockManual.setFulfillmentStage, {
      purchaseId: checkout.purchaseId,
      stage: "delivered",
    });
    expect((await customer.query(api.readyStockManual.listMine, {}))[0]).toMatchObject({
      status: "completed",
      operationalStatus: "delivered",
      deliveredAt: expect.any(Number),
    });

    expect(await t.run((ctx) => ctx.db.get(listingId))).toMatchObject({
      quantity: 1,
      reservedQuantity: 0,
    });
    await expect(
      admin.mutation(api.readyStockManual.setFulfillmentStage, {
        purchaseId: checkout.purchaseId,
        stage: "delivered",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });

  it("releases manual reservation when an unpaid Ready Stock invoice is voided", async () => {
    const { t, admin, customer, listingId } = await createPublishedListing();
    const checkout = await customer.mutation(api.readyStockManual.checkout, { listingId, quantity: 2 });

    expect(await t.run((ctx) => ctx.db.get(listingId))).toMatchObject({
      quantity: 3,
      reservedQuantity: 2,
    });

    await admin.mutation(api.invoices.voidInvoice, { invoiceId: checkout.invoiceId });

    expect(await t.run((ctx) => ctx.db.get(listingId))).toMatchObject({
      quantity: 3,
      reservedQuantity: 0,
    });
    expect((await customer.query(api.readyStockManual.listMine, {}))[0]).toMatchObject({
      status: "cancelled",
      operationalStatus: "cancelled",
    });
  });

  it("guards Admin mutations and rejects over-selling", async () => {
    const { admin, customer, listingId } = await createPublishedListing();

    await expect(
      customer.mutation(api.readyStockManual.update, {
        listingId,
        title: "Hijack",
        priceAmount: 1,
        format: "PB",
        quantity: 1,
      }),
    ).rejects.toThrow("PERMISSION_DENIED");

    await expect(
      customer.mutation(api.readyStockManual.checkout, {
        listingId,
        quantity: 4,
      }),
    ).rejects.toThrow("READY_STOCK_UNAVAILABLE");

    const checkout = await customer.mutation(api.readyStockManual.checkout, {
      listingId,
      quantity: 3,
    });
    await expect(
      customer.mutation(api.readyStockManual.checkout, {
        listingId,
        quantity: 1,
      }),
    ).rejects.toThrow("READY_STOCK_UNAVAILABLE");

    await expect(
      admin.mutation(api.readyStockManual.setFulfillmentStage, {
        purchaseId: checkout.purchaseId,
        stage: "packing",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });
});
