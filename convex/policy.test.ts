/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, asUser, setupUsers, testConvex } from "../tests/convex-helpers";

type TestUser = ReturnType<typeof asUser>;

async function readyVariant(t: ReturnType<typeof testConvex>, quantity = 1) {
  const users = await setupUsers(t);
  const publisherId = await users.admin.mutation(api.publishers.create, { name: `Ready Publisher ${quantity}` });
  const bookId = await users.admin.mutation(api.books.create, {
    publisherId,
    title: `Ready Book ${quantity}`,
    categories: ["Ready"],
  });
  const variantId = await users.admin.mutation(api.bookVariants.create, {
    bookId,
    format: "PB",
    isbn: `978000009${String(quantity).padStart(4, "0")}`,
    priceAmount: 125000,
  });
  await users.admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity });
  await users.admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
  return { ...users, variantId, bookId };
}

async function preorder(t: ReturnType<typeof testConvex>, suffix = "6701") {
  const users = await setupUsers(t);
  const catalog = await createOpenCatalog(users.admin, `Policy Catalog ${suffix}`, suffix, `policy-${suffix}`);
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode: `policy-${suffix}` });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: catalog.catalogId,
    customerName: "Policy Customer",
    items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
  });
  return { ...users, catalog, order };
}

async function invoiceAndPayment(
  t: ReturnType<typeof testConvex>,
  orderId: string,
  customer: TestUser,
  admin: TestUser,
) {
  const invoice = await admin.mutation(api.invoices.create, {
    orderId: orderId as never,
    depositRequirementMode: "none",
  });
  const issued = await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
  const confirmation = await customer.action(api.paymentConfirmations.submit, {
    invoiceId: issued.invoiceId,
    amount: 125000,
    paymentMethod: "Bank transfer",
    transferReference: "POLICY-001",
    paidAt: Date.now() - 1000,
  });
  await admin.mutation(api.paymentConfirmations.startReview, { confirmationId: confirmation.confirmationId });
  await admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId });
  return { invoice: issued, confirmation };
}

describe("BFG Phase 06.7 business policy closure", () => {
  beforeEach(configureTestEnvironment);

  it("creates canonical Ready Stock orders and prevents the last-copy oversell", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, variantId } = await readyVariant(t, 1);
    await expect(t.mutation(api.orders.createReadyStock, { variantId, quantity: 1 })).rejects.toThrow(
      "IDENTITY_REQUIRED",
    );
    await expect(admin.mutation(api.orders.createReadyStock, { variantId, quantity: 1 })).rejects.toThrow(
      "CUSTOMER_REQUIRED",
    );
    const [first, second] = await Promise.allSettled([
      customer.mutation(api.orders.createReadyStock, { variantId, quantity: 1 }),
      secondCustomer.mutation(api.orders.createReadyStock, { variantId, quantity: 1 }),
    ]);
    expect([first.status, second.status].filter((status) => status === "fulfilled")).toHaveLength(1);
    const order = first.status === "fulfilled" ? first.value : second.status === "fulfilled" ? second.value : null;
    expect(order).toMatchObject({ source: "ready_stock", catalogId: null, totalAmount: 125000 });
    expect((await t.query(api.readyStock.list, {})).items).toEqual([]);
    const reservations = await t.run((ctx) => ctx.db.query("readyStockReservations").collect());
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("active");
    await expect(
      admin.mutation(api.batchTracking.assignOrderItem, {
        orderItemId: order!.items[0]._id,
        batchId: "missing" as never,
        assignedQuantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("releases an unfulfilled Ready Stock reservation once and consumes a fulfilled one", async () => {
    const t = testConvex();
    const first = await readyVariant(t, 1);
    const cancelled = await first.customer.mutation(api.orders.createReadyStock, {
      variantId: first.variantId,
      quantity: 1,
    });
    const request = await first.customer.mutation(api.orderExceptions.requestCancellation, {
      orderItemId: cancelled.items[0]._id,
      reason: "Tidak jadi membutuhkan buku.",
    });
    await first.admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exceptionId });
    await first.admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exceptionId,
      resolution: "remove_item",
    });
    await first.admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exceptionId });
    expect((await t.query(api.readyStock.list, {})).items[0].totalStock).toBe(1);
    const released = await t.run((ctx) => ctx.db.query("readyStockReservations").collect());
    expect(released[0].status).toBe("released");

    const second = await readyVariant(t, 2);
    const fulfilled = await second.customer.mutation(api.orders.createReadyStock, {
      variantId: second.variantId,
      quantity: 1,
    });
    for (const toStage of ["awaiting_payment", "awaiting_address", "packing", "shipped", "completed"] as const) {
      await second.admin.mutation(api.orderFulfillment.updateStage, {
        orderId: fulfilled.orderId,
        toStage,
      });
    }
    const inventory = await t.run((ctx) =>
      ctx.db
        .query("readyStockInventory")
        .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", second.variantId))
        .unique(),
    );
    expect(inventory).toMatchObject({ quantity: 1, reservedQuantity: 0 });
    await expect(
      second.customer.query(api.orderExceptions.getCancellationEligibility, { orderItemId: fulfilled.items[0]._id }),
    ).resolves.toMatchObject({ decision: "not_eligible", reasonCode: "ALREADY_FULFILLED" });
  });

  it("records post-PO recoverable value and settles a refund through auditable partial payouts", async () => {
    const t = testConvex();
    const { admin, customer, order, catalog } = await preorder(t);
    const { invoice } = await invoiceAndPayment(t, order.orderId, customer, admin);
    const batch = await admin.mutation(api.batches.create, { name: "Committed Policy Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId: order.items[0]._id,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    const request = await customer.mutation(api.orderExceptions.requestCancellation, {
      orderItemId: order.items[0]._id,
      reason: "Mohon tinjau pembatalan setelah proses supplier.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: request.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: request.exceptionId,
      resolution: "refund_required",
      recoverableRefundAmount: 80000,
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: request.exceptionId });
    expect(resolved.financialImpact).toMatchObject({
      invoiceAdjustmentAmount: -80000,
      refundObligationAmount: 80000,
      refundObligationStatus: "refund_due",
    });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      adjustedTotalAmount: 45000,
      refundObligationAmount: 80000,
    });
    const obligation = (await admin.query(api.refunds.listForAdmin, {}))[0];
    const created = await admin.mutation(api.refunds.createPayout, {
      obligationId: obligation.obligationId,
      amount: 50000,
      paymentMethod: "Bank transfer",
      referenceNote: "POLICY-PART-1",
    });
    const payoutId = created.payouts[0].payoutId;
    await expect(customer.mutation(api.refunds.startPayout, { payoutId: payoutId as never })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await admin.mutation(api.refunds.startPayout, { payoutId });
    await admin.mutation(api.refunds.recordPayout, { payoutId, status: "paid" });
    const partial = await admin.query(api.refunds.getForAdmin, { obligationId: obligation.obligationId });
    expect(partial).toMatchObject({ status: "partially_paid", remainingAmount: 30000 });
    await expect(
      admin.mutation(api.refunds.createPayout, { obligationId: obligation.obligationId, amount: 30001 }),
    ).rejects.toThrow("REFUND_PAYOUT_EXCEEDS_OBLIGATION");
    const final = await admin.mutation(api.refunds.createPayout, {
      obligationId: obligation.obligationId,
      amount: 30000,
    });
    const secondPayoutId = final.payouts.find((payout) => payout.status === "pending")!.payoutId;
    await admin.mutation(api.refunds.startPayout, { payoutId: secondPayoutId, paymentMethod: "Bank transfer" });
    await admin.mutation(api.refunds.recordPayout, { payoutId: secondPayoutId, status: "paid" });
    expect(await admin.query(api.refunds.getForAdmin, { obligationId: obligation.obligationId })).toMatchObject({
      status: "paid",
      paidAmount: 80000,
      remainingAmount: 0,
    });
    expect((await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).refundObligationStatus).toBe(
      "settled",
    );
  });

  it("prefers replacement for defects and keeps the original item history", async () => {
    const t = testConvex();
    const { admin, order } = await preorder(t, "6702");
    const defect = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "defect",
      affectedQuantity: 1,
      reason: "Buku rusak saat diterima.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: defect.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: defect.exceptionId,
      resolution: "replacement",
      replacementReference: "READY-STOCK-REPLACEMENT-001",
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: defect.exceptionId });
    expect(resolved).toMatchObject({ resolution: "replacement", replacementReference: "READY-STOCK-REPLACEMENT-001" });
    expect((await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).items[0].quantity).toBe(1);
    expect(await admin.query(api.refunds.listForAdmin, {})).toEqual([]);
  });

  it("creates a refund obligation when defect replacement is unavailable", async () => {
    const t = testConvex();
    const { admin, customer, order } = await preorder(t, "6704");
    await invoiceAndPayment(t, order.orderId, customer, admin);
    const defect = await admin.mutation(api.orderExceptions.open, {
      orderItemId: order.items[0]._id,
      type: "defect",
      affectedQuantity: 1,
      reason: "Tidak ada unit pengganti.",
    });
    await admin.mutation(api.orderExceptions.startReview, { exceptionId: defect.exceptionId });
    await admin.mutation(api.orderExceptions.selectResolution, {
      exceptionId: defect.exceptionId,
      resolution: "refund_required",
    });
    const resolved = await admin.mutation(api.orderExceptions.resolve, { exceptionId: defect.exceptionId });
    expect(resolved.financialImpact?.refundObligationAmount).toBe(125000);
    expect(await admin.query(api.refunds.listForAdmin, {})).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: "defect", amount: 125000 })]),
    );
  });

  it("refunds only unallocated deposit and restores it when payout fails", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await (async () => {
      const setup = await preorder(t, "6703");
      const created = await setup.admin.mutation(api.invoices.create, {
        orderId: setup.order.orderId,
        depositRequirementMode: "none",
      });
      const issued = await setup.admin.mutation(api.invoices.issue, { invoiceId: created.invoiceId });
      return { ...setup, invoice: issued };
    })();
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    const allocation = await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    await expect(customer.mutation(api.refunds.requestDepositRefund, { amount: 20001 })).rejects.toThrow(
      "DEPOSIT_BALANCE_INSUFFICIENT",
    );
    const request = await customer.mutation(api.refunds.requestDepositRefund, { amount: 20000 });
    const pending = await admin.mutation(api.refunds.createPayout, {
      obligationId: request.obligationId,
      amount: 20000,
    });
    const payoutId = pending.payouts[0].payoutId;
    await admin.mutation(api.refunds.startPayout, { payoutId, paymentMethod: "Bank transfer" });
    await admin.mutation(api.refunds.recordPayout, {
      payoutId,
      status: "failed",
      failureReason: "Bank account rejected",
    });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({
      availableAmount: 20000,
      reservedAmount: 80000,
    });
    const retry = await admin.mutation(api.refunds.createPayout, {
      obligationId: request.obligationId,
      amount: 20000,
    });
    const retryId = retry.payouts.find((payout) => payout.status === "pending")!.payoutId;
    await admin.mutation(api.refunds.startPayout, { payoutId: retryId, paymentMethod: "Bank transfer" });
    await admin.mutation(api.refunds.recordPayout, { payoutId: retryId, status: "paid" });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({
      availableAmount: 0,
      reservedAmount: 80000,
    });
    const ledger = await customer.query(api.depositTransactions.listMine, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(ledger.page.map((row) => row.type)).toEqual(
      expect.arrayContaining(["credit", "reservation", "release", "debit"]),
    );
    expect(allocation.amount).toBe(80000);
  });

  it("rejects fully allocated deposit refunds and settles a fully unallocated refund", async () => {
    const t = testConvex();
    const setup = await preorder(t, "6705");
    const created = await setup.admin.mutation(api.invoices.create, {
      orderId: setup.order.orderId,
      depositRequirementMode: "none",
    });
    const invoice = await setup.admin.mutation(api.invoices.issue, { invoiceId: created.invoiceId });
    await setup.admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    const allocation = await setup.admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 100000,
    });
    await expect(setup.customer.mutation(api.refunds.requestDepositRefund, { amount: 1 })).rejects.toThrow(
      "DEPOSIT_BALANCE_INSUFFICIENT",
    );
    await setup.admin.mutation(api.invoiceDepositAllocations.release, { allocationId: allocation.allocationId });
    const request = await setup.customer.mutation(api.refunds.requestDepositRefund, { amount: 100000 });
    const payout = await setup.admin.mutation(api.refunds.createPayout, {
      obligationId: request.obligationId,
      amount: 100000,
    });
    const payoutId = payout.payouts[0].payoutId;
    await setup.admin.mutation(api.refunds.startPayout, { payoutId, paymentMethod: "Bank transfer" });
    await setup.admin.mutation(api.refunds.recordPayout, { payoutId, status: "paid" });
    expect((await setup.customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({
      availableAmount: 0,
      reservedAmount: 0,
    });
  });
});
