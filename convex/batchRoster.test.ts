/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG batch roster and assisted orders", () => {
  beforeEach(configureTestEnvironment);

  it("supports zero-data batch operations", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const batches = await admin.query(api.batches.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(batches.page).toEqual([]);
  });

  it("returns customer roster, purchase summary, and unassigned work", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Roster Catalog", "2001", "roster-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "roster-code" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "roster-code" });
    const firstOrder = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Roster Customer A",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    const secondOrder = await secondCustomer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Roster Customer B",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const batch = await admin.mutation(api.batches.create, { name: "Roster Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: firstOrder.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: firstOrder.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 2,
    });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: secondOrder.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });

    const detail = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(detail).toMatchObject({
      rosterLocked: false,
      assignmentCount: 2,
      assignedQuantity: 3,
      customerCount: 2,
      purchaseSummary: [{ bookVariantId: catalog.variantIds[0], quantity: 3, customerCount: 2 }],
    });
    expect(detail.customerRoster).toHaveLength(2);
    expect(await customer.query(api.batchTracking.listMine, {})).toEqual([
      expect.objectContaining({ batchId: batch.batchId, name: "Roster Batch" }),
    ]);
    expect(await customer.query(api.notifications.listMine, { surface: "notification" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: "batch.opened", destination: `/account/batches/${batch.batchId}` }),
      ]),
    );
    const unassigned = await admin.query(api.batchTracking.listUnassignedForAdmin, { batchId: batch.batchId });
    expect(unassigned).toMatchObject([]);
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(actions).toContain("batch.item_assigned");
    await expect(customer.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
  });

  it("moves and removes assignments before locking the roster", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Move Catalog", "2002", "move-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "move-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Move Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    const fromBatch = await admin.mutation(api.batches.create, { name: "Move From" });
    const toBatch = await admin.mutation(api.batches.create, { name: "Move To" });
    await admin.mutation(api.batches.linkCatalog, { batchId: fromBatch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: toBatch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: fromBatch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.moveOrderItem, {
      orderItemId: order.items[0]._id,
      fromBatchId: fromBatch.batchId,
      toBatchId: toBatch.batchId,
    });
    expect((await admin.query(api.batchTracking.getForAdmin, { batchId: fromBatch.batchId })).assignments).toEqual([]);
    await admin.mutation(api.batchTracking.unassignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: toBatch.batchId,
    });
    await expect(
      admin.mutation(api.batchTracking.unassignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: toBatch.batchId,
      }),
    ).rejects.toThrow("BATCH_ASSIGNMENT_NOT_FOUND");
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: fromBatch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.updateShipmentStage, {
      batchId: fromBatch.batchId,
      toStage: "po_closed",
    });
    await expect(
      admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: fromBatch.batchId,
        assignedQuantity: 1,
      }),
    ).rejects.toThrow("BATCH_LOCKED");
    await expect(
      admin.mutation(api.batchTracking.unassignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: fromBatch.batchId,
      }),
    ).rejects.toThrow("BATCH_LOCKED");
    await expect(
      admin.mutation(api.batches.unlinkCatalog, {
        batchId: fromBatch.batchId,
        catalogId: catalog.catalogId,
      }),
    ).rejects.toThrow("BATCH_LOCKED");
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(actions).toEqual(expect.arrayContaining(["batch.item_moved", "batch.item_unassigned"]));
  });

  it("creates assisted orders only for active existing customers", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Assisted Catalog", "2003", "assisted-code");
    const adminUser = await admin.query(api.users.current, {});
    const customerUser = await customer.query(api.users.current, {});
    if (!adminUser || !customerUser) throw new Error("assisted order users missing");
    const eligible = await admin.query(api.orders.listEligibleCustomers, {});
    expect(eligible).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ customerUserId: customerUser.appUserId, memberCode: customerUser.memberCode }),
      ]),
    );
    await expect(customer.query(api.orders.listEligibleCustomers, {})).rejects.toThrow("PERMISSION_DENIED");
    const order = await admin.mutation(api.orders.createAssisted, {
      customerUserId: customerUser.appUserId,
      catalogId: catalog.catalogId,
      submissionKey: "assisted-order-1",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    expect(order).toMatchObject({ source: "admin_assisted", totalAmount: 250000 });
    await expect(
      admin.mutation(api.orders.createAssisted, {
        customerUserId: customerUser.appUserId,
        catalogId: catalog.catalogId,
        submissionKey: "assisted-order-1",
        items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
      }),
    ).rejects.toThrow("ASSISTED_ORDER_DUPLICATE");
    const batch = await admin.mutation(api.batches.create, { name: "Assisted Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    expect((await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignments).toHaveLength(1);
    expect(
      (await customer.query(api.orders.listMine, { paginationOpts: { numItems: 10, cursor: null } })).page,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ orderId: order.orderId, source: "admin_assisted" })]));
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).find((event) => event.targetId === String(order.orderId)),
      ),
    ).toMatchObject({ actorUserId: adminUser.appUserId, action: "order.admin_assisted_created" });
    await expect(
      customer.mutation(api.orders.createAssisted, {
        customerUserId: customerUser.appUserId,
        catalogId: catalog.catalogId,
        submissionKey: "assisted-order-2",
        items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await owner.mutation(api.users.suspend, { userId: customerUser.appUserId });
    await expect(
      admin.mutation(api.orders.createAssisted, {
        customerUserId: customerUser.appUserId,
        catalogId: catalog.catalogId,
        submissionKey: "assisted-order-3",
        items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("CUSTOMER_REQUIRED");
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(actions).toContain("order.admin_assisted_created");
  });

  it("allows multi-publisher Batch items with one shared close date and protects the customer projection", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const catalog = await admin.mutation(api.secretCatalogs.createBundle, {
      name: "Shared Deadline Catalog",
      publisherName: "Publisher A",
      bookTitle: "Book A",
      closesAt: deadline,
      accessCode: "shared-deadline-code",
      variants: [{ format: "PB", isbn: "97800009921", priceAmount: 110000 }],
    });
    await admin.mutation(api.bookVariants.update, {
      bookVariantId: catalog.variantIds[0],
      supplierPriceGbpMinor: 1299,
    });
    for (const [publisherName, title, isbn, supplierPriceGbpMinor] of [
      ["Publisher B", "Book B", "97800009922", 1599],
      ["Publisher C", "Book C", "97800009923", undefined],
    ] as const) {
      const publisherId = await admin.mutation(api.publishers.create, { name: publisherName });
      const bookId = await admin.mutation(api.books.create, { publisherId, title });
      await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
      const variantId = await admin.mutation(api.bookVariants.create, {
        bookId,
        format: "PB",
        isbn,
        priceAmount: 115000,
        ...(supplierPriceGbpMinor === undefined ? {} : { supplierPriceGbpMinor }),
      });
      await admin.mutation(api.catalogItems.add, { catalogId: catalog.catalogId, bookVariantId: variantId });
      catalog.variantIds.push(variantId);
    }
    await admin.mutation(api.secretCatalogs.open, { catalogId: catalog.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "shared-deadline-code" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "shared-deadline-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Shared Deadline Customer",
      items: catalog.variantIds.map((variantId, index) => ({ variantId, quantity: index === 0 ? 2 : 1 })),
    });
    const secondOrder = await secondCustomer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Shared Deadline Customer Two",
      items: catalog.variantIds.map((variantId, index) => ({ variantId, quantity: index === 1 ? 2 : 1 })),
    });
    const batch = await admin.mutation(api.batches.create, {
      name: "Shared Deadline Batch",
      poDeadlineAt: deadline,
      etaCargoMonth: "2026-10",
    });
    expect(batch.referenceCode).toMatch(/^BFG-BAT-\d{6}-[0-9A-Z]{4}$/);
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await expect(admin.query(api.batches.getForAdmin, { batchId: batch.batchId })).resolves.toMatchObject({
      catalogLinks: [
        expect.objectContaining({
          catalogId: catalog.catalogId,
          eligibleOrderItemCount: 6,
          eligibleCustomerCount: 2,
          eligibleQuantity: 8,
          publisherCount: 3,
        }),
      ],
    });
    for (const item of order.items) {
      await admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: item._id,
        batchId: batch.batchId,
        assignedQuantity: item.quantity,
      });
    }
    for (const item of secondOrder.items) {
      await admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: item._id,
        batchId: batch.batchId,
        assignedQuantity: item.quantity,
      });
    }

    const detail = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(detail.purchaseSummary).toHaveLength(3);
    expect(
      detail.purchaseSummary.map((item) => ({
        publisherName: item.publisherName,
        isbn: item.isbn,
        bookTitle: item.bookTitle,
        format: item.format,
        quantity: item.quantity,
        supplierPriceGbpMinor: item.supplierPriceGbpMinor,
        unitPriceAmount: item.unitPriceAmount,
      })),
    ).toEqual([
      {
        publisherName: "Publisher A",
        isbn: "97800009921",
        bookTitle: "Book A",
        format: "PB",
        quantity: 3,
        supplierPriceGbpMinor: 1299,
        unitPriceAmount: 110000,
      },
      {
        publisherName: "Publisher B",
        isbn: "97800009922",
        bookTitle: "Book B",
        format: "PB",
        quantity: 3,
        supplierPriceGbpMinor: 1599,
        unitPriceAmount: 115000,
      },
      {
        publisherName: "Publisher C",
        isbn: "97800009923",
        bookTitle: "Book C",
        format: "PB",
        quantity: 2,
        supplierPriceGbpMinor: null,
        unitPriceAmount: 115000,
      },
    ]);
    await admin.mutation(api.batches.updateEtaCargoMonth, {
      batchId: batch.batchId,
      etaCargoMonth: undefined,
    });
    await expect(admin.query(api.batches.getForAdmin, { batchId: batch.batchId })).resolves.toMatchObject({
      etaCargoMonth: null,
    });
    await expect(customer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId })).resolves.toMatchObject({
      etaCargoMonth: null,
    });
    await admin.mutation(api.batches.updateEtaCargoMonth, {
      batchId: batch.batchId,
      etaCargoMonth: "2026-10",
    });
    const customerBatch = await customer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId });
    expect(customerBatch).toMatchObject({
      batchId: batch.batchId,
      etaCargoMonth: "2026-10",
      items: expect.arrayContaining([expect.objectContaining({ title: "Book A" })]),
    });
    expect(customerBatch?.availableItems).toHaveLength(3);
    expect(new Set(customerBatch?.availableItems.map((item) => item.publisher))).toEqual(
      new Set(["Publisher A", "Publisher B", "Publisher C"]),
    );
    await expect(
      secondCustomer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId }),
    ).resolves.toMatchObject({
      batchId: batch.batchId,
      etaCargoMonth: "2026-10",
      items: expect.arrayContaining([expect.objectContaining({ title: "Book B", quantity: 2 })]),
    });

    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    await admin.mutation(api.batches.updateEtaCargoMonth, {
      batchId: batch.batchId,
      etaCargoMonth: "2026-11",
    });
    await expect(admin.query(api.batches.getForAdmin, { batchId: batch.batchId })).resolves.toMatchObject({
      etaCargoMonth: "2026-11",
    });
    await expect(customer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId })).resolves.toMatchObject({
      etaCargoMonth: "2026-11",
    });
    await expect(
      admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: batch.batchId,
        assignedQuantity: 1,
      }),
    ).rejects.toThrow("BATCH_LOCKED");
  });

  it("rejects a Batch whose close date differs from its Catalog close date", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const catalog = await admin.mutation(api.secretCatalogs.createBundle, {
      name: "Deadline Mismatch Catalog",
      publisherName: "Deadline Publisher",
      bookTitle: "Deadline Book",
      closesAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      accessCode: "deadline-mismatch-code",
      variants: [{ format: "PB", isbn: "97800009931", priceAmount: 110000 }],
    });
    await admin.mutation(api.secretCatalogs.open, { catalogId: catalog.catalogId });
    const batch = await admin.mutation(api.batches.create, {
      name: "Mismatched Deadline Batch",
      poDeadlineAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    });
    await expect(
      admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId }),
    ).rejects.toThrow("BATCH_DEADLINE_MISMATCH");
  });
});
