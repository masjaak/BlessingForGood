/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("owner UAT cleanup", () => {
  beforeEach(configureTestEnvironment);

  it("purges an active Catalog without requiring a draft lifecycle state", async () => {
    const t = testConvex();
    const { owner, admin } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Active UAT Catalog", "0090", "active-uat-code");

    await expect(owner.query(api.uatCleanup.getCatalogImpact, { catalogId: catalog.catalogId })).resolves.toMatchObject(
      {
        status: "open",
        safe: true,
      },
    );
    await expect(
      owner.mutation(api.uatCleanup.purgeCatalog, {
        catalogId: catalog.catalogId,
        confirmedUatCleanup: true,
        confirmationKeyword: "HAPUS KATALOG",
      }),
    ).resolves.toMatchObject({ removed: true });
    await expect(t.run(async (ctx) => ctx.db.get(catalog.catalogId))).resolves.toBeNull();
  });

  it("physically purges an archived Catalog while preserving its shared roots", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "UAT Catalog", "0091", "uat-catalog-code");
    const batch = await admin.mutation(api.batches.create, { name: "UAT Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "uat-catalog-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "UAT Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    await admin.mutation(api.secretCatalogs.archive, { catalogId: catalog.catalogId });

    const impact = await owner.query(api.uatCleanup.getCatalogImpact, { catalogId: catalog.catalogId });
    expect(impact).toMatchObject({
      entityType: "catalog",
      status: "archived",
      safe: true,
      delete: expect.arrayContaining([
        expect.objectContaining({ key: "catalogItems", count: 1 }),
        expect.objectContaining({ key: "catalogAccessGrants", count: 1 }),
      ]),
      detach: expect.arrayContaining([
        expect.objectContaining({ key: "orders", count: 1 }),
        expect.objectContaining({ key: "catalogBatchLinks", count: 1 }),
      ]),
    });

    await expect(
      admin.mutation(api.uatCleanup.purgeCatalog, {
        catalogId: catalog.catalogId,
        confirmedUatCleanup: true,
        confirmationKeyword: "HAPUS KATALOG",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      owner.mutation(api.uatCleanup.purgeCatalog, {
        catalogId: catalog.catalogId,
        confirmedUatCleanup: false,
        confirmationKeyword: "HAPUS KATALOG",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");

    await owner.mutation(api.uatCleanup.purgeCatalog, {
      catalogId: catalog.catalogId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS KATALOG",
    });

    const remaining = await t.run(async (ctx) => ({
      catalog: await ctx.db.get(catalog.catalogId),
      item: await ctx.db
        .query("catalogItems")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalog.catalogId))
        .first(),
      access: await ctx.db
        .query("catalogAccessGrants")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalog.catalogId))
        .first(),
      links: await ctx.db
        .query("catalogBatchLinks")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalog.catalogId))
        .first(),
      order: await ctx.db.get(order.orderId),
      batch: await ctx.db.get(batch.batchId),
      audit: await ctx.db
        .query("auditEvents")
        .withIndex("by_target", (index) => index.eq("targetType", "catalog").eq("targetId", catalog.catalogId))
        .collect(),
    }));
    expect(remaining.catalog).toBeNull();
    expect(remaining.item).toBeNull();
    expect(remaining.access).toBeNull();
    expect(remaining.links).toBeNull();
    expect(remaining.order?.catalogId).toBeUndefined();
    expect(remaining.batch).not.toBeNull();
    expect(remaining.audit).toEqual(expect.arrayContaining([expect.objectContaining({ action: "UAT_PURGE" })]));
  });

  it("purges an operational Batch and detaches the shared Catalog and Invoice", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "UAT Batch Catalog", "0092", "uat-batch-code");
    const batch = await admin.mutation(api.batches.create, { name: "UAT Operational Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "uat-batch-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "UAT Batch Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    const invoice = await admin.mutation(api.invoices.issueCustomerBatch, {
      customerUserId: customerUser.appUserId,
      batchId: batch.batchId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.batches.archive, { batchId: batch.batchId });

    const impact = await owner.query(api.uatCleanup.getBatchImpact, { batchId: batch.batchId });
    expect(impact).toMatchObject({
      entityType: "batch",
      status: "archived",
      safe: true,
      delete: expect.arrayContaining([
        expect.objectContaining({ key: "orderItemBatchAssignments", count: 1 }),
        expect.objectContaining({ key: "batchStatusHistory", count: 1 }),
      ]),
      detach: expect.arrayContaining([
        expect.objectContaining({ key: "catalogBatchLinks", count: 1 }),
        expect.objectContaining({ key: "invoices", count: 1 }),
      ]),
    });

    await owner.mutation(api.uatCleanup.purgeBatch, {
      batchId: batch.batchId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS BATCH",
    });

    const remaining = await t.run(async (ctx) => ({
      batch: await ctx.db.get(batch.batchId),
      catalog: await ctx.db.get(catalog.catalogId),
      order: await ctx.db.get(order.orderId),
      invoice: await ctx.db.get(invoice.invoiceId),
      assignments: await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", batch.batchId))
        .collect(),
      history: await ctx.db
        .query("batchStatusHistory")
        .withIndex("by_batch", (index) => index.eq("batchId", batch.batchId))
        .collect(),
      audit: await ctx.db
        .query("auditEvents")
        .withIndex("by_target", (index) => index.eq("targetType", "batch").eq("targetId", batch.batchId))
        .collect(),
    }));
    expect(remaining.batch).toBeNull();
    expect(remaining.catalog).not.toBeNull();
    expect(remaining.order).not.toBeNull();
    expect(remaining.invoice?.batchId).toBeUndefined();
    expect(remaining.assignments).toEqual([]);
    expect(remaining.history).toEqual([]);
    expect(remaining.audit).toEqual(expect.arrayContaining([expect.objectContaining({ action: "UAT_PURGE" })]));
  });

  it("purges the real unissued candidate Order while preserving shared Customer, Book, and Batch roots", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "UAT Candidate Catalog", "0097", "uat-candidate-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "uat-candidate-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "UAT Candidate Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("candidate customer fixture missing");
    const batch = await admin.mutation(api.batches.create, { name: "UAT Candidate Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });

    const ready = await admin.query(api.invoices.listReadyForIssuance, {
      paginationOpts: { numItems: 25, cursor: null },
      customerUserId: customerUser.appUserId,
      batchId: batch.batchId,
    });
    expect(ready.page).toEqual([
      expect.objectContaining({
        customerUserId: customerUser.appUserId,
        batchId: batch.batchId,
        bookCount: 2,
        totalAmount: 250000,
        invoiceId: null,
      }),
    ]);

    await expect(
      admin.query(api.uatCleanup.getOrderCandidateImpact, {
        customerUserId: customerUser.appUserId,
        batchId: batch.batchId,
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    const impact = await owner.query(api.uatCleanup.getOrderCandidateImpact, {
      customerUserId: customerUser.appUserId,
      batchId: batch.batchId,
    });
    expect(impact).toMatchObject({
      entityType: "order",
      entityName: "UAT Candidate Customer · UAT Candidate Batch",
      reference: order.orderCode,
      safe: true,
      delete: expect.arrayContaining([
        expect.objectContaining({ key: "candidate", count: 1, amount: 250000 }),
        expect.objectContaining({ key: "orders", count: 1 }),
        expect.objectContaining({ key: "orderItems", count: 1 }),
        expect.objectContaining({ key: "orderItemBatchAssignments", count: 1 }),
      ]),
      preserve: expect.arrayContaining([
        expect.objectContaining({ key: "customers", count: 1 }),
        expect.objectContaining({ key: "books", count: 1 }),
        expect.objectContaining({ key: "batches", count: 1 }),
      ]),
    });
    await expect(
      owner.mutation(api.uatCleanup.purgeOrderCandidate, {
        customerUserId: customerUser.appUserId,
        batchId: batch.batchId,
        confirmedUatCleanup: false,
        confirmationKeyword: "HAPUS PESANAN",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");

    await owner.mutation(api.uatCleanup.purgeOrderCandidate, {
      customerUserId: customerUser.appUserId,
      batchId: batch.batchId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS PESANAN",
    });

    const remaining = await t.run(async (ctx) => {
      const variant = await ctx.db.get(catalog.variantIds[0]);
      return {
        order: await ctx.db.get(order.orderId),
        customer: await ctx.db.get(customerUser.appUserId),
        catalog: await ctx.db.get(catalog.catalogId),
        batch: await ctx.db.get(batch.batchId),
        book: variant ? await ctx.db.get(variant.bookId) : null,
        items: await ctx.db
          .query("orderItems")
          .withIndex("by_order", (index) => index.eq("orderId", order.orderId))
          .collect(),
        assignments: await ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_batch", (index) => index.eq("batchId", batch.batchId))
          .collect(),
        orderHistory: await ctx.db
          .query("orderStatusHistory")
          .withIndex("by_order", (index) => index.eq("orderId", order.orderId))
          .collect(),
        notifications: await ctx.db
          .query("notifications")
          .withIndex("by_related_entity", (index) =>
            index.eq("relatedEntityType", "order").eq("relatedEntityId", String(order.orderId)),
          )
          .collect(),
        orderAudits: await ctx.db
          .query("auditEvents")
          .withIndex("by_target", (index) => index.eq("targetType", "order").eq("targetId", String(order.orderId)))
          .collect(),
        candidateAudit: await ctx.db
          .query("auditEvents")
          .withIndex("by_target", (index) =>
            index.eq("targetType", "order_candidate").eq("targetId", `${customerUser.appUserId}:${batch.batchId}`),
          )
          .collect(),
        invoices: await ctx.db.query("invoices").collect(),
      };
    });
    expect(remaining.order).toBeNull();
    expect(remaining.items).toEqual([]);
    expect(remaining.assignments).toEqual([]);
    expect(remaining.orderHistory).toEqual([]);
    expect(remaining.notifications).toEqual([]);
    expect(remaining.orderAudits).toEqual([]);
    expect(remaining.candidateAudit).toEqual([expect.objectContaining({ action: "UAT_PURGE" })]);
    expect(remaining.customer).not.toBeNull();
    expect(remaining.catalog).not.toBeNull();
    expect(remaining.batch).not.toBeNull();
    expect(remaining.book).not.toBeNull();
    expect(remaining.invoices).toEqual([]);
    await expect(
      admin.query(api.invoices.listReadyForIssuance, {
        paginationOpts: { numItems: 25, cursor: null },
        customerUserId: customerUser.appUserId,
        batchId: batch.batchId,
      }),
    ).resolves.toMatchObject({ page: [] });
  });

  it("detaches a shared Order candidate without deleting the Order or its other Batch assignment", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Shared Candidate Catalog", "0098", "shared-candidate-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "shared-candidate-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Shared Candidate Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2 }],
    });
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("shared candidate customer fixture missing");
    const candidateBatch = await admin.mutation(api.batches.create, { name: "Shared Candidate Batch" });
    const otherBatch = await admin.mutation(api.batches.create, { name: "Other Shared Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: candidateBatch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: otherBatch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: candidateBatch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: otherBatch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.updateShipmentStage, {
      batchId: candidateBatch.batchId,
      toStage: "po_closed",
    });

    const impact = await owner.query(api.uatCleanup.getOrderCandidateImpact, {
      customerUserId: customerUser.appUserId,
      batchId: candidateBatch.batchId,
    });
    expect(impact).toMatchObject({
      safe: true,
      delete: expect.arrayContaining([expect.objectContaining({ key: "orders", count: 0 })]),
      detach: [expect.objectContaining({ key: "orderItemBatchAssignments", count: 1 })],
      preserve: expect.arrayContaining([
        expect.objectContaining({ key: "orders", count: 1 }),
        expect.objectContaining({ key: "orderItems", count: 1 }),
      ]),
    });

    await owner.mutation(api.uatCleanup.purgeOrderCandidate, {
      customerUserId: customerUser.appUserId,
      batchId: candidateBatch.batchId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS PESANAN",
    });

    const remaining = await t.run(async (ctx) => ({
      order: await ctx.db.get(order.orderId),
      item: await ctx.db.get(order.items[0]._id),
      candidateAssignments: await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", candidateBatch.batchId))
        .collect(),
      otherAssignments: await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (index) => index.eq("batchId", otherBatch.batchId))
        .collect(),
      candidateBatch: await ctx.db.get(candidateBatch.batchId),
      otherBatch: await ctx.db.get(otherBatch.batchId),
    }));
    expect(remaining.order).not.toBeNull();
    expect(remaining.item).not.toBeNull();
    expect(remaining.candidateAssignments).toEqual([]);
    expect(remaining.otherAssignments).toMatchObject([
      { orderItemId: order.items[0]._id, batchId: otherBatch.batchId, assignedQuantity: 1 },
    ]);
    expect(remaining.candidateBatch).not.toBeNull();
    expect(remaining.otherBatch).not.toBeNull();
  });

  it("purges Invoice-owned payment, deposit, and refund consequences while preserving roots", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "UAT Invoice Catalog", "0093", "uat-invoice-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "uat-invoice-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "UAT Invoice Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const customerUser = await customer.query(api.users.current, {});
    const adminUser = await admin.query(api.users.current, {});
    if (!customerUser || !adminUser) throw new Error("invoice fixture users missing");
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    const payment = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 50000,
      paymentMethod: "Bank transfer",
      transferReference: "UAT-INVOICE-PAYMENT",
      paidAt: Date.now() - 1_000,
    });
    await admin.mutation(api.paymentConfirmations.startReview, { confirmationId: payment.confirmationId });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: payment.confirmationId });
    await admin.mutation(api.depositTransactions.recordCredit, {
      invoiceId: invoice.invoiceId,
      amount: 50000,
      note: "UAT invoice credit",
    });
    await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 25000,
    });
    const account = await admin.query(api.depositAccounts.getForInvoice, { invoiceId: invoice.invoiceId });
    if (!account.account) throw new Error("deposit account fixture missing");
    const obligationId = await t.run(async (ctx) =>
      ctx.db.insert("refundObligations", {
        customerUserId: customerUser.appUserId,
        orderId: order.orderId,
        invoiceId: invoice.invoiceId,
        depositAccountId: account.account!.accountId,
        reason: "deposit_refund",
        amount: 10000,
        paidAmount: 0,
        reservedAmount: 0,
        status: "pending",
        note: "UAT invoice refund",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByUserId: adminUser.appUserId,
      }),
    );
    const payout = await admin.mutation(api.refunds.createPayout, {
      obligationId,
      amount: 10000,
      paymentMethod: "UAT transfer",
    });
    const payoutId = payout.payouts[0]?.payoutId;
    if (!payoutId) throw new Error("refund payout fixture missing");
    await admin.mutation(api.refunds.startPayout, { payoutId, paymentMethod: "UAT transfer" });
    await admin.mutation(api.refunds.recordPayout, { payoutId, status: "paid", paymentMethod: "UAT transfer" });

    const impact = await owner.query(api.uatCleanup.getInvoiceImpact, { invoiceId: invoice.invoiceId });
    expect(impact).toMatchObject({
      entityType: "invoice",
      safe: true,
      delete: expect.arrayContaining([
        expect.objectContaining({ key: "invoiceItems", count: 1 }),
        expect.objectContaining({ key: "paymentConfirmations", count: 1 }),
        expect.objectContaining({ key: "invoiceDepositAllocations", count: 1 }),
        expect.objectContaining({ key: "refundObligations", count: 1 }),
      ]),
    });

    await owner.mutation(api.uatCleanup.purgeInvoice, {
      invoiceId: invoice.invoiceId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS INVOICE",
    });

    const remaining = await t.run(async (ctx) => ({
      invoice: await ctx.db.get(invoice.invoiceId),
      order: await ctx.db.get(order.orderId),
      customer: await ctx.db.get(customerUser.appUserId),
      items: await ctx.db
        .query("invoiceItems")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      payments: await ctx.db
        .query("paymentConfirmations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      allocations: await ctx.db
        .query("invoiceDepositAllocations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      obligations: await ctx.db
        .query("refundObligations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      transactions: await ctx.db
        .query("depositTransactions")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      account: await ctx.db.get(account.account!.accountId),
      audit: await ctx.db
        .query("auditEvents")
        .withIndex("by_target", (index) => index.eq("targetType", "invoice").eq("targetId", invoice.invoiceId))
        .collect(),
    }));
    expect(remaining.invoice).toBeNull();
    expect(remaining.order).not.toBeNull();
    expect(remaining.customer).not.toBeNull();
    expect(remaining.items).toEqual([]);
    expect(remaining.payments).toEqual([]);
    expect(remaining.allocations).toEqual([]);
    expect(remaining.obligations).toEqual([]);
    expect(remaining.transactions).toEqual([]);
    expect(remaining.account).toMatchObject({ availableAmount: 0, reservedAmount: 0 });
    expect(remaining.audit).toEqual(expect.arrayContaining([expect.objectContaining({ action: "UAT_PURGE" })]));
  });

  it("purges InvoiceItems-only data without deleting the shared Order or Customer", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Invoice Items UAT Catalog", "0094", "invoice-items-uat-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "invoice-items-uat-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Invoice Items UAT Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });

    await owner.mutation(api.uatCleanup.purgeInvoice, {
      invoiceId: invoice.invoiceId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS INVOICE",
    });

    await expect(t.run(async (ctx) => ctx.db.get(invoice.invoiceId))).resolves.toBeNull();
    await expect(t.run(async (ctx) => ctx.db.get(order.orderId))).resolves.not.toBeNull();
    await expect(
      t.run(async (ctx) =>
        ctx.db
          .query("invoiceItems")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
          .collect(),
      ),
    ).resolves.toEqual([]);
  });

  it("purges a legacy Invoice when its Customer root is already absent", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Legacy Invoice UAT Catalog", "0096", "legacy-invoice-uat-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "legacy-invoice-uat-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Legacy UAT Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    const payment = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 99000,
      paymentMethod: "Bank transfer",
      transferReference: "LEGACY-UAT-PAYMENT",
      paidAt: Date.now() - 1_000,
    });
    const customerUser = await customer.query(api.users.current, {});
    const adminUser = await admin.query(api.users.current, {});
    if (!customerUser || !adminUser) throw new Error("legacy invoice fixture users missing");
    const accountId = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("depositAccounts", {
        userId: customerUser.appUserId,
        currency: "IDR",
        availableAmount: 0,
        reservedAmount: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("notifications", {
        recipientUserId: adminUser.appUserId,
        surface: "notification",
        eventType: "legacy.invoice",
        title: "Legacy Invoice",
        body: "Legacy UAT invoice",
        destination: "/admin/invoices",
        relatedEntityType: "invoice",
        relatedEntityId: String(invoice.invoiceId),
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        recipientUserId: adminUser.appUserId,
        surface: "notification",
        eventType: "legacy.payment",
        title: "Legacy Payment",
        body: "Legacy UAT payment",
        destination: "/admin/payments",
        relatedEntityType: "paymentConfirmation",
        relatedEntityId: String(payment.confirmationId),
        createdAt: now,
      });
      await ctx.db.delete(customerUser.appUserId);
    });

    const impact = await owner.query(api.uatCleanup.getInvoiceImpact, { invoiceId: invoice.invoiceId });
    expect(impact).toMatchObject({
      safe: true,
      blocker: null,
      preserve: expect.arrayContaining([
        expect.objectContaining({ key: "orders", count: 1 }),
        expect.objectContaining({ key: "customers", count: 0 }),
        expect.objectContaining({ key: "depositAccounts", count: 1 }),
      ]),
    });

    await owner.mutation(api.uatCleanup.purgeInvoice, {
      invoiceId: invoice.invoiceId,
      confirmedUatCleanup: true,
      confirmationKeyword: "HAPUS INVOICE",
    });

    const remaining = await t.run(async (ctx) => ({
      invoice: await ctx.db.get(invoice.invoiceId),
      customer: await ctx.db.get(customerUser.appUserId),
      account: await ctx.db.get(accountId),
      order: await ctx.db.get(order.orderId),
      items: await ctx.db
        .query("invoiceItems")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      payments: await ctx.db
        .query("paymentConfirmations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
        .collect(),
      invoiceNotifications: await ctx.db
        .query("notifications")
        .withIndex("by_related_entity", (index) =>
          index.eq("relatedEntityType", "invoice").eq("relatedEntityId", invoice.invoiceId),
        )
        .collect(),
      paymentNotifications: await ctx.db
        .query("notifications")
        .withIndex("by_related_entity", (index) =>
          index.eq("relatedEntityType", "paymentConfirmation").eq("relatedEntityId", String(payment.confirmationId)),
        )
        .collect(),
      audit: await ctx.db
        .query("auditEvents")
        .withIndex("by_target", (index) => index.eq("targetType", "invoice").eq("targetId", invoice.invoiceId))
        .collect(),
    }));
    expect(remaining.invoice).toBeNull();
    expect(remaining.customer).toBeNull();
    expect(remaining.account).toMatchObject({ userId: customerUser.appUserId, availableAmount: 0, reservedAmount: 0 });
    expect(remaining.order).not.toBeNull();
    expect(remaining.items).toEqual([]);
    expect(remaining.payments).toEqual([]);
    expect(remaining.invoiceNotifications).toEqual([]);
    expect(remaining.paymentNotifications).toEqual([]);
    expect(remaining.audit).toEqual([expect.objectContaining({ action: "UAT_PURGE" })]);
  });

  it("aborts atomically when an Invoice has an unsupported financial adjustment", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Unsafe UAT Catalog", "0095", "unsafe-uat-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "unsafe-uat-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Unsafe UAT Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    await t.run(async (ctx) => {
      const adminUser = await ctx.db
        .query("appUsers")
        .withIndex("by_clerk_user_id", (index) => index.eq("clerkUserId", "phase041-admin-test"))
        .unique();
      if (!adminUser) throw new Error("admin fixture missing");
      const orderItem = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (index) => index.eq("orderId", order.orderId))
        .first();
      if (!orderItem) throw new Error("order item fixture missing");
      const exceptionId = await ctx.db.insert("orderExceptions", {
        orderId: order.orderId,
        orderItemId: orderItem._id,
        customerUserId: invoice.customerUserId,
        type: "admin_cancellation",
        status: "resolved",
        reason: "unsupported UAT adjustment fixture",
        affectedQuantity: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByUserId: adminUser._id,
      });
      await ctx.db.insert("orderExceptionFinancialAdjustments", {
        exceptionId,
        orderId: order.orderId,
        orderItemId: orderItem._id,
        customerUserId: invoice.customerUserId,
        invoiceId: invoice.invoiceId,
        affectedQuantity: 1,
        originalItemValueAmount: 125000,
        invoiceAdjustmentAmount: 1000,
        depositAmountBefore: 0,
        depositReleaseAmount: 0,
        depositAmountAfter: 0,
        externalPaymentAmount: 0,
        refundObligationAmount: 0,
        refundObligationStatus: "none",
        createdAt: Date.now(),
        createdByUserId: adminUser._id,
      });
    });

    const impact = await owner.query(api.uatCleanup.getInvoiceImpact, { invoiceId: invoice.invoiceId });
    expect(impact).toMatchObject({ safe: false });
    await expect(
      owner.mutation(api.uatCleanup.purgeInvoice, {
        invoiceId: invoice.invoiceId,
        confirmedUatCleanup: true,
        confirmationKeyword: "HAPUS INVOICE",
      }),
    ).rejects.toThrow("UAT_PURGE_UNSAFE_RELATION");
    await expect(t.run(async (ctx) => ctx.db.get(invoice.invoiceId))).resolves.not.toBeNull();
  });
});
