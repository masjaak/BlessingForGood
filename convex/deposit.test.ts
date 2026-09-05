/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createInvoice(t: ReturnType<typeof testConvex>, issue = true) {
  const users = await setupUsers(t);
  const bundle = await createOpenCatalog(users.admin, "Deposit Catalog", "2353", "deposit-catalog-code");
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode: "deposit-catalog-code" });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: bundle.catalogId,
    customerName: "Deposit Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 2 }],
  });
  const invoice = await users.admin.mutation(api.invoices.create, {
    orderId: order.orderId,
    depositRequirementMode: "percentage",
    depositRequirementValue: 5000,
  });
  const result = issue ? await users.admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId }) : invoice;
  return { ...users, invoice: result };
}

async function createIssuedInvoice(t: ReturnType<typeof testConvex>) {
  return createInvoice(t);
}

describe("BFG append-only deposit ledger", () => {
  beforeEach(configureTestEnvironment);

  it("projects the canonical ledger into bounded admin history with context", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await createIssuedInvoice(t);
    const currentCustomer = await customer.query(api.users.current, {});
    if (!currentCustomer) throw new Error("deposit customer fixture missing");

    await admin.mutation(api.depositTransactions.recordCredit, {
      invoiceId: invoice.invoiceId,
      amount: 100000,
      note: "Invoice deposit credit",
    });
    await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 50000,
    });
    await admin.mutation(api.depositTransactions.adjust, {
      customerUserId: currentCustomer.appUserId,
      direction: "credit",
      amount: 25000,
      note: "Manual credit correction",
    });
    await admin.mutation(api.depositTransactions.adjust, {
      customerUserId: currentCustomer.appUserId,
      direction: "debit",
      amount: 10000,
      note: "Manual debit correction",
    });

    const history = await admin.query(api.depositTransactions.listForAdmin, {
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(history.page).toHaveLength(4);
    expect(history.page.map((row) => row.direction)).toEqual(["out", "in", "out", "in"]);
    expect(history.page.map((row) => row.amount)).toEqual([10000, 25000, 50000, 100000]);
    expect(history.page.map((row) => row.description)).toEqual([
      "Manual debit correction",
      "Manual credit correction",
      "invoice deposit allocation",
      "Invoice deposit credit",
    ]);
    expect(history.page.every((row) => row.customerUserId === currentCustomer.appUserId)).toBe(true);
    expect(history.page[0]).toMatchObject({
      source: "Penyesuaian manual",
      actorName: expect.any(String),
      invoiceNumber: null,
      orderCode: null,
      batchName: null,
    });
    expect(history.page[2]).toMatchObject({
      source: "Alokasi ke invoice",
      invoiceNumber: expect.any(String),
      orderCode: expect.any(String),
      batchName: null,
    });

    const credits = await admin.query(api.depositTransactions.listForAdmin, {
      paginationOpts: { numItems: 25, cursor: null },
      direction: "in",
    });
    expect(credits.page).toHaveLength(2);
    expect(credits.page.every((row) => row.direction === "in")).toBe(true);

    const firstCreditPage = await admin.query(api.depositTransactions.listForAdmin, {
      paginationOpts: { numItems: 1, cursor: null },
      direction: "in",
    });
    const secondCreditPage = await admin.query(api.depositTransactions.listForAdmin, {
      paginationOpts: { numItems: 1, cursor: firstCreditPage.continueCursor },
      direction: "in",
    });
    expect(firstCreditPage.page.map((row) => row.amount)).toEqual([25000]);
    expect(secondCreditPage.page.map((row) => row.amount)).toEqual([100000]);
    expect(secondCreditPage.isDone).toBe(true);

    const customerHistory = await admin.query(api.depositTransactions.listForAdmin, {
      paginationOpts: { numItems: 25, cursor: null },
      customerUserId: currentCustomer.appUserId,
    });
    expect(customerHistory.page).toHaveLength(4);
  });

  it("starts empty and records admin credit for the invoice customer", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, invoice } = await createIssuedInvoice(t);
    expect(await customer.query(api.depositAccounts.getMine, {})).toEqual({ account: null });
    const credit = await admin.mutation(api.depositTransactions.recordCredit, {
      invoiceId: invoice.invoiceId,
      amount: 100000,
      note: "test deposit",
    });
    expect(credit.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0, currency: "IDR" });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({ availableAmount: 100000 });
    expect(await secondCustomer.query(api.depositAccounts.getMine, {})).toEqual({ account: null });
    const ledger = await customer.query(api.depositTransactions.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(ledger.page).toMatchObject([{ type: "credit", amount: 100000, availableDelta: 100000 }]);
    await expect(
      customer.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 1 }),
    ).rejects.toThrow("PERMISSION_DENIED");
  });

  it("does not consume deposit when Admin issues the full invoice snapshot", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await createInvoice(t, false);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });

    const issued = await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    expect(issued).toMatchObject({
      status: "issued",
      totalAmount: 250000,
      allocatedDepositAmount: 0,
      outstandingAmount: 250000,
    });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({
      availableAmount: 100000,
      reservedAmount: 0,
    });
  });

  it("lets the Customer allocate the current minimum and records Customer traceability", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, invoice } = await createIssuedInvoice(t);
    const currentCustomer = await customer.query(api.users.current, {});
    if (!currentCustomer) throw new Error("deposit customer fixture missing");
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });

    const allocation = await customer.mutation(api.invoiceDepositAllocations.allocateMine, {
      invoiceId: invoice.invoiceId,
    });
    expect(allocation).toMatchObject({ amount: 100000, status: "active" });
    expect(allocation.account).toMatchObject({ availableAmount: 0, reservedAmount: 100000 });
    expect(allocation.invoice).toMatchObject({
      totalAmount: 250000,
      allocatedDepositAmount: 100000,
      outstandingAmount: 150000,
      paymentStatus: "partially_paid",
    });
    await expect(
      secondCustomer.mutation(api.invoiceDepositAllocations.allocateMine, { invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("INVOICE_ACCESS_DENIED");
    await expect(
      customer.mutation(api.invoiceDepositAllocations.allocateMine, { invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("DEPOSIT_BALANCE_INSUFFICIENT");

    const history = await customer.query(api.depositTransactions.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(history.page).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "reservation",
          amount: 100000,
          direction: "out",
          source: "Alokasi ke invoice",
          invoiceNumber: expect.any(String),
          actorName: expect.any(String),
        }),
      ]),
    );
    const trace = await t.run(async (ctx) => ({
      audit: (await ctx.db.query("auditEvents").collect()).find(
        (event) => event.action === "deposit.allocated" && event.targetId === String(invoice.invoiceId),
      ),
      notification: (await ctx.db.query("notifications").collect()).find(
        (notice) => notice.eventType === "deposit.allocated" && notice.recipientUserId === currentCustomer.appUserId,
      ),
    }));
    expect(trace.audit).toMatchObject({
      actorUserId: currentCustomer.appUserId,
      targetType: "invoice",
      safeMetadata: { amount: "100000", actorRole: "customer" },
    });
    expect(trace.notification).toMatchObject({
      relatedEntityType: "invoice",
      relatedEntityId: String(invoice.invoiceId),
    });
  });

  it("caps Customer allocation at outstanding and leaves excess deposit available", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await createIssuedInvoice(t);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 300000 });

    const allocation = await customer.mutation(api.invoiceDepositAllocations.allocateMine, {
      invoiceId: invoice.invoiceId,
    });
    expect(allocation).toMatchObject({ amount: 250000 });
    expect(allocation.account).toMatchObject({ availableAmount: 50000, reservedAmount: 250000 });
    expect(allocation.invoice).toMatchObject({ outstandingAmount: 0, paymentStatus: "paid" });
    expect(await customer.query(api.paymentConfirmations.listMineForInvoice, { invoiceId: invoice.invoiceId })).toEqual(
      [],
    );
  });

  it("composes Customer deposit allocation with approved Payment without double-counting", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await createIssuedInvoice(t);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    await customer.mutation(api.invoiceDepositAllocations.allocateMine, { invoiceId: invoice.invoiceId });

    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 150000,
      paymentMethod: "Bank transfer",
      transferReference: "CUSTOMER-DEPOSIT-COMPOSE",
      paidAt: Date.now(),
    });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      totalAmount: 250000,
      allocatedDepositAmount: 100000,
      verifiedPaymentAmount: 150000,
      outstandingAmount: 0,
      paymentStatus: "paid",
    });
  });

  it("allocates and releases a reservation atomically", async () => {
    const t = testConvex();
    const { admin, invoice } = await createIssuedInvoice(t);
    const currentAdmin = await admin.query(api.users.current, {});
    if (!currentAdmin) throw new Error("deposit admin fixture missing");
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    const allocation = await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    expect(allocation).toMatchObject({ status: "active", amount: 80000 });
    expect(allocation.account).toMatchObject({ availableAmount: 20000, reservedAmount: 80000 });
    expect(allocation.invoice).toMatchObject({ allocatedDepositAmount: 80000, outstandingAmount: 170000 });
    await expect(
      t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).find(
          (event) => event.action === "deposit.allocated" && event.targetId === String(invoice.invoiceId),
        ),
      ),
    ).resolves.toMatchObject({
      actorUserId: currentAdmin.appUserId,
      safeMetadata: { actorRole: "admin" },
    });
    await expect(
      admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: invoice.invoiceId, amount: 20001 }),
    ).rejects.toThrow("DEPOSIT_BALANCE_INSUFFICIENT");
    const released = await admin.mutation(api.invoiceDepositAllocations.release, {
      allocationId: allocation.allocationId,
    });
    expect(released).toMatchObject({ status: "released", amount: 80000 });
    expect(released.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0 });
    expect(released.invoice).toMatchObject({ allocatedDepositAmount: 0, outstandingAmount: 250000 });
  });

  it("rejects allocation beyond outstanding and preserves invoice state", async () => {
    const t = testConvex();
    const { admin, invoice } = await createIssuedInvoice(t);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 300000 });
    await expect(
      admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: invoice.invoiceId, amount: 250001 }),
    ).rejects.toThrow("DEPOSIT_ALLOCATION_EXCEEDS_OUTSTANDING");
    await admin.mutation(api.invoices.voidInvoice, { invoiceId: invoice.invoiceId });
    await expect(
      admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: invoice.invoiceId, amount: 1 }),
    ).rejects.toThrow("INVOICE_VOID");
  });

  it("reverses a credit with an inverse transaction", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await createIssuedInvoice(t);
    const credit = await admin.mutation(api.depositTransactions.recordCredit, {
      invoiceId: invoice.invoiceId,
      amount: 100000,
    });
    const reversal = await admin.mutation(api.depositTransactions.reverse, {
      transactionId: credit.transactionId,
      note: "corrected test credit",
    });
    expect(reversal).toMatchObject({ type: "reversal", amount: 100000, availableDelta: -100000 });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({
      availableAmount: 0,
      reservedAmount: 0,
    });
    const ledger = await customer.query(api.depositTransactions.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(ledger.page).toHaveLength(2);
    await expect(
      admin.mutation(api.depositTransactions.reverse, { transactionId: credit.transactionId }),
    ).rejects.toThrow("DEPOSIT_TRANSACTION_ALREADY_REVERSED");
    await expect(
      admin.mutation(api.depositTransactions.reverse, { transactionId: reversal.transactionId }),
    ).rejects.toThrow("DEPOSIT_REVERSAL_INVALID");
  });

  it("reverses an allocation through a new ledger row", async () => {
    const t = testConvex();
    const { admin, invoice } = await createIssuedInvoice(t);
    const credit = await admin.mutation(api.depositTransactions.recordCredit, {
      invoiceId: invoice.invoiceId,
      amount: 100000,
    });
    const allocation = await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    const reversed = await admin.mutation(api.invoiceDepositAllocations.reverse, {
      allocationId: allocation.allocationId,
    });
    expect(reversed).toMatchObject({ status: "reversed", amount: 80000 });
    expect(reversed.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0 });
    await expect(
      admin.mutation(api.invoiceDepositAllocations.reverse, { allocationId: allocation.allocationId }),
    ).rejects.toThrow("DEPOSIT_ALLOCATION_INVALID");
    expect(credit.transactionId).toBeDefined();
  });
});
