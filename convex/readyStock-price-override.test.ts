import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function fixture(quantity = 3) {
  const t = testConvex();
  const users = await setupUsers(t);
  const catalog = await createOpenCatalog(users.admin, "Price Context", "9301");
  const variantId = catalog.variantIds[0];
  const variant = await t.run((ctx) => ctx.db.get(variantId));
  if (!variant) throw new Error("Missing variant fixture");
  await users.admin.mutation(api.bookVariants.update, { bookVariantId: variantId, priceAmount: 175000 });
  await users.admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity });
  await users.admin.mutation(api.books.update, { bookId: variant.bookId, publicationStatus: "published" });
  const catalogItem = await t.run((ctx) =>
    ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (q) => q.eq("catalogId", catalog.catalogId))
      .first(),
  );
  if (!catalogItem) throw new Error("Missing catalog fixture");
  await t.run((ctx) => ctx.db.patch(catalogItem._id, { priceOverrideAmount: 180000 }));
  return { t, ...users, variantId, bookId: variant.bookId, catalogId: catalog.catalogId };
}

describe("Ready Stock independent price transitions", () => {
  beforeEach(configureTestEnvironment);

  // fallback → set → replace → clear; invalid/denied events leave all state unchanged.
  it("projects fallback, independent override, reset, audit, and unchanged inventory", async () => {
    const { t, admin, owner, customer, variantId, bookId, catalogId } = await fixture();
    const original = (await admin.query(api.readyStock.listForAdmin, {}))[0];
    expect(original).toMatchObject({
      masterPriceAmount: 175000,
      priceOverrideAmount: null,
      effectivePriceAmount: 175000,
    });
    expect((await t.query(api.readyStock.list, {})).items[0].variants[0].priceAmount).toBe(175000);
    const detail = () => t.query(api.readyStock.getBySlug, { slug: "price-context-book" });
    expect((await detail())?.variants[0].priceAmount).toBe(175000);
    await customer.mutation(api.orders.createReadyStock, { variantId, quantity: 1 });
    const before = (await admin.query(api.readyStock.listForAdmin, {}))[0];

    await admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: 195000 });
    expect((await admin.query(api.readyStock.listForAdmin, {}))[0]).toMatchObject({
      masterPriceAmount: 175000,
      priceOverrideAmount: 195000,
      effectivePriceAmount: 195000,
      onHandQuantity: before.onHandQuantity,
      reservedQuantity: 1,
      availableQuantity: 2,
    });
    expect((await t.query(api.readyStock.list, {})).items[0]).toMatchObject({ minPrice: 195000, maxPrice: 195000 });
    const overridden = await detail();
    expect(overridden?.variants[0].priceAmount).toBe(195000);
    expect((await admin.query(api.books.getForAdmin, { bookId }))?.variants[0].priceAmount).toBe(175000);
    expect((await admin.query(api.catalogItems.listForCatalog, { catalogId }))[0].priceAmount).toBe(180000);

    await owner.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: null });
    expect((await detail())?.variants[0].priceAmount).toBe(175000);
    expect((await admin.query(api.readyStock.listForAdmin, {}))[0]).toMatchObject({
      masterPriceAmount: 175000,
      priceOverrideAmount: null,
      effectivePriceAmount: 175000,
      onHandQuantity: 3,
      reservedQuantity: 1,
      availableQuantity: 2,
    });
    const events = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).filter((e) => e.action.startsWith("ready_stock.price_")),
    );
    expect(events.map((e) => ({ action: e.action, metadata: e.safeMetadata }))).toEqual([
      {
        action: "ready_stock.price_override_changed",
        metadata: { bookVariantId: variantId, from: "null", to: "195000" },
      },
      {
        action: "ready_stock.price_override_cleared",
        metadata: { bookVariantId: variantId, from: "195000", to: "null" },
      },
    ]);
  });

  it("uses effective variant min/max and price ordering rather than Master ordering", async () => {
    const { t, admin, variantId, bookId } = await fixture();
    const otherVariant = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "HB",
      isbn: "978000009302",
      priceAmount: 220000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: otherVariant, quantity: 1 });
    await admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: 250000 });
    const publisherId = await admin.mutation(api.publishers.create, { name: "Other House" });
    const otherBook = await admin.mutation(api.books.create, { publisherId, title: "Other Stock" });
    const cheaper = await admin.mutation(api.bookVariants.create, {
      bookId: otherBook,
      format: "PB",
      isbn: "978000009303",
      priceAmount: 200000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: cheaper, quantity: 1 });
    await admin.mutation(api.books.update, { bookId: otherBook, publicationStatus: "published" });
    const result = await t.query(api.readyStock.list, { sort: "price" });
    expect(result.items.map((book) => book.bookId)).toEqual([otherBook, bookId]);
    expect(result.items[1]).toMatchObject({ minPrice: 220000, maxPrice: 250000 });
    expect((await t.query(api.readyStock.list, { sort: "price", format: "PB" })).items[1].minPrice).toBe(250000);
  });

  it("snapshots customer and assisted prices; subsequent changes cannot rewrite orders or invoices", async () => {
    const { t, admin, customer, variantId } = await fixture();
    await admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: 195000 });
    const first = await customer.mutation(api.orders.createReadyStock, { variantId, quantity: 2 });
    expect(first).toMatchObject({ totalAmount: 390000, subtotalAmount: 390000 });
    expect(first.items[0]).toMatchObject({ unitPriceAmountSnapshot: 195000, subtotalAmount: 390000 });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: first.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    await admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: 210000 });
    const customerUser = await customer.query(api.users.current, {});
    const second = await admin.mutation(api.orders.createAssisted, {
      customerUserId: customerUser!.appUserId,
      source: "ready_stock",
      submissionKey: "override-assisted",
      items: [{ variantId, quantity: 1 }],
    });
    expect(second.items[0]).toMatchObject({ unitPriceAmountSnapshot: 210000, subtotalAmount: 210000 });
    await admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: null });
    expect((await customer.query(api.orders.getMine, { orderId: first.orderId })).items[0]).toMatchObject({
      unitPriceAmountSnapshot: 195000,
      subtotalAmount: 390000,
    });
    expect((await admin.query(api.orders.getForAdmin, { orderId: second.orderId })).items[0]).toMatchObject({
      unitPriceAmountSnapshot: 210000,
      subtotalAmount: 210000,
    });
    const storedInvoice = await t.run((ctx) => ctx.db.get(invoice.invoiceId));
    expect(storedInvoice).toMatchObject({ totalAmount: 390000 });
    const invoiceItems = await t.run((ctx) =>
      ctx.db
        .query("invoiceItems")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice.invoiceId))
        .collect(),
    );
    expect(invoiceItems[0]).toMatchObject({ unitPriceAmountSnapshot: 195000, subtotalAmount: 390000 });
    expect((await admin.query(api.readyStock.listForAdmin, {}))[0]).toMatchObject({
      onHandQuantity: 3,
      reservedQuantity: 3,
      availableQuantity: 0,
    });
  });

  it("rejects invalid money, missing records, and non-admins atomically", async () => {
    const { t, admin, customer, variantId, bookId } = await fixture();
    const set = (priceOverrideAmount: number | null) =>
      admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount });
    const before = await t.run((ctx) => ctx.db.query("readyStockInventory").collect());
    for (const amount of [0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(set(amount)).rejects.toThrow("VALIDATION_FAILED");
    }
    await expect(
      customer.mutation(api.readyStock.setPriceOverride, {
        bookVariantId: variantId,
        priceOverrideAmount: 195000,
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      t.mutation(api.readyStock.setPriceOverride, {
        bookVariantId: variantId,
        priceOverrideAmount: null,
      }),
    ).rejects.toThrow("IDENTITY_REQUIRED");
    const missingInventory = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "HB",
      isbn: "978000009304",
      priceAmount: 100000,
    });
    await expect(
      admin.mutation(api.readyStock.setPriceOverride, {
        bookVariantId: missingInventory,
        priceOverrideAmount: 195000,
      }),
    ).rejects.toThrow("READY_STOCK_UNAVAILABLE");
    await t.run((ctx) => ctx.db.delete(missingInventory));
    await expect(
      admin.mutation(api.readyStock.setPriceOverride, {
        bookVariantId: missingInventory,
        priceOverrideAmount: 195000,
      }),
    ).rejects.toThrow("BOOK_VARIANT_NOT_FOUND");
    expect(await t.run((ctx) => ctx.db.query("readyStockInventory").collect())).toEqual(before);
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).filter((e) => e.action.startsWith("ready_stock.price_")),
      ),
    ).toEqual([]);
    await expect(
      customer.mutation(api.orders.createReadyStock, {
        variantId,
        quantity: 1,
        price: 1,
      } as never),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toEqual([]);
  });

  it("uses 195000 for assisted checkout and preserves override across stock edits", async () => {
    const { t, admin, customer, variantId } = await fixture();
    await admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount: 195000 });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 4 });
    const customerUser = await customer.query(api.users.current, {});
    const order = await admin.mutation(api.orders.createAssisted, {
      customerUserId: customerUser!.appUserId,
      source: "ready_stock",
      submissionKey: "assisted-195000",
      items: [{ variantId, quantity: 2 }],
    });
    expect(order).toMatchObject({ totalAmount: 390000 });
    expect(order.items[0]).toMatchObject({ unitPriceAmountSnapshot: 195000, subtotalAmount: 390000 });
    expect((await t.query(api.readyStock.getBySlug, { slug: "price-context-book" }))?.variants[0]).toMatchObject({
      priceAmount: 195000,
      stockQuantity: 2,
    });
  });

  it("keeps repeated set/reset idempotent and rejects overflowing order totals", async () => {
    const { t, admin, customer, variantId } = await fixture();
    const set = (priceOverrideAmount: number | null) =>
      admin.mutation(api.readyStock.setPriceOverride, { bookVariantId: variantId, priceOverrideAmount });
    await set(Number.MAX_SAFE_INTEGER);
    await set(Number.MAX_SAFE_INTEGER);
    await expect(customer.mutation(api.orders.createReadyStock, { variantId, quantity: 2 })).rejects.toThrow(
      "INVOICE_TOTAL_INVALID",
    );
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("readyStockReservations").collect())).toEqual([]);
    await set(null);
    await set(null);
    const events = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).filter((e) => e.action.startsWith("ready_stock.price_")),
    );
    expect(events).toHaveLength(2);
    expect((await admin.query(api.readyStock.listForAdmin, {}))[0]).toMatchObject({
      masterPriceAmount: 175000,
      effectivePriceAmount: 175000,
      onHandQuantity: 3,
      reservedQuantity: 0,
    });
  });
});
