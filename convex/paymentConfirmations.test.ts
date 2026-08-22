/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createIssuedInvoice(t: ReturnType<typeof testConvex>) {
  const users = await setupUsers(t);
  const bundle = await createOpenCatalog(users.admin, "Payment Catalog", "2401", "payment-code");
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode: "payment-code" });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: bundle.catalogId,
    customerName: "Payment Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 2 }],
  });
  const invoice = await users.admin.mutation(api.invoices.create, {
    orderId: order.orderId,
    depositRequirementMode: "none",
  });
  const issued = await users.admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
  return { ...users, invoice: issued };
}

function paymentInput(amount: number) {
  return {
    amount,
    paymentMethod: "Bank transfer",
    transferReference: "BCA-TEST-001",
    paidAt: Date.now() - 86_400_000,
    customerNote: "Manual payment test",
  };
}

describe("BFG payment confirmation workflow", () => {
  beforeEach(configureTestEnvironment);

  it("lets a customer submit only their own eligible invoice and prevents duplicate pending attempts", async () => {
    const t = testConvex();
    const { customer, secondCustomer, admin, invoice } = await createIssuedInvoice(t);
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(100000),
    });
    expect(confirmation).toMatchObject({
      amount: 100000,
      status: "submitted",
      invoice: { invoiceId: invoice.invoiceId, paymentStatus: "payment_submitted" },
    });
    expect(
      await customer.query(api.paymentConfirmations.listMineForInvoice, { invoiceId: invoice.invoiceId }),
    ).toHaveLength(1);
    await expect(
      customer.action(api.paymentConfirmations.submit, { invoiceId: invoice.invoiceId, ...paymentInput(100000) }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_DUPLICATE_PENDING");
    await expect(
      secondCustomer.action(api.paymentConfirmations.submit, {
        invoiceId: invoice.invoiceId,
        ...paymentInput(100000),
      }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    await expect(
      secondCustomer.query(api.paymentConfirmations.getMine, { confirmationId: confirmation.confirmationId }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    await expect(
      customer.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId }),
    ).rejects.toThrow("PERMISSION_DENIED");
    expect((await admin.query(api.paymentConfirmations.listPendingForAdmin, {}))[0]).toMatchObject({
      confirmationId: confirmation.confirmationId,
      status: "submitted",
    });
  });

  it("reviews and approves atomically, updates invoice payment state, and records audit history", async () => {
    const t = testConvex();
    const { customer, admin, invoice } = await createIssuedInvoice(t);
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(100000),
    });
    await expect(
      admin.mutation(api.paymentConfirmations.startReview, { confirmationId: confirmation.confirmationId }),
    ).resolves.toMatchObject({ status: "under_review" });
    const approved = await admin.mutation(api.paymentConfirmations.approve, {
      confirmationId: confirmation.confirmationId,
      reviewNote: "Transfer matched the bank reference.",
    });
    expect(approved).toMatchObject({ status: "approved", reviewNote: "Transfer matched the bank reference." });
    const updatedInvoice = await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId });
    expect(updatedInvoice).toMatchObject({
      verifiedPaymentAmount: 100000,
      outstandingAmount: 150000,
      paymentStatus: "partially_paid",
    });
    expect(await customer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).toMatchObject({
      invoiceId: invoice.invoiceId,
      verifiedPaymentAmount: 100000,
      outstandingAmount: 150000,
      paymentStatus: "partially_paid",
    });
    await expect(
      admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_INVALID_STATE");
    const auditActions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(auditActions).toEqual(
      expect.arrayContaining([
        "payment_confirmation.submitted",
        "payment_confirmation.review_started",
        "payment_confirmation.approved",
      ]),
    );
  });

  it("preserves rejected attempts and permits a later resubmission", async () => {
    const t = testConvex();
    const { customer, admin, invoice } = await createIssuedInvoice(t);
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(50000),
    });
    await expect(
      admin.mutation(api.paymentConfirmations.reject, {
        confirmationId: confirmation.confirmationId,
        rejectionReason: "",
      }),
    ).rejects.toThrow("PAYMENT_REJECTION_REASON_REQUIRED");
    const rejected = await admin.mutation(api.paymentConfirmations.reject, {
      confirmationId: confirmation.confirmationId,
      rejectionReason: "Reference could not be matched.",
    });
    expect(rejected).toMatchObject({ status: "rejected", rejectionReason: "Reference could not be matched." });
    expect((await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).paymentStatus).toBe(
      "unpaid",
    );
    const resubmitted = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(50000),
    });
    expect(resubmitted).toMatchObject({ status: "submitted" });
    expect(
      await customer.query(api.paymentConfirmations.listMineForInvoice, { invoiceId: invoice.invoiceId }),
    ).toHaveLength(2);
  });

  it("keeps deposit allocation and verified transfer settlement from double-counting", async () => {
    const t = testConvex();
    const { customer, admin, invoice } = await createIssuedInvoice(t);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    await admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: invoice.invoiceId, amount: 80000 });
    expect((await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).paymentStatus).toBe(
      "partially_paid",
    );

    const first = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(100000),
    });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: first.confirmationId });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      allocatedDepositAmount: 80000,
      verifiedPaymentAmount: 100000,
      outstandingAmount: 70000,
      paymentStatus: "partially_paid",
    });
    await expect(
      customer.action(api.paymentConfirmations.submit, { invoiceId: invoice.invoiceId, ...paymentInput(70001) }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_EXCEEDS_OUTSTANDING");
    const final = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(70000),
    });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: final.confirmationId });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      allocatedDepositAmount: 80000,
      verifiedPaymentAmount: 170000,
      outstandingAmount: 0,
      paymentStatus: "paid",
    });
  });

  it("rejects a stale approval when a later deposit allocation reduces the outstanding amount", async () => {
    const t = testConvex();
    const { customer, admin, invoice } = await createIssuedInvoice(t);
    const stale = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      ...paymentInput(200000),
    });
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    await admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: invoice.invoiceId, amount: 80000 });
    await expect(
      admin.mutation(api.paymentConfirmations.approve, { confirmationId: stale.confirmationId }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_EXCEEDS_OUTSTANDING");
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      allocatedDepositAmount: 80000,
      verifiedPaymentAmount: 0,
      outstandingAmount: 170000,
      paymentStatus: "payment_submitted",
    });
  });

  it("denies suspended customers at the Convex authorization boundary", async () => {
    const t = testConvex();
    const { customer, owner, invoice } = await createIssuedInvoice(t);
    const customerUser = await customer.mutation(api.users.ensureCurrentUser, {});
    await owner.mutation(api.users.suspend, { userId: customerUser.appUserId });
    await expect(
      customer.action(api.paymentConfirmations.submit, { invoiceId: invoice.invoiceId, ...paymentInput(100000) }),
    ).rejects.toThrow("USER_SUSPENDED");
    await expect(
      customer.query(api.paymentConfirmations.listMine, { paginationOpts: { numItems: 10, cursor: null } }),
    ).rejects.toThrow("USER_SUSPENDED");
  });
});
