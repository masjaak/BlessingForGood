/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { asUser, configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createOwnedOrder(
  customer: ReturnType<typeof asUser>,
  catalogId: string,
  variantId: string,
  accessCode: string,
) {
  await customer.mutation(api.catalogAccess.unlock, { accessCode });
  return customer.mutation(api.orders.submit, {
    catalogId: catalogId as never,
    customerName: "Operations Customer",
    items: [{ variantId: variantId as never, quantity: 2 }],
  });
}

describe("BFG batches and shipment tracking", () => {
  beforeEach(configureTestEnvironment);

  it("edits batch metadata before lock and rejects edits after lock", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const firstDeadline = Date.now() + 24 * 60 * 60 * 1000;
    const nextDeadline = firstDeadline + 24 * 60 * 60 * 1000;

    const created = await admin.mutation(api.batches.create, {
      name: "Editable Batch",
      description: "Before update",
      poDeadlineAt: firstDeadline,
    });

    await admin.mutation(api.batches.update, {
      batchId: created.batchId,
      name: "Updated Batch",
      description: "After update",
      poDeadlineAt: nextDeadline,
    });
    await admin.mutation(api.batches.update, {
      batchId: created.batchId,
      name: "Renamed Batch",
    });

    await expect(admin.query(api.batches.getForAdmin, { batchId: created.batchId })).resolves.toMatchObject({
      name: "Renamed Batch",
      description: "After update",
      poDeadlineAt: nextDeadline,
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(created.batchId, {
        currentShipmentStage: "po_closed",
        updatedAt: Date.now(),
      });
    });

    await expect(
      admin.mutation(api.batches.update, {
        batchId: created.batchId,
        name: "Illegal update",
        description: "Should not persist",
        poDeadlineAt: nextDeadline,
      }),
    ).rejects.toThrow("BATCH_LOCKED");
  });

  it("requires admin for batches and keeps catalog links unique", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    await expect(customer.mutation(api.batches.create, { name: "Customer Batch" })).rejects.toThrow("PERMISSION_DENIED");
    const catalog = await createOpenCatalog(admin, "Operations Main", "1001", "catalog-1001");
    const batch = await admin.mutation(api.batches.create, { name: "Cargo Main" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await expect(admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId })).rejects.toThrow(
      "VALIDATION_FAILED",
    );
  });

  it("supports multiple Catalog relationships and unlinks only the relationship", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const firstCatalog = await createOpenCatalog(admin, "Multi Catalog One", "1010", "multi-catalog-one");
    const secondCatalog = await createOpenCatalog(admin, "Multi Catalog Two", "1011", "multi-catalog-two");
    const batch = await admin.mutation(api.batches.create, { name: "Multi Catalog Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: firstCatalog.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: secondCatalog.catalogId });
    expect((await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).catalogLinks).toHaveLength(2);

    await admin.mutation(api.batches.unlinkCatalog, { batchId: batch.batchId, catalogId: firstCatalog.catalogId });
    const detail = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(detail.catalogLinks).toEqual([expect.objectContaining({ catalogId: secondCatalog.catalogId })]);
    expect(await admin.query(api.secretCatalogs.getForAdmin, { catalogId: firstCatalog.catalogId })).not.toBeNull();
  });

  it("assigns only linked catalog items without exceeding quantity", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Operations Main", "1002", "catalog-1002");
    const otherCatalog = await createOpenCatalog(admin, "Operations Other", "1003", "catalog-1003");
    const order = await createOwnedOrder(customer, catalog.catalogId as string, catalog.variantIds[0] as string, "catalog-1002");
    const mainBatch = await admin.mutation(api.batches.create, { name: "Cargo Main" });
    const secondBatch = await admin.mutation(api.batches.create, { name: "Cargo Second" });
    const unrelatedBatch = await admin.mutation(api.batches.create, { name: "Cargo Other" });
    await admin.mutation(api.batches.linkCatalog, { batchId: mainBatch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: secondBatch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: unrelatedBatch.batchId, catalogId: otherCatalog.catalogId });
    await expect(
      admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: unrelatedBatch.batchId,
        assignedQuantity: 1,
      }),
    ).rejects.toThrow("BATCH_CATALOG_MISMATCH");
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: mainBatch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: secondBatch.batchId,
      assignedQuantity: 1,
    });
    await expect(
      admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: secondBatch.batchId,
        assignedQuantity: 2,
      }),
    ).rejects.toThrow("BATCH_ASSIGNMENT_EXCEEDS_QUANTITY");
  });

  it("returns order assignments for the admin workspace", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Operations Order", "1005", "catalog-1005");
    const order = await createOwnedOrder(customer, catalog.catalogId as string, catalog.variantIds[0] as string, "catalog-1005");
    const batch = await admin.mutation(api.batches.create, { name: "Cargo Order" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    const detail = await admin.query(api.batchTracking.getForOrderAdmin, { orderId: order.orderId });
    expect(detail.items[0]).toMatchObject({
      orderItemId: order.items[0]._id,
      orderedQuantity: 2,
      assignments: [{ batchId: batch.batchId, assignedQuantity: 1 }],
    });
  });

  it("persists forward shipment history and protects customer ownership", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Operations Timeline", "1004", "catalog-1004");
    const order = await createOwnedOrder(customer, catalog.catalogId as string, catalog.variantIds[0] as string, "catalog-1004");
    const batch = await admin.mutation(api.batches.create, { name: "Cargo Timeline" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    await admin.mutation(api.batchTracking.updateShipmentStage, {
      batchId: batch.batchId,
      toStage: "ordered_to_supplier",
    });
    await expect(
      admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" }),
    ).rejects.toThrow("INVALID_SHIPMENT_TRANSITION");
    await admin.mutation(api.batchTracking.updateShipmentStage, {
      batchId: batch.batchId,
      toStage: "at_store",
      allowSkip: true,
    });
    const tracking = await customer.query(api.batchTracking.getMine, { orderId: order.orderId });
    expect(tracking.batches[0]).toMatchObject({ name: "Cargo Timeline", currentShipmentStage: "at_store" });
    await expect(secondCustomer.query(api.batchTracking.getMine, { orderId: order.orderId })).rejects.toThrow(
      "ORDER_ACCESS_DENIED",
    );
  });
});
