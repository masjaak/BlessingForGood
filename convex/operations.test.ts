/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const adminAccessCode = "test-admin-code";
const adminToken = "operations-admin-token-012345678901234567890123456789";
const customerToken = "operations-customer-token-012345678901234567890123456789";
const secondCustomerToken = "operations-second-customer-token-012345678901234567890123456789";

function testConvex() {
  return convexTest(schema, import.meta.glob("./**/*.ts"));
}

async function createAdmin(t: ReturnType<typeof testConvex>) {
  await t.mutation(api.prototypeSessions.createCustomer, { token: adminToken });
  await t.mutation(api.prototypeSessions.claimAdmin, { token: adminToken, accessCode: adminAccessCode });
  return adminToken;
}

async function createOpenCatalog(t: ReturnType<typeof testConvex>, name: string, suffix: string) {
  const bundle = await t.mutation(api.secretCatalogs.createBundle, {
    sessionToken: adminToken,
    name,
    publisherName: `Operations Publisher ${suffix}`,
    bookTitle: `Operations Book ${suffix}`,
    accessCode: `catalog-${suffix}`,
    variants: [{ format: "PB", isbn: `978000000${suffix}`, priceAmount: 100000 }],
  });
  await t.mutation(api.secretCatalogs.open, { sessionToken: adminToken, catalogId: bundle.catalogId });
  return { ...bundle, accessCode: `catalog-${suffix}` };
}

async function createOwnedOrder(
  t: ReturnType<typeof testConvex>,
  catalogId: string,
  variantId: string,
  accessCode: string,
  quantity = 2,
) {
  await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
  await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode });
  return t.mutation(api.orders.submit, {
    sessionToken: customerToken,
    catalogId: catalogId as never,
    customerName: "Operations Customer",
    items: [{ variantId: variantId as never, quantity }],
  });
}

describe("BFG batches and shipment tracking", () => {
  beforeEach(() => {
    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
    process.env.BFG_SESSION_TOKEN_PEPPER = "session-test-pepper";
    process.env.BFG_PREVIEW_ADMIN_ACCESS_CODE = adminAccessCode;
  });

  it("requires admin for batches and keeps catalog links unique", async () => {
    const t = testConvex();
    await createAdmin(t);
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await expect(
      t.mutation(api.batches.create, { sessionToken: customerToken, name: "Customer Batch" }),
    ).rejects.toThrow("ADMIN_REQUIRED");

    const catalog = await createOpenCatalog(t, "Operations Main", "1001");
    const batch = await t.mutation(api.batches.create, { sessionToken: adminToken, name: "Cargo Main" });
    await t.mutation(api.batches.linkCatalog, {
      sessionToken: adminToken,
      batchId: batch.batchId,
      catalogId: catalog.catalogId,
    });
    await expect(
      t.mutation(api.batches.linkCatalog, {
        sessionToken: adminToken,
        batchId: batch.batchId,
        catalogId: catalog.catalogId,
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });

  it("assigns only linked catalog items without exceeding quantity", async () => {
    const t = testConvex();
    await createAdmin(t);
    const catalog = await createOpenCatalog(t, "Operations Main", "1002");
    const otherCatalog = await createOpenCatalog(t, "Operations Other", "1003");
    const order = await createOwnedOrder(
      t,
      catalog.catalogId as string,
      catalog.variantIds[0] as string,
      catalog.accessCode,
    );
    const mainBatch = await t.mutation(api.batches.create, { sessionToken: adminToken, name: "Cargo Main" });
    const secondBatch = await t.mutation(api.batches.create, { sessionToken: adminToken, name: "Cargo Second" });
    const unrelatedBatch = await t.mutation(api.batches.create, { sessionToken: adminToken, name: "Cargo Other" });
    await t.mutation(api.batches.linkCatalog, {
      sessionToken: adminToken,
      batchId: mainBatch.batchId,
      catalogId: catalog.catalogId,
    });
    await t.mutation(api.batches.linkCatalog, {
      sessionToken: adminToken,
      batchId: secondBatch.batchId,
      catalogId: catalog.catalogId,
    });
    await t.mutation(api.batches.linkCatalog, {
      sessionToken: adminToken,
      batchId: unrelatedBatch.batchId,
      catalogId: otherCatalog.catalogId,
    });

    const orderItemId = order.items[0]._id;
    await expect(
      t.mutation(api.batchTracking.assignOrderItem, {
        sessionToken: adminToken,
        orderItemId,
        batchId: unrelatedBatch.batchId,
        assignedQuantity: 1,
      }),
    ).rejects.toThrow("BATCH_CATALOG_MISMATCH");
    await t.mutation(api.batchTracking.assignOrderItem, {
      sessionToken: adminToken,
      orderItemId,
      batchId: mainBatch.batchId,
      assignedQuantity: 1,
    });
    await t.mutation(api.batchTracking.assignOrderItem, {
      sessionToken: adminToken,
      orderItemId,
      batchId: secondBatch.batchId,
      assignedQuantity: 1,
    });
    await expect(
      t.mutation(api.batchTracking.assignOrderItem, {
        sessionToken: adminToken,
        orderItemId,
        batchId: secondBatch.batchId,
        assignedQuantity: 2,
      }),
    ).rejects.toThrow("BATCH_ASSIGNMENT_EXCEEDS_QUANTITY");
  });

  it("persists forward shipment history and protects customer ownership", async () => {
    const t = testConvex();
    await createAdmin(t);
    const catalog = await createOpenCatalog(t, "Operations Main", "1004");
    const order = await createOwnedOrder(
      t,
      catalog.catalogId as string,
      catalog.variantIds[0] as string,
      catalog.accessCode,
    );
    const batch = await t.mutation(api.batches.create, { sessionToken: adminToken, name: "Cargo Timeline" });
    await t.mutation(api.batches.linkCatalog, {
      sessionToken: adminToken,
      batchId: batch.batchId,
      catalogId: catalog.catalogId,
    });
    await t.mutation(api.batchTracking.assignOrderItem, {
      sessionToken: adminToken,
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    await t.mutation(api.batchTracking.updateShipmentStage, {
      sessionToken: adminToken,
      batchId: batch.batchId,
      toStage: "po_closed",
    });
    await t.mutation(api.batchTracking.updateShipmentStage, {
      sessionToken: adminToken,
      batchId: batch.batchId,
      toStage: "ordered_to_supplier",
    });
    await expect(
      t.mutation(api.batchTracking.updateShipmentStage, {
        sessionToken: adminToken,
        batchId: batch.batchId,
        toStage: "po_closed",
      }),
    ).rejects.toThrow("INVALID_SHIPMENT_TRANSITION");
    await expect(
      t.mutation(api.batchTracking.updateShipmentStage, {
        sessionToken: adminToken,
        batchId: batch.batchId,
        toStage: "at_store",
      }),
    ).rejects.toThrow("INVALID_SHIPMENT_TRANSITION");
    await t.mutation(api.batchTracking.updateShipmentStage, {
      sessionToken: adminToken,
      batchId: batch.batchId,
      toStage: "at_store",
      allowSkip: true,
    });

    const tracking = await t.query(api.batchTracking.getMine, { sessionToken: customerToken, orderId: order.orderId });
    expect(tracking.batches[0]).toMatchObject({ name: "Cargo Timeline", currentShipmentStage: "at_store" });
    expect(tracking.batches[0].history.map((event: { toStage: string }) => event.toStage)).toEqual([
      "po_closed",
      "ordered_to_supplier",
      "at_store",
    ]);

    await t.mutation(api.prototypeSessions.createCustomer, { token: secondCustomerToken });
    await expect(
      t.query(api.batchTracking.getMine, { sessionToken: secondCustomerToken, orderId: order.orderId }),
    ).rejects.toThrow("ORDER_ACCESS_DENIED");
  });
});
