/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG deterministic Catalog to Batch assignment", () => {
  beforeEach(configureTestEnvironment);

  it("backfills 100 existing customer items and assigns a future preorder once", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Scale Catalog", "7101", "scale-catalog-code");
    const fixture = await t.run(async (ctx) => {
      const variant = await ctx.db.get(catalog.variantIds[0]);
      if (!variant) throw new Error("scale fixture variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("scale fixture book missing");
      const publisher = await ctx.db.get(book.publisherId);
      if (!publisher) throw new Error("scale fixture publisher missing");
      const now = Date.now();
      const orderItemIds: Id<"orderItems">[] = [];
      for (let index = 0; index < 100; index += 1) {
        const customerId = await ctx.db.insert("appUsers", {
          clerkUserId: `scale-customer-${index}`,
          role: "customer",
          status: "active",
          emailSnapshot: `scale-customer-${index}@example.com`,
          displayNameSnapshot: `Scale Customer ${index}`,
          memberCode: `BFG-SCALE-${String(index).padStart(4, "0")}`,
          createdAt: now + index,
          updatedAt: now + index,
          lastSeenAt: now + index,
        });
        const orderId = await ctx.db.insert("orders", {
          customerUserId: customerId,
          catalogId: catalog.catalogId,
          source: "customer_self_service",
          orderCode: `BFG-SCALE-${String(index).padStart(4, "0")}`,
          customerName: `Scale Customer ${index}`,
          customerEmail: `scale-customer-${index}@example.com`,
          status: "submitted",
          currency: "IDR",
          subtotalAmount: variant.priceAmount,
          totalAmount: variant.priceAmount,
          createdAt: now + index,
          updatedAt: now + index,
          submittedAt: now + index,
          editableUntil: now + 7 * 24 * 60 * 60 * 1000,
        });
        const orderItemId = await ctx.db.insert("orderItems", {
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
          createdAt: now + index,
        });
        orderItemIds.push(orderItemId);
      }
      return { orderItemIds };
    });
    const batch = await admin.mutation(api.batches.create, { name: "Scale Batch" });

    const linked = await admin.mutation(api.batches.linkCatalog, {
      batchId: batch.batchId,
      catalogId: catalog.catalogId,
    });
    expect(linked.assignmentCount).toBe(100);
    expect(linked.assignedQuantity).toBe(100);
    const assignments = await t.run((ctx) => ctx.db.query("orderItemBatchAssignments").collect());
    expect(assignments).toHaveLength(100);
    expect(new Set(assignments.map((assignment) => String(assignment.batchId)))).toEqual(
      new Set([String(batch.batchId)]),
    );
    expect(
      (
        await admin.query(api.batchTracking.listUnassignedForAdmin, {
          batchId: batch.batchId,
          paginationOpts: { numItems: 1000, cursor: null },
        })
      ).page,
    ).toEqual([]);

    await customer.mutation(api.catalogAccess.unlock, { accessCode: "scale-catalog-code" });
    const future = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Future Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    const futureAssignments = await t.run((ctx) =>
      ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_order_item", (index) => index.eq("orderItemId", future.items[0]._id))
        .collect(),
    );
    expect(futureAssignments).toMatchObject([
      { batchId: batch.batchId, orderItemId: future.items[0]._id, assignedQuantity: 2 },
    ]);
    expect((await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignmentCount).toBe(101);
    expect(fixture.orderItemIds).toHaveLength(100);
  });

  it("resumes a 2,000-item Catalog backfill without duplicates or cross-Catalog writes", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Large Catalog", "7110", "large-catalog-code");
    const fixture = await t.run(async (ctx) => {
      const variant = await ctx.db.get(catalog.variantIds[0]);
      if (!variant) throw new Error("large fixture variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("large fixture book missing");
      const publisher = await ctx.db.get(book.publisherId);
      if (!publisher) throw new Error("large fixture publisher missing");
      const now = Date.now();
      const secondVariantId = await ctx.db.insert("bookVariants", {
        bookId: book._id,
        format: "HB",
        isbn: "97800007110-2",
        priceAmount: 150000,
        supplierPriceGbpMinor: 1899,
        currency: "IDR",
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("catalogItems", {
        catalogId: catalog.catalogId,
        bookVariantId: secondVariantId,
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
      const orderItemIds: Id<"orderItems">[] = [];
      for (let index = 0; index < 1000; index += 1) {
        const customerId = await ctx.db.insert("appUsers", {
          clerkUserId: `large-customer-${index}`,
          role: "customer",
          status: "active",
          emailSnapshot: `large-customer-${index}@example.com`,
          displayNameSnapshot: `Large Customer ${index}`,
          memberCode: `BFG-LARGE-${String(index).padStart(4, "0")}`,
          createdAt: now + index,
          updatedAt: now + index,
          lastSeenAt: now + index,
        });
        const orderId = await ctx.db.insert("orders", {
          customerUserId: customerId,
          catalogId: catalog.catalogId,
          source: "customer_self_service",
          orderCode: `BFG-LARGE-${String(index).padStart(4, "0")}`,
          customerName: `Large Customer ${index}`,
          customerEmail: `large-customer-${index}@example.com`,
          status: "submitted",
          currency: "IDR",
          subtotalAmount: variant.priceAmount + 150000,
          totalAmount: variant.priceAmount + 150000,
          createdAt: now + index,
          updatedAt: now + index,
          submittedAt: now + index,
          editableUntil: now + 7 * 24 * 60 * 60 * 1000,
        });
        for (const [itemVariant, format, isbn, price] of [
          [variant, variant.format, variant.isbn, variant.priceAmount],
          [{ ...variant, _id: secondVariantId, format: "HB", isbn: "97800007110-2" }, "HB", "97800007110-2", 150000],
        ] as const) {
          const orderItemId = await ctx.db.insert("orderItems", {
            orderId,
            bookId: book._id,
            bookVariantId: itemVariant._id,
            bookTitleSnapshot: book.title,
            publisherNameSnapshot: publisher.name,
            formatSnapshot: format,
            isbnSnapshot: isbn,
            unitPriceAmountSnapshot: price,
            currencySnapshot: "IDR",
            quantity: 1,
            subtotalAmount: price,
            createdAt: now + index,
          });
          orderItemIds.push(orderItemId);
        }
      }
      return { orderItemIds, secondVariantId };
    });
    const batch = await admin.mutation(api.batches.create, { name: "Large Batch" });
    const linked = await admin.mutation(api.batches.linkCatalog, {
      batchId: batch.batchId,
      catalogId: catalog.catalogId,
    });
    expect(linked.assignmentCount).toBe(100);
    await t.finishAllScheduledFunctions(() => undefined);

    const assignments = await t.run((ctx) =>
      ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", batch.batchId))
        .collect(),
    );
    expect(assignments).toHaveLength(2000);
    expect(new Set(assignments.map((assignment) => String(assignment.orderItemId))).size).toBe(2000);
    expect(new Set(assignments.map((assignment) => String(assignment.batchId)))).toEqual(
      new Set([String(batch.batchId)]),
    );
    expect(new Set(assignments.map((assignment) => String(assignment.orderItemId)))).toEqual(
      new Set(fixture.orderItemIds.map(String)),
    );

    const detail = await admin.query(api.batchTracking.getForAdmin, {
      batchId: batch.batchId,
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(detail.assignments).toHaveLength(25);
    expect(detail.assignmentPage.isDone).toBe(false);
    const nextDetail = await admin.query(api.batchTracking.getForAdmin, {
      batchId: batch.batchId,
      paginationOpts: { numItems: 25, cursor: detail.assignmentPage.continueCursor },
    });
    expect(nextDetail.assignments).toHaveLength(25);
    expect(nextDetail.assignments.map((assignment) => assignment.assignmentId)).not.toEqual(
      detail.assignments.map((assignment) => assignment.assignmentId),
    );
    expect(detail.purchaseSummary).toEqual(
      expect.arrayContaining([expect.objectContaining({ supplierPriceGbpMinor: 1899, quantity: 1000 })]),
    );
  }, 120000);

  it("revalidates the Batch lock before a later backfill chunk writes", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Lock During Backfill", "7111", "lock-backfill-code");
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("lock fixture customer missing");
    await t.run(async (ctx) => {
      const variant = await ctx.db.get(catalog.variantIds[0]);
      if (!variant) throw new Error("lock fixture variant missing");
      const book = await ctx.db.get(variant.bookId);
      if (!book) throw new Error("lock fixture book missing");
      const publisher = await ctx.db.get(book.publisherId);
      if (!publisher) throw new Error("lock fixture publisher missing");
      const now = Date.now();
      for (let index = 0; index < 101; index += 1) {
        const orderId = await ctx.db.insert("orders", {
          customerUserId: customerUser.appUserId,
          catalogId: catalog.catalogId,
          source: "customer_self_service",
          orderCode: `BFG-LOCK-${String(index).padStart(3, "0")}`,
          customerName: "Lock Fixture Customer",
          customerEmail: "lock-fixture@example.com",
          status: "submitted",
          currency: "IDR",
          subtotalAmount: variant.priceAmount,
          totalAmount: variant.priceAmount,
          createdAt: now + index,
          updatedAt: now + index,
          submittedAt: now + index,
          editableUntil: now + 7 * 24 * 60 * 60 * 1000,
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
          createdAt: now + index,
        });
      }
    });
    const batch = await admin.mutation(api.batches.create, { name: "Lock During Backfill Batch" });
    const linked = await admin.mutation(api.batches.linkCatalog, {
      batchId: batch.batchId,
      catalogId: catalog.catalogId,
    });
    expect(linked.assignmentCount).toBe(100);
    await t.run((ctx) => ctx.db.patch(batch.batchId, { currentShipmentStage: "po_closed" }));
    await t.finishAllScheduledFunctions(() => undefined);
    const assignments = await t.run((ctx) =>
      ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", batch.batchId))
        .collect(),
    );
    expect(assignments).toHaveLength(100);
  }, 20000);

  it("keeps zero, ambiguous, and locked receiving targets unassigned", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);

    const noBatchCatalog = await createOpenCatalog(admin, "No Batch Catalog", "7102", "no-batch-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "no-batch-code" });
    const noBatchOrder = await customer.mutation(api.orders.submit, {
      catalogId: noBatchCatalog.catalogId,
      customerName: "No Batch Customer",
      items: [{ variantId: noBatchCatalog.variantIds[0], quantity: 1 }],
    });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_order_item", (index) => index.eq("orderItemId", noBatchOrder.items[0]._id))
          .collect(),
      ),
    ).toEqual([]);

    const ambiguousCatalog = await createOpenCatalog(admin, "Ambiguous Catalog", "7103", "ambiguous-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "ambiguous-code" });
    const firstBatch = await admin.mutation(api.batches.create, { name: "Ambiguous Batch A" });
    const secondBatch = await admin.mutation(api.batches.create, { name: "Ambiguous Batch B" });
    await admin.mutation(api.batches.linkCatalog, {
      batchId: firstBatch.batchId,
      catalogId: ambiguousCatalog.catalogId,
    });
    await admin.mutation(api.batches.linkCatalog, {
      batchId: secondBatch.batchId,
      catalogId: ambiguousCatalog.catalogId,
    });
    const ambiguousOrder = await customer.mutation(api.orders.submit, {
      catalogId: ambiguousCatalog.catalogId,
      customerName: "Ambiguous Customer",
      items: [{ variantId: ambiguousCatalog.variantIds[0], quantity: 1 }],
    });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_order_item", (index) => index.eq("orderItemId", ambiguousOrder.items[0]._id))
          .collect(),
      ),
    ).toEqual([]);
    await expect(
      admin.query(api.batchTracking.listUnassignedForAdmin, {
        batchId: firstBatch.batchId,
        paginationOpts: { numItems: 100, cursor: null },
      }),
    ).resolves.toMatchObject({
      page: expect.arrayContaining([expect.objectContaining({ assignmentState: "Tujuan Batch ambigu" })]),
    });

    const lockedCatalog = await createOpenCatalog(admin, "Locked Catalog", "7104", "locked-code");
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "locked-code" });
    await secondCustomer.mutation(api.orders.submit, {
      catalogId: lockedCatalog.catalogId,
      customerName: "Locked Initial Customer",
      items: [{ variantId: lockedCatalog.variantIds[0], quantity: 1 }],
    });
    const lockedBatch = await admin.mutation(api.batches.create, { name: "Locked Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: lockedBatch.batchId, catalogId: lockedCatalog.catalogId });
    await admin.mutation(api.batchTracking.updateShipmentStage, {
      batchId: lockedBatch.batchId,
      toStage: "po_closed",
    });
    const lockedOrder = await secondCustomer.mutation(api.orders.submit, {
      catalogId: lockedCatalog.catalogId,
      customerName: "Locked Customer",
      items: [{ variantId: lockedCatalog.variantIds[0], quantity: 1 }],
    });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_order_item", (index) => index.eq("orderItemId", lockedOrder.items[0]._id))
          .collect(),
      ),
    ).toEqual([]);
    await expect(
      admin.query(api.batchTracking.listUnassignedForAdmin, {
        batchId: lockedBatch.batchId,
        paginationOpts: { numItems: 100, cursor: null },
      }),
    ).resolves.toMatchObject({
      page: expect.arrayContaining([expect.objectContaining({ assignmentState: "Belum masuk Batch" })]),
    });
  });

  it("projects canonical recap snapshots and finance state", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Recap Catalog", "7105", "recap-code");
    await admin.mutation(api.bookVariants.update, {
      bookVariantId: catalog.variantIds[0],
      supplierPriceGbpMinor: 999,
    });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "recap-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Recap Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    const issued = await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: issued.invoiceId, amount: 100000 });
    await admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: issued.invoiceId, amount: 50000 });
    const batch = await admin.mutation(api.batches.create, { name: "Recap Batch", etaCargoMonth: "2027-03" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });

    const detail = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(detail.assignments[0]).toMatchObject({
      customerName: "Recap Customer",
      bookTitle: "Recap Catalog Book",
      format: "PB",
      isbn: "97800007105",
      publisherName: "Recap Catalog Publisher",
      assignedQuantity: 2,
      unitPriceAmount: 125000,
      etaCargoMonth: "2027-03",
      dpAmount: 50000,
      paymentStatus: "partially_paid",
      gpe: 999,
    });
    expect(detail.assignments[0].orderDate).toEqual(expect.any(String));
  });
});
