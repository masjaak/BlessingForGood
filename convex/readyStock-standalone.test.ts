import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Standalone Ready Stock", () => {
  beforeEach(configureTestEnvironment);

  it("keeps the manual storefront independent and runs checkout through invoice and delivery", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);

    const created = await admin.mutation(api.readyStockListings.create, {
      title: "Are We Ready For A Pet?",
      description: "Buku interaktif untuk mengenal tanggung jawab merawat hewan peliharaan.",
      priceAmount: 195000,
      format: "HB",
      quantity: 3,
    });

    await expect(
      admin.mutation(api.readyStockListings.update, {
        listingId: created.listingId,
        status: "published",
      }),
    ).rejects.toThrow("Cover wajib");

    const coverStorageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["ready-stock-cover"], { type: "image/webp" })),
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(created.listingId, { coverStorageId });
    });
    await admin.mutation(api.readyStockListings.update, {
      listingId: created.listingId,
      status: "published",
    });

    await expect(t.query(api.readyStockListings.getBySlug, { slug: created.slug })).resolves.toMatchObject({
      listingId: created.listingId,
      title: "Are We Ready For A Pet?",
      description: "Buku interaktif untuk mengenal tanggung jawab merawat hewan peliharaan.",
      priceAmount: 195000,
      format: "HB",
      quantity: 3,
      reservedQuantity: 0,
      availableQuantity: 3,
      status: "published",
    });

    await expect(
      customer.mutation(api.readyStockOrders.checkout, {
        requestKey: "existing-checkout-1",
        listingId: created.listingId,
        quantity: 2,
      }),
    ).rejects.toThrow("Tambahkan alamat pengiriman");

    await customer.mutation(api.customerAddresses.create, {
      label: "Rumah",
      recipientName: "Mulia Kah",
      phone: "081234567890",
      addressLine1: "Jl. Blessy No. 1",
      city: "Semarang",
      province: "Jawa Tengah",
      postalCode: "50100",
      isDefault: true,
    });

    const checkout = await customer.mutation(api.readyStockOrders.checkout, {
      requestKey: "existing-checkout-2",
      listingId: created.listingId,
      quantity: 2,
    });

    expect(checkout).toMatchObject({
      listingId: created.listingId,
      title: "Are We Ready For A Pet?",
      unitPriceAmount: 195000,
      quantity: 2,
      totalAmount: 390000,
      operationalStatus: "waiting_payment",
      invoiceId: expect.any(String),
    });
    expect(checkout.timeline[0]).toMatchObject({
      key: "waiting_payment",
      label: "Blessy menunggu pembayaran",
      state: "current",
    });

    const storedAfterCheckout = await t.run(async (ctx) => ({
      listing: await ctx.db.get(created.listingId),
      regularOrders: await ctx.db.query("orders").collect(),
      legacyInventory: await ctx.db.query("readyStockInventory").collect(),
      invoiceItems: await ctx.db
        .query("invoiceItems")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", checkout.invoiceId!))
        .collect(),
    }));
    expect(storedAfterCheckout.listing).toMatchObject({
      quantity: 3,
      reservedQuantity: 2,
    });
    expect(storedAfterCheckout.regularOrders).toEqual([]);
    expect(storedAfterCheckout.legacyInventory).toEqual([]);
    expect(storedAfterCheckout.invoiceItems).toEqual([
      expect.objectContaining({
        readyStockOrderId: checkout.orderId,
        bookTitleSnapshot: "Are We Ready For A Pet?",
        formatSnapshot: "HB",
        quantity: 2,
        unitPriceAmountSnapshot: 195000,
        subtotalAmount: 390000,
      }),
    ]);

    await expect(customer.query(api.invoices.getMine, { invoiceId: checkout.invoiceId! })).resolves.toMatchObject({
      source: "ready_stock",
      readyStockOrderId: checkout.orderId,
      orderId: null,
      totalAmount: 390000,
      outstandingAmount: 390000,
      paymentStatus: "unpaid",
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(checkout.invoiceId!, {
        paymentStatus: "payment_submitted",
        updatedAt: Date.now(),
      });
    });
    expect(
      (
        await customer.query(api.readyStockOrders.listMine, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page[0],
    ).toMatchObject({ operationalStatus: "verifying_payment" });

    await t.run(async (ctx) => {
      await ctx.db.patch(checkout.invoiceId!, {
        paymentStatus: "paid",
        verifiedPaymentAmount: 390000,
        outstandingAmount: 0,
        updatedAt: Date.now(),
      });
    });
    expect(
      (
        await customer.query(api.readyStockOrders.listMine, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page[0],
    ).toMatchObject({ operationalStatus: "paid" });

    await admin.mutation(api.readyStockOrders.updateStage, {
      orderId: checkout.orderId,
      stage: "packing",
    });
    await admin.mutation(api.readyStockOrders.updateStage, {
      orderId: checkout.orderId,
      stage: "shipping",
    });
    await admin.mutation(api.readyStockOrders.updateStage, {
      orderId: checkout.orderId,
      stage: "delivered",
    });

    const delivered = (
      await customer.query(api.readyStockOrders.listMine, {
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page[0];
    expect(delivered.operationalStatus).toBe("delivered");
    expect(delivered.timeline.at(-1)).toMatchObject({
      key: "delivered",
      label: "Paket sampai",
      state: "current",
    });

    const stockAfterDelivery = await t.run((ctx) => ctx.db.get(created.listingId));
    expect(stockAfterDelivery).toMatchObject({
      quantity: 1,
      reservedQuantity: 0,
    });
    expect(await t.run((ctx) => ctx.db.query("books").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("bookVariants").collect())).toEqual([]);
  });

  it("releases a standalone reservation when its unpaid invoice is voided", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const created = await admin.mutation(api.readyStockListings.create, {
      title: "Voidable Ready Stock",
      priceAmount: 125000,
      format: "PB",
      quantity: 2,
    });
    const coverStorageId = await t.run(async (ctx) => ctx.storage.store(new Blob(["cover"], { type: "image/webp" })));
    await t.run((ctx) => ctx.db.patch(created.listingId, { coverStorageId }));
    await admin.mutation(api.readyStockListings.update, {
      listingId: created.listingId,
      status: "published",
    });
    await customer.mutation(api.customerAddresses.create, {
      label: "Rumah",
      recipientName: "Test Customer",
      phone: "0812",
      addressLine1: "Jl. Test",
      city: "Semarang",
      province: "Jawa Tengah",
      postalCode: "50100",
      isDefault: true,
    });

    const checkout = await customer.mutation(api.readyStockOrders.checkout, {
      requestKey: "existing-checkout-3",
      listingId: created.listingId,
      quantity: 1,
    });

    expect(await t.run((ctx) => ctx.db.get(created.listingId))).toMatchObject({
      quantity: 2,
      reservedQuantity: 1,
    });

    await admin.mutation(api.invoices.voidInvoice, { invoiceId: checkout.invoiceId! });

    expect(await t.run((ctx) => ctx.db.get(created.listingId))).toMatchObject({
      quantity: 2,
      reservedQuantity: 0,
    });
    expect(
      (
        await customer.query(api.readyStockOrders.listMine, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page[0],
    ).toMatchObject({ operationalStatus: "cancelled" });
  });

  it("blocks Customers from Admin listing and fulfillment mutations", async () => {
    const t = testConvex();
    const { customer } = await setupUsers(t);

    await expect(
      customer.mutation(api.readyStockListings.create, {
        title: "Denied",
        priceAmount: 100000,
        format: "PB",
        quantity: 1,
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
});
