/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createOrder(
  t: ReturnType<typeof testConvex>,
  quantity = 1,
  catalogName = "Exception Catalog",
  suffix = `${quantity}401`,
) {
  const users = await setupUsers(t);
  const accessCode = `exception-code-${suffix}`;
  const catalog = await createOpenCatalog(users.admin, catalogName, suffix, accessCode);
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: catalog.catalogId,
    customerName: "Exception Customer",
    items: [{ variantId: catalog.variantIds[0], quantity, expectedUnitPriceAmount: 125000 }],
  });
  return { ...users, catalog, order };
}

async function issuedInvoice(t: ReturnType<typeof testConvex>, orderId: string) {
  const admin = await t.withIdentity({ subject: "phase041-admin-test", tokenIdentifier: "clerk|phase041-admin-test" });
  const invoice = await admin.mutation(api.invoices.create, {
    orderId: orderId as never,
    depositRequirementMode: "none",
  });
  return admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
}

function paymentInput(amount: number) {
  return {
    amount,
    paymentMethod: "Bank transfer",
    transferReference: "EXCEPTION-TEST-001",
    paidAt: Date.now() - 86_400_000,
  };
}

describe("BFG order exception workflow", () => {
  beforeEach(configureTestEnvironment);

  it("starts with zero data and protects cancellation ownership and duplicates", async () => {
    const t = testConvex();
    const { customer, secondCustomer, admin } = await setupUsers(t);
    expect((await admin.query(api.orderExceptions.listForAdmin, {})).page).toEqual([]);
    expect(
      (await customer.query(api.orderExceptions.listMine, { paginationOpts: { numItems: 10, cursor: null } })).page,
    ).toEqual([]);

    const { catalog, order } = await createOrder(t, 3);
    const item = order.items[0];
    expect(await customer.query(api.orderExceptions.getCancellationEligibility, { orderItemId: item._id })).toEqual({
      decision: "eligible",
      reasonCode: null,
    });
    await expect(
      customer.mutation(api.orderExceptions.requestCancellation, {
        orderItemId: item._id,
        affectedQuantity: 1,
        reason: "Please cancel one copy.",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      customer.mutation(api.orderExceptions.cancelItem, {
        orderItemId: item._id,
        affectedQuantity: 1,
        reason: "Customer cannot use the Admin cancellation action.",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    const exception = await admin.mutation(api.orderExceptions.open, {
      orderItemId: item._id,
      type: "admin_cancellation",
      affectedQuantity: 1,
      reason: "Please cancel one copy.",
    });
    expect(exception).toMatchObject({ type: "admin_cancellation", status: "opened", affectedQuantity: 1 });
    await expect(
      admin.mutation(api.orderExceptions.open, {
        orderItemId: item._id,
        type: "admin_cancellation",
        affectedQuantity: 1,
        reason: "Again",
      }),
    ).rejects.toThrow("EXCEPTION_ACTIVE_EXISTS");
    await expect(
      secondCustomer.query(api.orderExceptions.getMine, { exceptionId: exception.exceptionId }),
    ).rejects.toThrow("EXCEPTION_ACCESS_DENIED");
    await expect(
      secondCustomer.mutation(api.orderExceptions.requestCancellation, { orderItemId: item._id, reason: "Not mine" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    expect(catalog.catalogId).toBe(order.catalogId);
  });

  it("cancels a simple item from the Admin Order flow without deleting history", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    const result = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Publisher tidak dapat menyediakan format ini.",
      customerNote: "Kami akan menghubungi Anda terkait pilihan berikutnya.",
    });

    expect(result).toMatchObject({
      outcome: "resolved",
      exception: { type: "admin_cancellation", status: "resolved", affectedQuantity: 1 },
    });
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).status).toBe("cancelled");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items).toHaveLength(0);
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).totalAmount).toBe(0);
    expect(await t.run((ctx) => ctx.db.get(order.items[0]._id))).toBeTruthy();
    expect((await customer.query(api.orders.getMine, { orderId: order.orderId })).orderId).toBe(order.orderId);
  });

  it("keeps unrelated multi-item quantities operational", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const secondItemId = await t.run(async (ctx) => {
      const original = await ctx.db.get(order.items[0]._id);
      if (!original) throw new Error("order item fixture missing");
      return ctx.db.insert("orderItems", {
        orderId: order.orderId,
        catalogItemId: original.catalogItemId,
        bookId: original.bookId,
        bookVariantId: original.bookVariantId,
        bookTitleSnapshot: original.bookTitleSnapshot,
        publisherNameSnapshot: original.publisherNameSnapshot,
        formatSnapshot: original.formatSnapshot,
        isbnSnapshot: original.isbnSnapshot,
        unitPriceAmountSnapshot: original.unitPriceAmountSnapshot,
        currencySnapshot: original.currencySnapshot,
        quantity: original.quantity,
        subtotalAmount: original.subtotalAmount,
        createdAt: Date.now(),
      });
    });
    const result = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Customer memilih untuk tidak melanjutkan item ini.",
    });

    expect(result.outcome).toBe("resolved");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).status).toBe("submitted");
    expect(
      (await admin.query(api.orderExceptions.listForOrderAdmin, { orderId: order.orderId })).map(
        (exception) => exception.orderItemId,
      ),
    ).toContain(order.items[0]._id);
    expect(
      (await admin.query(api.orderExceptions.listForOrderAdmin, { orderId: order.orderId })).map(
        (exception) => exception.orderItemId,
      ),
    ).not.toContain(secondItemId);
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items).toHaveLength(1);
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).totalAmount).toBe(125000);
    await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: secondItemId,
      affectedQuantity: 1,
      reason: "Customer memilih untuk membatalkan seluruh pesanan.",
    });
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).status).toBe("cancelled");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items).toEqual([]);
  });

  it("projects a full quantity cancellation without deleting the historical item", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t, 3);
    const result = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 3,
      reason: "Seluruh jumlah item dibatalkan.",
    });

    expect(result.outcome).toBe("resolved");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).status).toBe("cancelled");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items).toEqual([]);
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).totalAmount).toBe(0);
    expect(
      await customer.query(api.orderExceptions.getCancellationEligibility, { orderItemId: order.items[0]._id }),
    ).toMatchObject({ decision: "not_eligible", reasonCode: "ALREADY_CANCELLED" });
  });

  it("projects a partial admin cancellation from quantity three as two active copies", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t, 3);
    const result = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Satu eksemplar dibatalkan.",
    });

    expect(result.outcome).toBe("resolved");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).status).toBe("submitted");
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items[0]).toMatchObject({
      quantity: 2,
      subtotalAmount: 250000,
    });
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).totalAmount).toBe(250000);
    expect((await t.run((ctx) => ctx.db.get(order.items[0]._id)))?.quantity).toBe(3);
  });

  it("requires editable Batch reconciliation before resolving an affected assignment", async () => {
    const t = testConvex();
    const { admin, order, catalog } = await createOrder(t, 3);
    const batch = await admin.mutation(api.batches.create, { name: "Cancellation Reconciliation Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 3,
    });

    const request = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Publisher tidak dapat memenuhi satu eksemplar.",
    });
    expect(request).toMatchObject({ outcome: "review_required", reasonCode: "BATCH_RECONCILIATION_REQUIRED" });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exception.exceptionId,
      resolution: "remove_item",
    });
    await expect(
      admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exception.exceptionId }),
    ).rejects.toThrow("BATCH_RECONCILIATION_REQUIRED");

    await admin.mutation(api.batchTracking.unassignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
    });
    await expect(
      admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exception.exceptionId }),
    ).resolves.toMatchObject({ status: "resolved" });
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).status).toBe("submitted");
  });

  it("routes an issued Invoice cancellation into review", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    await issuedInvoice(t, order.orderId);
    const request = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Format yang diminta sudah tidak tersedia.",
    });

    expect(request).toMatchObject({ outcome: "review_required", reasonCode: "INVOICE_RECONCILIATION_REQUIRED" });
    expect(request.exception.status).toBe("opened");
  });

  it("handles partial OOS without deleting the original item or assigning blocked quantity", async () => {
    const t = testConvex();
    const { admin, customer, order, catalog } = await createOrder(t, 3);
    const invoice = await issuedInvoice(t, order.orderId);
    const batch = await admin.mutation(api.batches.create, { name: "Exception Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    const exception = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "out_of_stock",
      affectedQuantity: 1,
      reason: "Supplier could not complete one copy.",
      customerNote: "One copy is unavailable.",
    });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 2,
    });
    await expect(
      admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: order.items[0]._id,
        batchId: batch.batchId,
        assignedQuantity: 3,
      }),
    ).rejects.toThrow("BATCH_ASSIGNMENT_EXCEEDS_QUANTITY");
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: exception.exceptionId,
      resolution: "remove_item",
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: exception.exceptionId });
    expect(resolved).toMatchObject({ status: "resolved", financialImpact: { invoiceAdjustmentAmount: -125000 } });
    expect((await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).adjustedTotalAmount).toBe(
      250000,
    );
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items[0].quantity).toBe(2);
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).totalAmount).toBe(250000);
    expect((await t.run((ctx) => ctx.db.get(order.items[0]._id)))?.quantity).toBe(3);
    expect(
      (await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignments[0].assignedQuantity,
    ).toBe(2);
    expect(
      (await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignments[0].orderedQuantity,
    ).toBe(2);
    expect(
      (await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).purchaseSummary[0].quantity,
    ).toBe(2);
    expect(
      (await customer.query(api.batchTracking.getMine, { orderId: order.orderId })).batches[0].assignments[0].quantity,
    ).toBe(2);
    const overview = await customer.query(api.batchTracking.getBookOverview, { startAt: 0, endAt: Date.now() + 1000 });
    expect(overview.totalSpending).toBe(250000);
    expect(overview.batches).toHaveLength(1);
    expect(overview.batches[0]).toMatchObject({ bookCount: 2, totalAmount: 250000 });
    expect(
      await customer.query(api.orderExceptions.getCancellationEligibility, {
        orderItemId: order.items[0]._id,
      }),
    ).toEqual({ decision: "eligible", reasonCode: null });
  });

  it("projects a pending full cancellation as inactive while preserving reconciliation state", async () => {
    const t = testConvex();
    const { admin, customer, order, catalog } = await createOrder(t);
    const batch = await admin.mutation(api.batches.create, { name: "Pending Cancellation Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    const request = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Pending Batch reconciliation.",
    });
    expect(request).toMatchObject({ outcome: "review_required", reasonCode: "BATCH_RECONCILIATION_REQUIRED" });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exception.exceptionId,
      resolution: "remove_item",
    });

    const projectedOrder = await admin.query(api.orders.getForAdmin, { orderId: order.orderId });
    expect(projectedOrder).toMatchObject({
      status: "submitted",
      cancellationPending: true,
      subtotalAmount: 0,
      totalAmount: 0,
      items: [],
    });
    expect(await customer.query(api.orders.getMine, { orderId: order.orderId })).toMatchObject({
      status: "submitted",
      cancellationPending: true,
      totalAmount: 0,
      items: [],
    });
    expect((await admin.query(api.batchTracking.getForOrderAdmin, { orderId: order.orderId })).items).toEqual([]);
    expect((await customer.query(api.batchTracking.getMine, { orderId: order.orderId })).batches).toEqual([]);
    expect((await customer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId }))?.items).toEqual([]);
    expect(
      await customer.query(api.batchTracking.getBookOverview, { startAt: 0, endAt: Date.now() + 1000 }),
    ).toMatchObject({ totalSpending: 0, batches: [] });

    const batchView = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(batchView).toMatchObject({ assignmentCount: 0, assignedQuantity: 0, customerCount: 0 });
    expect(batchView.assignments[0]).toMatchObject({
      assignedQuantity: 0,
      orderedQuantity: 0,
      assignmentState: "needs_reconciliation",
    });
    expect(batchView.customerRoster).toEqual([]);
    expect(batchView.purchaseSummary).toEqual([]);
  });

  it("applies a pre-invoice adjustment without rewriting the adjustment history", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const exception = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "out_of_stock",
      affectedQuantity: 1,
      reason: "Unavailable before invoice creation.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: exception.exceptionId,
      resolution: "remove_item",
    });
    await admin.mutation(api.orderExceptions.resolve, { exceptionId: exception.exceptionId });
    const invoice = await issuedInvoice(t, order.orderId);
    expect(invoice).toMatchObject({ totalAmount: 125000, adjustedTotalAmount: 0, financialAdjustmentAmount: -125000 });
    const adjustment = await t.run(async (ctx) =>
      ctx.db
        .query("orderExceptionFinancialAdjustments")
        .withIndex("by_exception", (index) => index.eq("exceptionId", exception.exceptionId))
        .unique(),
    );
    expect(adjustment?.invoiceId).toBeUndefined();
  });

  it("enforces review and resolution transitions for defects and admin cancellation", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    const defect = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "defect",
      affectedQuantity: 1,
      reason: "Arrival defect reported.",
    });
    await expect(
      customer.mutation(api.orderExceptions.startReview, { exceptionId: defect.exceptionId }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(admin.mutation(api.orderExceptions.resolve, { exceptionId: defect.exceptionId })).rejects.toThrow(
      "EXCEPTION_RESOLUTION_REQUIRED",
    );
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: defect.exceptionId });
    await expect(
      admin.mutation(api.orderExceptions.selectResolution, {
        exceptionId: defect.exceptionId,
        resolution: "remove_item",
      }),
    ).resolves.toMatchObject({ status: "resolution_selected" });
    await expect(
      admin.mutation(api.orderExceptions.selectResolution, {
        exceptionId: defect.exceptionId,
        resolution: "no_action",
      }),
    ).rejects.toThrow("EXCEPTION_INVALID_STATE");
    await admin.mutation(api.orderExceptions.resolve, { exceptionId: defect.exceptionId });
    await expect(admin.mutation(api.orderExceptions.resolve, { exceptionId: defect.exceptionId })).rejects.toThrow(
      "EXCEPTION_RESOLUTION_REQUIRED",
    );

    const next = await createOrder(t, 1, "Exception Catalog Next", "1402");
    const cancellation = await admin.mutation(api.orderExceptions.open, {
      orderItemId: next.order.items[0]._id,
      type: "admin_cancellation",
      affectedQuantity: 1,
      reason: "Duplicate operational order.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: cancellation.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: cancellation.exceptionId,
      resolution: "remove_item",
    });
    await admin.mutation(api.orderExceptions.resolve, { exceptionId: cancellation.exceptionId });
    expect((await admin.query(api.orders.getForAdmin, { orderId: next.order.orderId })).status).toBe("cancelled");
    await expect(
      admin.mutation(api.orders.updateStatus, { orderId: next.order.orderId, status: "cancelled" }),
    ).rejects.toThrow("CANCELLATION_REQUIRES_EXCEPTION");
  });

  it("requires admin review after payment and preserves the approved payment while recording refund obligation", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    const invoice = await issuedInvoice(t, order.orderId);
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(125000),
    });
    await admin.mutation(api.paymentConfirmations.startReview, { confirmationId: confirmation.confirmationId });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId });
    expect(
      await customer.query(api.orderExceptions.getCancellationEligibility, { orderItemId: order.items[0]._id }),
    ).toEqual({
      decision: "requires_admin_review",
      reasonCode: "PAYMENT_RECONCILIATION_REQUIRED",
    });
    const request = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "admin_cancellation",
      affectedQuantity: 1,
      reason: "The customer no longer needs the item.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exceptionId,
      resolution: "remove_item",
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exceptionId });
    expect(resolved.financialImpact).toMatchObject({
      originalItemValueAmount: 125000,
      externalPaymentAmount: 125000,
      refundObligationAmount: 125000,
      refundObligationStatus: "refund_due",
    });
    expect(
      await admin.query(api.paymentConfirmations.getForAdmin, { confirmationId: confirmation.confirmationId }),
    ).toMatchObject({
      status: "approved",
      amount: 125000,
    });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      totalAmount: 125000,
      adjustedTotalAmount: 0,
      verifiedPaymentAmount: 125000,
      outstandingAmount: 0,
      refundObligationAmount: 125000,
      refundObligationStatus: "refund_due",
    });
    expect(await customer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).toMatchObject({
      invoiceId: invoice.invoiceId,
      adjustedTotalAmount: 0,
      refundObligationAmount: 125000,
      refundObligationStatus: "refund_due",
    });
    expect(await customer.query(api.orderExceptions.listMineForOrder, { orderId: order.orderId })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "admin_cancellation",
          status: "resolved",
          financialImpact: expect.objectContaining({ refundObligationStatus: "refund_due" }),
        }),
      ]),
    );
  });

  it("releases active deposit allocations once, restores availability, and does not execute a payout", async () => {
    const t = testConvex();
    const { admin, customer, order } = await createOrder(t);
    const invoice = await issuedInvoice(t, order.orderId);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 80000 });
    const allocation = await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(45000),
    });
    await admin.mutation(api.paymentConfirmations.startReview, { confirmationId: confirmation.confirmationId });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId });
    const exception = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "out_of_stock",
      affectedQuantity: 1,
      reason: "Supplier failure.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: exception.exceptionId,
      resolution: "deposit_release",
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: exception.exceptionId });
    expect(resolved.financialImpact).toMatchObject({ depositReleaseAmount: 80000, depositAmountAfter: 0 });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({
      availableAmount: 80000,
      reservedAmount: 0,
    });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      allocatedDepositAmount: 0,
      verifiedPaymentAmount: 45000,
      refundObligationAmount: 45000,
      refundObligationStatus: "refund_due",
    });
    await expect(
      admin.mutation(api.invoiceDepositAllocations.release, { allocationId: allocation.allocationId }),
    ).rejects.toThrow("DEPOSIT_ALLOCATION_INVALID");
  });

  it("keeps batch lock history while routing locked cancellation through review", async () => {
    const t = testConvex();
    const { admin, customer, order, catalog } = await createOrder(t);
    const batch = await admin.mutation(api.batches.create, { name: "Locked Exception Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    expect(
      await customer.query(api.orderExceptions.getCancellationEligibility, { orderItemId: order.items[0]._id }),
    ).toEqual({
      decision: "requires_admin_review",
      reasonCode: "BATCH_LOCKED",
    });
    const request = await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: order.items[0]._id,
      affectedQuantity: 1,
      reason: "Please review this cancellation after PO lock.",
    });
    expect(request).toMatchObject({ outcome: "review_required", reasonCode: "BATCH_LOCKED" });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exception.exceptionId,
      resolution: "remove_item",
    });
    await admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exception.exceptionId });
    expect((await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignments).toHaveLength(1);
  });

  it("denies suspended customers and admins at the protected mutation/query boundary", async () => {
    const t = testConvex();
    const { owner, admin, customer, order } = await createOrder(t);
    const adminUser = await admin.mutation(api.users.ensureCurrentUser, {});
    await owner.mutation(api.users.suspend, {
      userId: (await customer.mutation(api.users.ensureCurrentUser, {})).appUserId,
    });
    await expect(
      customer.query(api.orderExceptions.listMine, { paginationOpts: { numItems: 10, cursor: null } }),
    ).rejects.toThrow("USER_SUSPENDED");
    await owner.mutation(api.users.suspend, { userId: adminUser.appUserId });
    await expect(
      admin.mutation(api.orderExceptions.open, {
        orderItemId: order.items[0]._id,
        type: "defect",
        affectedQuantity: 1,
        reason: "Suspended admin must fail.",
      }),
    ).rejects.toThrow("USER_SUSPENDED");
  });

  it("records exception audit history and keeps no-action resolution financially neutral", async () => {
    const t = testConvex();
    const { admin, order } = await createOrder(t);
    const exception = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "defect",
      affectedQuantity: 1,
      reason: "False alarm after inspection.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: exception.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: exception.exceptionId,
      resolution: "no_action",
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: exception.exceptionId });
    expect(resolved.financialImpact).toMatchObject({
      originalItemValueAmount: 125000,
      invoiceAdjustmentAmount: 0,
      refundObligationAmount: 0,
      refundObligationStatus: "none",
    });
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "exception.opened",
        "exception.review_started",
        "exception.resolution_selected",
        "exception.approved",
        "financial_adjustment.created",
        "exception.resolved",
      ]),
    );
  });
});
