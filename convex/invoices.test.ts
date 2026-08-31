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
    const { admin, customer, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "percentage",
      depositRequirementValue: 3333,
    });
    expect(invoice).toMatchObject({
      status: "draft",
      invoiceNumber: expect.stringMatching(/^BFG-INV-\d{6}-[0-9A-Z]{4}$/),
      totalAmount: 250000,
      depositRequiredAmount: 83325,
      allocatedDepositAmount: 0,
      outstandingAmount: 250000,
    });
    expect(invoice.items[0]).toMatchObject({ quantity: 2, subtotalAmount: 250000 });
    expect(invoice.items[0]).not.toHaveProperty("orderItemId");
    expect(await admin.query(api.invoices.getForOrderAdmin, { orderId: order.orderId })).toMatchObject({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
    });
    expect(
      await admin.query(api.invoices.getByInvoiceNumberForAdmin, { invoiceNumber: invoice.invoiceNumber }),
    ).toMatchObject({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
    });
    await expect(
      customer.query(api.invoices.getByInvoiceNumberForAdmin, { invoiceNumber: invoice.invoiceNumber }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(customer.query(api.invoices.getForOrderAdmin, { orderId: order.orderId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
  });

  it("rejects duplicate active invoices, issues, voids, and preserves records", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "fixed",
      depositRequirementValue: 50000,
    });
    await expect(
      admin.mutation(api.invoices.create, { orderId: order.orderId, depositRequirementMode: "none" }),
    ).rejects.toThrow("INVOICE_ALREADY_EXISTS");
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

  it("keeps concurrent invoice creation to one non-void record", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const attempts = await Promise.allSettled(
      ["none", "none"].map(() =>
        admin.mutation(api.invoices.create, { orderId: order.orderId, depositRequirementMode: "none" }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    const invoices = await t.run((ctx) =>
      ctx.db
        .query("invoices")
        .withIndex("by_order", (index) => index.eq("orderId", order.orderId))
        .collect(),
    );
    expect(invoices.filter((invoice) => invoice.status !== "void")).toHaveLength(1);
  });

  it("keeps one invoice per order when one customer orders from two catalogs", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const firstCatalog = await createOpenCatalog(admin, "Invoice Catalog A", "2347", "invoice-code-a");
    const secondCatalog = await createOpenCatalog(admin, "Invoice Catalog B", "2348", "invoice-code-b");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "invoice-code-a" });
    const firstOrder = await customer.mutation(api.orders.submit, {
      catalogId: firstCatalog.catalogId,
      customerName: "Multi Catalog Customer",
      items: [{ variantId: firstCatalog.variantIds[0], quantity: 1 }],
    });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "invoice-code-b" });
    const secondOrder = await customer.mutation(api.orders.submit, {
      catalogId: secondCatalog.catalogId,
      customerName: "Multi Catalog Customer",
      items: [{ variantId: secondCatalog.variantIds[0], quantity: 1 }],
    });
    const firstInvoice = await admin.mutation(api.invoices.create, {
      orderId: firstOrder.orderId,
      depositRequirementMode: "none",
    });
    const secondInvoice = await admin.mutation(api.invoices.create, {
      orderId: secondOrder.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: firstInvoice.invoiceId });
    await admin.mutation(api.invoices.issue, { invoiceId: secondInvoice.invoiceId });

    const mine = await customer.query(api.invoices.listMine, { paginationOpts: { numItems: 10, cursor: null } });
    expect(mine.page).toHaveLength(2);
    expect(new Set(mine.page.map((invoice) => String(invoice.invoiceId)))).toEqual(
      new Set([String(firstInvoice.invoiceId), String(secondInvoice.invoiceId)]),
    );
    expect(new Set(mine.page.map((invoice) => String(invoice.orderId)))).toEqual(
      new Set([String(firstOrder.orderId), String(secondOrder.orderId)]),
    );
  });

  it("aggregates one final invoice per Customer × Batch across submissions and catalogs", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const firstCatalog = await createOpenCatalog(admin, "Pooled Invoice Catalog A", "2351", "pooled-invoice-code-a");
    const secondCatalog = await createOpenCatalog(admin, "Pooled Invoice Catalog B", "2352", "pooled-invoice-code-b");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "pooled-invoice-code-a" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "pooled-invoice-code-b" });
    const firstOrder = await customer.mutation(api.orders.submit, {
      catalogId: firstCatalog.catalogId,
      customerName: "Pooled Invoice Customer",
      items: [{ variantId: firstCatalog.variantIds[0], quantity: 1 }],
    });
    const secondOrder = await customer.mutation(api.orders.submit, {
      catalogId: secondCatalog.catalogId,
      customerName: "Pooled Invoice Customer",
      items: [{ variantId: secondCatalog.variantIds[0], quantity: 2 }],
    });
    await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "pooled-invoice-code-a" });
    const secondCustomerOrder = await secondCustomer.mutation(api.orders.submit, {
      catalogId: firstCatalog.catalogId,
      customerName: "Second Pooled Customer",
      items: [{ variantId: firstCatalog.variantIds[0], quantity: 1 }],
    });
    const customerUser = await customer.query(api.users.current, {});
    const secondCustomerUser = await secondCustomer.query(api.users.current, {});
    if (!customerUser || !secondCustomerUser) throw new Error("invoice customer fixture missing");
    const batch = await admin.mutation(api.batches.create, { name: "Invoice PO Lavender" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: firstCatalog.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: secondCatalog.catalogId });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    const ready = await admin.query(api.invoices.listReadyForIssuance, {
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(ready.page).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          customerUserId: customerUser.appUserId,
          batchId: batch.batchId,
          bookCount: 3,
          orderCount: 2,
          totalAmount: 375000,
          eligible: true,
        }),
        expect.objectContaining({
          customerUserId: secondCustomerUser.appUserId,
          batchId: batch.batchId,
          bookCount: 1,
          orderCount: 1,
          totalAmount: 125000,
          eligible: true,
        }),
      ]),
    );

    const draft = await admin.mutation(api.invoices.create, {
      orderId: firstOrder.orderId,
      depositRequirementMode: "percentage",
      depositRequirementValue: 2500,
    });
    expect(draft).toMatchObject({
      batchId: batch.batchId,
      totalAmount: 375000,
      depositRequiredAmount: 93750,
      items: expect.arrayContaining([
        expect.objectContaining({ bookTitleSnapshot: "Pooled Invoice Catalog A Book", quantity: 1 }),
        expect.objectContaining({ bookTitleSnapshot: "Pooled Invoice Catalog B Book", quantity: 2 }),
      ]),
    });
    const issued = await admin.mutation(api.invoices.issueCustomerBatch, {
      customerUserId: customerUser.appUserId,
      batchId: batch.batchId,
      depositRequirementMode: "percentage",
      depositRequirementValue: 2500,
    });
    expect(issued).toMatchObject({ invoiceId: draft.invoiceId, status: "issued", totalAmount: 375000 });
    await expect(
      admin.mutation(api.invoices.issueCustomerBatch, {
        customerUserId: customerUser.appUserId,
        batchId: batch.batchId,
        depositRequirementMode: "none",
      }),
    ).resolves.toMatchObject({ invoiceId: draft.invoiceId, status: "issued" });
    await expect(
      admin.mutation(api.invoices.create, { orderId: secondOrder.orderId, depositRequirementMode: "none" }),
    ).rejects.toThrow("INVOICE_ALREADY_EXISTS");
    expect(await admin.query(api.invoices.getForOrderAdmin, { orderId: secondOrder.orderId })).toMatchObject({
      invoiceId: draft.invoiceId,
      batchId: batch.batchId,
    });
    expect(
      (await t.run((ctx) => ctx.db.query("invoices").collect())).filter(
        (invoice) => invoice.customerUserId === customerUser.appUserId && invoice.status !== "void",
      ),
    ).toHaveLength(1);

    const secondCustomerInvoice = await admin.mutation(api.invoices.issueCustomerBatch, {
      customerUserId: secondCustomerUser.appUserId,
      batchId: batch.batchId,
      depositRequirementMode: "none",
    });
    expect(secondCustomerInvoice).toMatchObject({ status: "issued", totalAmount: 125000 });
    expect(secondCustomerInvoice.invoiceId).not.toBe(issued.invoiceId);
    expect(secondCustomerOrder.items).toHaveLength(1);

    const otherCatalog = await createOpenCatalog(admin, "Separate Invoice Catalog", "2353", "separate-invoice-code");
    const otherOrder = await admin.mutation(api.orders.createAssisted, {
      customerUserId: customerUser.appUserId,
      catalogId: otherCatalog.catalogId,
      submissionKey: "separate-invoice-order",
      items: [{ variantId: otherCatalog.variantIds[0], quantity: 1 }],
    });
    const otherBatch = await admin.mutation(api.batches.create, { name: "Invoice PO Magic Cat" });
    await admin.mutation(api.batches.linkCatalog, { batchId: otherBatch.batchId, catalogId: otherCatalog.catalogId });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: otherBatch.batchId, toStage: "po_closed" });
    const otherInvoice = await admin.mutation(api.invoices.issueCustomerBatch, {
      customerUserId: customerUser.appUserId,
      batchId: otherBatch.batchId,
      depositRequirementMode: "none",
    });
    expect(otherInvoice).toMatchObject({ status: "issued", batchId: otherBatch.batchId });
    expect(otherInvoice.invoiceId).not.toBe(issued.invoiceId);
    expect(
      await customer.query(api.invoices.listMine, { paginationOpts: { numItems: 10, cursor: null } }),
    ).toMatchObject({
      page: expect.arrayContaining([
        expect.objectContaining({ invoiceId: issued.invoiceId, batchId: batch.batchId }),
        expect.objectContaining({ invoiceId: otherInvoice.invoiceId, batchId: otherBatch.batchId }),
      ]),
    });
    expect(otherOrder.items).toHaveLength(1);
  });

  it("backfills legacy invoice references without changing invoice identity or money", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    const before = await t.run((ctx) => ctx.db.get(invoice.invoiceId));
    if (!before) throw new Error("invoice fixture missing");
    await t.run((ctx) =>
      ctx.db.patch(invoice.invoiceId, {
        invoiceNumber: "BFG-202608-M57DDNVBVGBFGNQQANT68X3B018CYTE5",
      }),
    );

    const preview = await admin.query(api.invoices.previewLegacyReferences, { limit: 10 });
    expect(preview.legacyCount).toBe(1);
    expect(preview.canonicalCount).toBe(0);
    expect(preview.collisions).toBe(0);

    const result = await admin.mutation(api.invoices.backfillLegacyReferences, { limit: 10 });
    expect(result.updated).toBe(1);
    const migrated = await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId });
    expect(migrated.invoiceNumber).toMatch(/^BFG-INV-\d{6}-[0-9A-Z]{4}$/);
    expect(migrated.invoiceId).toBe(invoice.invoiceId);
    expect(migrated.totalAmount).toBe(before.totalAmount);
    expect(migrated.status).toBe(before.status);

    const rerun = await admin.mutation(api.invoices.backfillLegacyReferences, { limit: 10 });
    expect(rerun.updated).toBe(0);
    expect((await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).invoiceNumber).toBe(
      migrated.invoiceNumber,
    );
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
    await expect(admin.mutation(api.invoices.voidInvoice, { invoiceId: issued.invoiceId })).rejects.toThrow(
      "INVOICE_VOID",
    );
  });

  it("denies cancellation while a payment confirmation is unresolved", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    const issued = await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    await customer.action(api.paymentConfirmations.submit, {
      invoiceId: issued.invoiceId,
      amount: 100000,
      paymentMethod: "Bank transfer",
      transferReference: "BFG-UAT-VOID-GUARD",
      paidAt: Date.now() - 86_400_000,
    });

    await expect(admin.mutation(api.invoices.voidInvoice, { invoiceId: issued.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: issued.invoiceId })).toMatchObject({
      status: "issued",
      paymentStatus: "payment_submitted",
    });
  });
});
