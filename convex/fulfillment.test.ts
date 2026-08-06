/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const adminAccessCode = "test-admin-code";
const adminToken = "fulfillment-admin-token-012345678901234567890123456789";
const customerToken = "fulfillment-customer-token-012345678901234567890123456789";
const secondCustomerToken = "fulfillment-second-customer-token-012345678901234567890123456789";

function testConvex() {
  return convexTest(schema, import.meta.glob("./**/*.ts"));
}

async function createOrder(t: ReturnType<typeof testConvex>) {
  await t.mutation(api.prototypeSessions.createCustomer, { token: adminToken });
  await t.mutation(api.prototypeSessions.claimAdmin, { token: adminToken, accessCode: adminAccessCode });
  const bundle = await t.mutation(api.secretCatalogs.createBundle, {
    sessionToken: adminToken,
    name: "Fulfillment Catalog",
    publisherName: "Fulfillment Publisher",
    bookTitle: "Fulfillment Book",
    accessCode: "fulfillment-catalog-code",
    variants: [{ format: "PB", isbn: "9780000012345", priceAmount: 100000 }],
  });
  await t.mutation(api.secretCatalogs.open, { sessionToken: adminToken, catalogId: bundle.catalogId });
  await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
  await t.mutation(api.catalogAccess.unlock, {
    sessionToken: customerToken,
    accessCode: "fulfillment-catalog-code",
  });
  const order = await t.mutation(api.orders.submit, {
    sessionToken: customerToken,
    catalogId: bundle.catalogId,
    customerName: "Fulfillment Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
  });
  return order;
}

describe("BFG order fulfillment tracking", () => {
  beforeEach(() => {
    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
    process.env.BFG_SESSION_TOKEN_PEPPER = "session-test-pepper";
    process.env.BFG_PREVIEW_ADMIN_ACCESS_CODE = adminAccessCode;
  });

  it("accepts forward stages, rejects backward stages, and keeps ordered history", async () => {
    const t = testConvex();
    const order = await createOrder(t);
    await t.mutation(api.orderFulfillment.updateStage, {
      sessionToken: adminToken,
      orderId: order.orderId,
      toStage: "awaiting_payment",
    });
    await t.mutation(api.orderFulfillment.updateStage, {
      sessionToken: adminToken,
      orderId: order.orderId,
      toStage: "awaiting_address",
    });
    await expect(
      t.mutation(api.orderFulfillment.updateStage, {
        sessionToken: adminToken,
        orderId: order.orderId,
        toStage: "awaiting_payment",
      }),
    ).rejects.toThrow("INVALID_FULFILLMENT_TRANSITION");

    const timeline = await t.query(api.orderFulfillment.getMine, {
      sessionToken: customerToken,
      orderId: order.orderId,
    });
    expect(timeline.currentStage).toBe("awaiting_address");
    expect(timeline.history.map((event: { toStage: string }) => event.toStage)).toEqual([
      "awaiting_payment",
      "awaiting_address",
    ]);
  });

  it("requires admin writes and protects customer ownership", async () => {
    const t = testConvex();
    const order = await createOrder(t);
    await expect(
      t.mutation(api.orderFulfillment.updateStage, {
        sessionToken: customerToken,
        orderId: order.orderId,
        toStage: "awaiting_payment",
      }),
    ).rejects.toThrow("ADMIN_REQUIRED");

    await t.mutation(api.prototypeSessions.createCustomer, { token: secondCustomerToken });
    await expect(
      t.query(api.orderFulfillment.getMine, { sessionToken: secondCustomerToken, orderId: order.orderId }),
    ).rejects.toThrow("ORDER_ACCESS_DENIED");
  });
});
