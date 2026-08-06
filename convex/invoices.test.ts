/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const adminAccessCode = "test-admin-code";
const adminToken = "invoice-admin-token-012345678901234567890123456789";
const customerToken = "invoice-customer-token-012345678901234567890123456789";
const secondCustomerToken = "invoice-second-customer-token-012345678901234567890123456789";

function testConvex() {
  return convexTest(schema, import.meta.glob("./**/*.ts"));
}

async function createOrder(t: ReturnType<typeof testConvex>) {
  await t.mutation(api.prototypeSessions.createCustomer, { token: adminToken });
  await t.mutation(api.prototypeSessions.claimAdmin, { token: adminToken, accessCode: adminAccessCode });
  const bundle = await t.mutation(api.secretCatalogs.createBundle, {
    sessionToken: adminToken,
    name: "Invoice Catalog",
    publisherName: "Invoice Publisher",
    bookTitle: "Invoice Snapshot Book",
    accessCode: "invoice-catalog-code",
    variants: [{ format: "PB", isbn: "9780000012346", priceAmount: 125000 }],
  });
  await t.mutation(api.secretCatalogs.open, { sessionToken: adminToken, catalogId: bundle.catalogId });
  await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
  await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "invoice-catalog-code" });
  return t.mutation(api.orders.submit, {
    sessionToken: customerToken,
    catalogId: bundle.catalogId,
    customerName: "Invoice Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 2 }],
  });
}

describe("BFG invoice persistence", () => {
  beforeEach(() => {
    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
    process.env.BFG_SESSION_TOKEN_PEPPER = "session-test-pepper";
    process.env.BFG_PREVIEW_ADMIN_ACCESS_CODE = adminAccessCode;
  });

  it("creates draft snapshots and calculates an exact percentage requirement", async () => {
    const t = testConvex();
    const order = await createOrder(t);
    const invoice = await t.mutation(api.invoices.create, {
      sessionToken: adminToken,
      orderId: order.orderId,
      depositRequirementMode: "percentage",
      depositRequirementValue: 3333,
    });
    expect(invoice).toMatchObject({
      status: "draft",
      invoiceNumber: expect.stringMatching(/^BFG-\d{6}-.+$/),
      totalAmount: 250000,
      depositRequiredAmount: 83325,
      allocatedDepositAmount: 0,
      outstandingAmount: 250000,
    });
    expect(invoice.items[0]).toMatchObject({
      bookTitleSnapshot: "Invoice Snapshot Book",
      unitPriceAmountSnapshot: 125000,
      quantity: 2,
      subtotalAmount: 250000,
    });
    expect(invoice.items[0]).not.toHaveProperty("orderItemId");
  });

  it("rejects duplicate active invoices, issues, voids, and preserves records", async () => {
    const t = testConvex();
    const order = await createOrder(t);
    const invoice = await t.mutation(api.invoices.create, {
      sessionToken: adminToken,
      orderId: order.orderId,
      depositRequirementMode: "fixed",
      depositRequirementValue: 50000,
    });
    await expect(
      t.mutation(api.invoices.create, {
        sessionToken: adminToken,
        orderId: order.orderId,
        depositRequirementMode: "none",
      }),
    ).rejects.toThrow("INVOICE_ALREADY_EXISTS");
    await t.mutation(api.invoices.issue, { sessionToken: adminToken, invoiceId: invoice.invoiceId });
    await expect(
      t.mutation(api.invoices.issue, { sessionToken: adminToken, invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("INVOICE_ALREADY_ISSUED");
    await t.mutation(api.invoices.voidInvoice, { sessionToken: adminToken, invoiceId: invoice.invoiceId });
    await expect(
      t.mutation(api.invoices.issue, { sessionToken: adminToken, invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("INVOICE_VOID");
    const replacement = await t.mutation(api.invoices.create, {
      sessionToken: adminToken,
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    expect(replacement.invoiceId).not.toBe(invoice.invoiceId);
    const all = await t.query(api.invoices.listForAdmin, {
      sessionToken: adminToken,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(all.page).toHaveLength(2);
    expect(all.page.some((item: { status: string }) => item.status === "void")).toBe(true);
  });

  it("validates requirement bounds and protects customer invoices", async () => {
    const t = testConvex();
    const order = await createOrder(t);
    await expect(
      t.mutation(api.invoices.create, {
        sessionToken: adminToken,
        orderId: order.orderId,
        depositRequirementMode: "fixed",
        depositRequirementValue: 250001,
      }),
    ).rejects.toThrow("INVOICE_REQUIREMENT_INVALID");
    await expect(
      t.mutation(api.invoices.create, {
        sessionToken: adminToken,
        orderId: order.orderId,
        depositRequirementMode: "percentage",
        depositRequirementValue: 10001,
      }),
    ).rejects.toThrow("INVOICE_REQUIREMENT_INVALID");

    const invoice = await t.mutation(api.invoices.create, {
      sessionToken: adminToken,
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    const mine = await t.query(api.invoices.getMine, { sessionToken: customerToken, invoiceId: invoice.invoiceId });
    expect(mine).toMatchObject({ invoiceId: invoice.invoiceId });
    expect(mine).not.toHaveProperty("customerSessionId");
    await t.mutation(api.prototypeSessions.createCustomer, { token: secondCustomerToken });
    await expect(
      t.query(api.invoices.getMine, { sessionToken: secondCustomerToken, invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("INVOICE_ACCESS_DENIED");
  });
});
