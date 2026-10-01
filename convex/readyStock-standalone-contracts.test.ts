import { beforeEach, describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const webp = new Uint8Array([
  82, 73, 70, 70, 34, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 24, 0, 0, 0, 48, 1, 0, 157, 1, 42, 1, 0, 1, 0, 14, 192,
  254, 37, 164, 0, 3, 112, 0, 254, 251, 148, 0, 0,
]);

async function fixture(quantity = 3) {
  const t = testConvex();
  const users = await setupUsers(t);
  const listing = await users.admin.mutation(api.readyStockListings.create, {
    title: "Standalone contract",
    priceAmount: 100000,
    format: "PB",
    quantity,
  });
  async function upload(purpose: "book-cover" | "book-gallery") {
    const storageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob([webp], { type: "image/webp" }));
      await ctx.db.patch(id as never, { contentType: "image/webp" } as never);
      return id;
    });
    await users.admin.mutation(internal.uploads.register, { storageId, purpose });
    return { listingId: listing.listingId, storageId, fileName: "photo.webp", mimeType: "image/webp" };
  }
  await users.admin.action(api.readyStockListings.attachCover, await upload("book-cover"));
  await users.admin.mutation(api.readyStockListings.update, { listingId: listing.listingId, status: "published" });
  for (const customer of [users.customer, users.secondCustomer]) {
    await customer.mutation(api.customerAddresses.create, {
      label: "Home",
      recipientName: "Original recipient",
      phone: "08123456789",
      addressLine1: "Original address",
      city: "Semarang",
      province: "Jawa Tengah",
      postalCode: "50100",
      isDefault: true,
    });
  }
  return { t, ...users, ...listing, upload };
}

describe("Standalone Ready Stock transactional contracts", () => {
  beforeEach(configureTestEnvironment);

  it("retries one checkout key without duplicate invoice or reservation", async () => {
    const f = await fixture();
    const args = { listingId: f.listingId, quantity: 2, requestKey: "same-request" };
    const first = await f.customer.mutation(api.readyStockOrders.checkout, args);
    const retry = await f.customer.mutation(api.readyStockOrders.checkout, args);
    expect(retry.orderId).toBe(first.orderId);
    expect(retry.invoiceId).toBe(first.invoiceId);
    expect(await f.t.run((ctx) => ctx.db.get(f.listingId))).toMatchObject({ quantity: 3, reservedQuantity: 2 });
    expect(await f.t.run((ctx) => ctx.db.query("invoices").collect())).toHaveLength(1);
    await expect(f.customer.mutation(api.readyStockOrders.checkout, { ...args, quantity: 1 })).rejects.toThrow();
  });

  it("reserves the last unit once and safely rejects a competing buyer", async () => {
    const f = await fixture(1);
    await f.customer.mutation(api.readyStockOrders.checkout, {
      listingId: f.listingId,
      quantity: 1,
      requestKey: "buyer-a",
    });
    await expect(
      f.secondCustomer.mutation(api.readyStockOrders.checkout, {
        listingId: f.listingId,
        quantity: 1,
        requestKey: "buyer-b",
      }),
    ).rejects.toThrow("READY_STOCK_UNAVAILABLE");
    expect(await f.t.run((ctx) => ctx.db.get(f.listingId))).toMatchObject({ quantity: 1, reservedQuantity: 1 });
  });

  it("uses real payment APIs, blocks stage skips, and keeps delivered history", async () => {
    const f = await fixture();
    const order = await f.customer.mutation(api.readyStockOrders.checkout, {
      listingId: f.listingId,
      quantity: 2,
      requestKey: "finance",
    });
    const mine = async () =>
      (
        await f.customer.query(api.readyStockOrders.listMine, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page[0];
    expect(order).toMatchObject({ unitPriceAmount: 100000, totalAmount: 200000, operationalStatus: "waiting_payment" });
    await expect(
      f.admin.mutation(api.readyStockOrders.updateStage, {
        orderId: order.orderId,
        stage: "shipping",
      }),
    ).rejects.toThrow("INVOICE_INVALID_STATE");
    const confirmation = await f.customer.action(api.paymentConfirmations.submit, {
      invoiceId: order.invoiceId!,
      amount: 200000,
      paymentMethod: "Bank transfer",
      paidAt: Date.now(),
    });
    expect((await mine()).operationalStatus).toBe("verifying_payment");
    await f.admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId });
    expect((await mine()).operationalStatus).toBe("paid");
    await expect(
      f.admin.mutation(api.readyStockOrders.updateStage, {
        orderId: order.orderId,
        stage: "delivered",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    for (const stage of ["packing", "shipping", "delivered"] as const) {
      await f.admin.mutation(api.readyStockOrders.updateStage, { orderId: order.orderId, stage });
      expect((await mine()).operationalStatus).toBe(stage);
    }
    expect((await mine()).timeline.at(-1)).toMatchObject({ state: "current", key: "delivered" });
    expect(await f.t.run((ctx) => ctx.db.get(f.listingId))).toMatchObject({ quantity: 1, reservedQuantity: 0 });
    await expect(
      f.admin.mutation(api.readyStockOrders.updateStage, {
        orderId: order.orderId,
        stage: "delivered",
      }),
    ).rejects.toThrow();
    await expect(
      f.customer.mutation(api.readyStockOrders.updateStage, {
        orderId: order.orderId,
        stage: "packing",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    expect(
      (
        await f.secondCustomer.query(api.readyStockOrders.listMine, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page,
    ).toEqual([]);
  });

  it("preserves product, price, invoice and shipping snapshots after edits", async () => {
    const f = await fixture();
    const old = await f.customer.mutation(api.readyStockOrders.checkout, {
      listingId: f.listingId,
      quantity: 1,
      requestKey: "history-old",
    });
    await f.admin.mutation(api.readyStockListings.update, {
      listingId: f.listingId,
      title: "Changed title",
      priceAmount: 150000,
    });
    const current = await f.customer.query(api.users.current, {});
    await f.t.run(async (ctx) => {
      const address = await ctx.db
        .query("customerAddresses")
        .withIndex("by_user_id", (q) => q.eq("userId", current!.appUserId))
        .first();
      await ctx.db.patch(address!._id, { recipientName: "Changed recipient", addressLine1: "Changed address" });
    });
    const newer = await f.customer.mutation(api.readyStockOrders.checkout, {
      listingId: f.listingId,
      quantity: 1,
      requestKey: "history-new",
    });
    expect(newer.unitPriceAmount).toBe(150000);
    const orders = await f.customer.query(api.readyStockOrders.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(orders.page.find((row) => row.orderId === old.orderId)).toMatchObject({
      title: "Standalone contract",
      unitPriceAmount: 100000,
      totalAmount: 100000,
      shippingAddress: { recipientName: "Original recipient", addressLine1: "Original address" },
    });
    expect(await f.customer.query(api.invoices.getMine, { invoiceId: old.invoiceId! })).toMatchObject({
      totalAmount: 100000,
    });
  });

  it("enforces eight separate gallery images and keeps ordering after removal and addition", async () => {
    const f = await fixture();
    const media = [];
    for (let index = 0; index < 8; index++) {
      media.push(await f.admin.action(api.readyStockListings.attachGalleryImage, await f.upload("book-gallery")));
    }
    await expect(
      f.admin.action(api.readyStockListings.attachGalleryImage, await f.upload("book-gallery")),
    ).rejects.toThrow("maksimal");
    await f.admin.mutation(api.readyStockListings.removeGalleryImage, { mediaId: media[0] });
    const last = await f.admin.action(api.readyStockListings.attachGalleryImage, await f.upload("book-gallery"));
    await f.admin.mutation(api.readyStockListings.moveGalleryImage, { mediaId: last, direction: "up" });
    const detail = await f.t.query(api.readyStockListings.getBySlug, { slug: f.slug });
    expect(detail!.gallery).toHaveLength(8);
    expect(new Set(detail!.gallery.map((row) => row.displayOrder)).size).toBe(8);
    expect(detail!.gallery[6].mediaId).toBe(last);
    expect(detail!.coverImageUrl).toBeTruthy();
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid price %s", async (priceAmount) => {
    const f = await fixture();
    await expect(
      f.admin.mutation(api.readyStockListings.update, { listingId: f.listingId, priceAmount }),
    ).rejects.toThrow();
  });

  it("rejects invalid cover uploads and cleans only the owned unused claim", async () => {
    const f = await fixture();
    const upload = await f.upload("book-cover");
    await expect(
      f.admin.action(api.readyStockListings.attachCover, {
        ...upload,
        mimeType: "image/png",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    expect(await f.t.run((ctx) => ctx.db.system.get("_storage", upload.storageId))).toBeNull();
    expect(
      (await f.admin.query(api.readyStockListings.getForAdmin, { listingId: f.listingId }))!.coverImageUrl,
    ).toBeTruthy();
  });

  it.each([-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid physical quantity %s",
    async (quantity) => {
      const f = await fixture();
      await expect(
        f.admin.mutation(api.readyStockListings.update, { listingId: f.listingId, quantity }),
      ).rejects.toThrow();
    },
  );

  it("protects quantity, archive and ownership while releasing a voided unpaid order once", async () => {
    const f = await fixture();
    const order = await f.customer.mutation(api.readyStockOrders.checkout, {
      listingId: f.listingId,
      quantity: 2,
      requestKey: "release",
    });
    await expect(
      f.admin.mutation(api.readyStockListings.update, { listingId: f.listingId, quantity: 1 }),
    ).rejects.toThrow("READY_STOCK_ON_HAND_BELOW_RESERVED");
    await expect(
      f.admin.mutation(api.readyStockListings.update, { listingId: f.listingId, status: "archived" }),
    ).rejects.toThrow("ENTITY_IN_USE");
    await expect(
      f.customer.mutation(api.readyStockListings.update, { listingId: f.listingId, priceAmount: 1 }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(f.t.query(api.readyStockListings.listForAdmin, {})).rejects.toThrow("IDENTITY_REQUIRED");
    await f.admin.mutation(api.invoices.voidInvoice, { invoiceId: order.invoiceId! });
    await expect(f.admin.mutation(api.invoices.voidInvoice, { invoiceId: order.invoiceId! })).rejects.toThrow(
      "INVOICE_VOID",
    );
    expect(await f.t.run((ctx) => ctx.db.get(f.listingId))).toMatchObject({ quantity: 3, reservedQuantity: 0 });
    await f.admin.mutation(api.readyStockListings.update, { listingId: f.listingId, status: "archived" });
    expect(await f.t.query(api.readyStockListings.getBySlug, { slug: f.slug })).toBeNull();
  });
});
