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
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer user missing");
    const eligible = await admin.query(api.orders.listEligibleCustomers, {});
    expect(eligible.map((item) => item.customerUserId)).toContain(customerUser.appUserId);
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
});
