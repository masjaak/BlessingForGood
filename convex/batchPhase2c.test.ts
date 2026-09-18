/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG Phase 2C Batch read boundaries", () => {
  beforeEach(configureTestEnvironment);

  it("keeps Batch list, detail, and export projections separate", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Phase 2C Catalog", "8201", "phase-2c-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "phase-2c-code" });
    await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Phase 2C Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2, expectedUnitPriceAmount: 125000 }],
    });
    const batch = await admin.mutation(api.batches.create, { name: "Phase 2C Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });

    const list = await admin.query(api.batches.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(list.page[0]).toMatchObject({ batchId: batch.batchId, name: "Phase 2C Batch" });
    expect(list.page[0]).not.toHaveProperty("assignmentCount");
    expect(list.page[0]).not.toHaveProperty("customerCount");

    const detail = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(detail.purchaseSummary).toEqual([
      expect.objectContaining({ bookVariantId: catalog.variantIds[0], quantity: 2, customerCount: 1 }),
    ]);
    expect(detail).not.toHaveProperty("customerDetail");

    const purchaseExport = await admin.query(api.batchTracking.getExport, {
      batchId: batch.batchId,
      kind: "purchase",
    });
    expect(purchaseExport.rows).toEqual(detail.purchaseSummary);

    const customerExport = await admin.query(api.batchTracking.getExport, {
      batchId: batch.batchId,
      kind: "customer-detail",
    });
    expect(customerExport).toMatchObject({
      batchId: batch.batchId,
      kind: "customer-detail",
      rows: [expect.objectContaining({ customerName: "Phase 2C Customer", quantity: 2 })],
    });
    await expect(
      customer.query(api.batchTracking.getExport, { batchId: batch.batchId, kind: "purchase" }),
    ).rejects.toThrow("PERMISSION_DENIED");
  });

  it("discovers an owned Batch beyond unrelated assignment volume", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Ownership Boundary Catalog", "8202", "ownership-boundary-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "ownership-boundary-code" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "ownership-boundary-code" });
    const customerOrder = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Owned Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 }],
    });
    const unrelatedOrder = await secondCustomer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Unrelated Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1, expectedUnitPriceAmount: 125000 }],
    });
    const unrelatedBatch = await admin.mutation(api.batches.create, { name: "Unrelated Batch" });
    const ownedBatch = await admin.mutation(api.batches.create, { name: "Owned Batch" });
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("Phase 2C admin fixture missing");

    await t.run(async (ctx) => {
      const now = Date.now();
      for (let index = 0; index < 501; index += 1) {
        await ctx.db.insert("orderItemBatchAssignments", {
          orderItemId: unrelatedOrder.items[0]._id,
          batchId: unrelatedBatch.batchId,
          assignedQuantity: 1,
          createdAt: now + index,
          updatedAt: now + index,
          assignedByUserId: adminUser.appUserId,
        });
      }
      await ctx.db.insert("orderItemBatchAssignments", {
        orderItemId: customerOrder.items[0]._id,
        batchId: ownedBatch.batchId,
        assignedQuantity: 1,
        createdAt: now + 1000,
        updatedAt: now + 1000,
        assignedByUserId: adminUser.appUserId,
      });
    });

    const batches = await customer.query(api.batchTracking.listMine, {});
    expect(batches).toEqual([expect.objectContaining({ batchId: ownedBatch.batchId, name: "Owned Batch" })]);
  });

  it("keeps customer history date-ranged beyond the former 2,000-order ceiling", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "History Boundary Catalog", "8203", "history-boundary-code");
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("Phase 2C customer fixture missing");
    const fixture = await t.run(async (ctx) => {
      const variant = await ctx.db.get(catalog.variantIds[0]);
      if (!variant) throw new Error("Phase 2C history variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("Phase 2C history book missing");
      const publisher = await ctx.db.get(book.publisherId);
      if (!publisher) throw new Error("Phase 2C history publisher missing");
      const startAt = Date.now();
      for (let index = 0; index < 2001; index += 1) {
        const timestamp = startAt + index;
        const orderId = await ctx.db.insert("orders", {
          customerUserId: customerUser.appUserId,
          catalogId: catalog.catalogId,
          source: "customer_self_service",
          orderCode: `BFG-HISTORY-${String(index).padStart(4, "0")}`,
          customerName: "History Customer",
          customerEmail: "history@example.com",
          status: "submitted",
          currency: "IDR",
          subtotalAmount: variant.priceAmount,
          totalAmount: variant.priceAmount,
          createdAt: timestamp,
          updatedAt: timestamp,
          submittedAt: timestamp,
          editableUntil: timestamp + 7 * 24 * 60 * 60 * 1000,
        });
        await ctx.db.insert("orderItems", {
          orderId,
          bookId: book._id,
          bookVariantId: variant._id,
          bookTitleSnapshot: book.title,
          publisherNameSnapshot: publisher.name,
          formatSnapshot: variant.format,
          isbnSnapshot: variant.isbn,
          unitPriceAmountSnapshot: variant.priceAmount,
          currencySnapshot: "IDR",
          quantity: 1,
          subtotalAmount: variant.priceAmount,
          createdAt: timestamp,
        });
      }
      return { startAt, endAt: startAt + 2000 };
    });

    const overview = await customer.query(api.batchTracking.getBookOverview, fixture);
    expect(overview.batches).toEqual([
      expect.objectContaining({ name: "Belum masuk Batch", bookCount: 2001, orderCount: 2001 }),
    ]);
  }, 120000);
});
