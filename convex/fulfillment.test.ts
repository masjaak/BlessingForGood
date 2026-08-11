/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createOrder(t: ReturnType<typeof testConvex>) {
  const users = await setupUsers(t);
  const bundle = await createOpenCatalog(users.admin, "Fulfillment Catalog", "2345", "fulfillment-code");
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode: "fulfillment-code" });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: bundle.catalogId,
    customerName: "Fulfillment Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
  });
  return { ...users, order };
}

describe("BFG order fulfillment tracking", () => {
  beforeEach(configureTestEnvironment);

  it("accepts forward stages and rejects backward stages", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    await admin.mutation(api.orderFulfillment.updateStage, { orderId: order.orderId, toStage: "awaiting_payment" });
    await admin.mutation(api.orderFulfillment.updateStage, { orderId: order.orderId, toStage: "awaiting_address" });
    await expect(
      admin.mutation(api.orderFulfillment.updateStage, { orderId: order.orderId, toStage: "awaiting_payment" }),
    ).rejects.toThrow("INVALID_FULFILLMENT_TRANSITION");
    const timeline = await customer.query(api.orderFulfillment.getMine, { orderId: order.orderId });
    expect(timeline.currentStage).toBe("awaiting_address");
    expect(timeline.history.map((event: { toStage: string }) => event.toStage)).toEqual([
      "awaiting_payment",
      "awaiting_address",
    ]);
  });

  it("requires admin writes and protects customer ownership", async () => {
    const t = testConvex();
    const { customer, secondCustomer, order } = await createOrder(t);
    await expect(
      customer.mutation(api.orderFulfillment.updateStage, { orderId: order.orderId, toStage: "awaiting_payment" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(secondCustomer.query(api.orderFulfillment.getMine, { orderId: order.orderId })).rejects.toThrow(
      "ORDER_ACCESS_DENIED",
    );
  });
});
