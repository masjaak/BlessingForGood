/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createOrder(t: ReturnType<typeof testConvex>) {
  const users = await setupUsers(t);
  const bundle = await createOpenCatalog(users.admin, "Invoice Catalog", "2346", "invoice-code");
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode: "invoice-code" });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: bundle.catalogId,
    customerName: "Invoice Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 2 }],
  });
  return { ...users, order };
}

describe("BFG invoice persistence", () => {
  beforeEach(configureTestEnvironment);

  it("creates exact invoice snapshots", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
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
    expect(invoice.items[0]).toMatchObject({ quantity: 2, subtotalAmount: 250000 });
    expect(invoice.items[0]).not.toHaveProperty("orderItemId");
  });

  it("rejects duplicate active invoices, issues, voids, and preserves records", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "fixed",
      depositRequirementValue: 50000,
    });
    await expect(admin.mutation(api.invoices.create, { orderId: order.orderId, depositRequirementMode: "none" })).rejects.toThrow(
      "INVOICE_ALREADY_EXISTS",
    );
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    await expect(admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_ALREADY_ISSUED",
    );
    await admin.mutation(api.invoices.voidInvoice, { invoiceId: invoice.invoiceId });
    await expect(admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId })).rejects.toThrow("INVOICE_VOID");
    const replacement = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    expect(replacement.invoiceId).not.toBe(invoice.invoiceId);
    const all = await admin.query(api.invoices.listForAdmin, { paginationOpts: { numItems: 10, cursor: null } });
    expect(all.page).toHaveLength(2);
  });

  it("validates requirement bounds and protects customer invoices", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, order } = await createOrder(t);
    await expect(
      admin.mutation(api.invoices.create, {
        orderId: order.orderId,
        depositRequirementMode: "fixed",
        depositRequirementValue: 250001,
      }),
    ).rejects.toThrow("INVOICE_REQUIREMENT_INVALID");
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    expect(await customer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).toMatchObject({
      invoiceId: invoice.invoiceId,
    });
    await expect(secondCustomer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_ACCESS_DENIED",
    );
  });

  it("denies cancellation while settlement exists, then allows it after a ledger-safe release", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    const issued = await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: issued.invoiceId, amount: 100000 });
    const allocation = await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: issued.invoiceId,
      amount: 50000,
    });
    await expect(admin.mutation(api.invoices.voidInvoice, { invoiceId: issued.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
    await expect(customer.mutation(api.invoices.voidInvoice, { invoiceId: issued.invoiceId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await admin.mutation(api.invoiceDepositAllocations.release, { allocationId: allocation.allocationId });
    await admin.mutation(api.invoices.voidInvoice, { invoiceId: issued.invoiceId });
    await expect(admin.mutation(api.invoices.voidInvoice, { invoiceId: issued.invoiceId })).rejects.toThrow("INVOICE_VOID");
  });
});
