/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG human-facing order references", () => {
  beforeEach(configureTestEnvironment);

  it("generates stable unique references and safely backfills a legacy order", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Order Reference Catalog", "8811", "order-reference-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "order-reference-code" });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "order-reference-code" });
    const first = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Reference A",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const second = await secondCustomer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Reference B",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    expect(first.orderCode).toMatch(/^BFG-ORD-\d{6}-[0-9A-Z]{4,}$/);
    expect(second.orderCode).toMatch(/^BFG-ORD-\d{6}-[0-9A-Z]{4,}$/);
    expect(second.orderCode).not.toBe(first.orderCode);
    expect((await customer.query(api.orders.getMine, { orderId: first.orderId })).orderCode).toBe(first.orderCode);

    await t.run(async (ctx) => ctx.db.patch(first.orderId, { orderCode: undefined }));
    const backfill = await admin.mutation(api.orders.backfillOrderCodes, { limit: 10 });
    expect(backfill.updated).toBe(1);
    expect((await admin.query(api.orders.getForAdmin, { orderId: first.orderId })).orderCode).toMatch(
      /^BFG-ORD-\d{6}-[0-9A-Z]{4,}$/,
    );
  });
});
