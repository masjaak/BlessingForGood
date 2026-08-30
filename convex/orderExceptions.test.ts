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
    items: [{ variantId: catalog.variantIds[0], quantity }],
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
    const exception = await customer.mutation(api.orderExceptions.requestCancellation, {
      orderItemId: item._id,
      affectedQuantity: 1,
      reason: "Please cancel one copy.",
    });
    expect(exception).toMatchObject({ type: "customer_cancellation", status: "opened", affectedQuantity: 1 });
    await expect(
      customer.mutation(api.orderExceptions.requestCancellation, { orderItemId: item._id, reason: "Again" }),
    ).rejects.toThrow("CANCELLATION_NOT_ELIGIBLE");
    await expect(
      secondCustomer.query(api.orderExceptions.getMine, { exceptionId: exception.exceptionId }),
    ).rejects.toThrow("EXCEPTION_ACCESS_DENIED");
    await expect(
      secondCustomer.mutation(api.orderExceptions.requestCancellation, { orderItemId: item._id, reason: "Not mine" }),
    ).rejects.toThrow("ORDER_ACCESS_DENIED");
    expect(catalog.catalogId).toBe(order.catalogId);
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
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items[0].quantity).toBe(3);
    expect(
      (await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignments[0].assignedQuantity,
    ).toBe(2);
    expect(
      await customer.query(api.orderExceptions.getCancellationEligibility, {
        orderItemId: order.items[0]._id,
      }),
    ).toEqual({ decision: "eligible", reasonCode: null });
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
    const request = await customer.mutation(api.orderExceptions.requestCancellation, {
      orderItemId: order.items[0]._id,
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
          type: "customer_cancellation",
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
    const request = await customer.mutation(api.orderExceptions.requestCancellation, {
      orderItemId: order.items[0]._id,
      reason: "Please review this cancellation after PO lock.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exceptionId,
      resolution: "remove_item",
    });
    await admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exceptionId });
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
