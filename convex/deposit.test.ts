/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function createIssuedInvoice(t: ReturnType<typeof testConvex>) {
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
  const issued = await users.admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
  return { ...users, invoice: issued };
}

describe("BFG append-only deposit ledger", () => {
  beforeEach(configureTestEnvironment);

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
    await expect(customer.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 1 })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
  });

  it("allocates and releases a reservation atomically", async () => {
    const t = testConvex();
    const { admin, invoice } = await createIssuedInvoice(t);
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    const allocation = await admin.mutation(api.invoiceDepositAllocations.allocate, {
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    expect(allocation).toMatchObject({ status: "active", amount: 80000 });
    expect(allocation.account).toMatchObject({ availableAmount: 20000, reservedAmount: 80000 });
    expect(allocation.invoice).toMatchObject({ allocatedDepositAmount: 80000, outstandingAmount: 170000 });
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
    const credit = await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
    const reversal = await admin.mutation(api.depositTransactions.reverse, {
      transactionId: credit.transactionId,
      note: "corrected test credit",
    });
    expect(reversal).toMatchObject({ type: "reversal", amount: 100000, availableDelta: -100000 });
    expect((await customer.query(api.depositAccounts.getMine, {})).account).toMatchObject({ availableAmount: 0, reservedAmount: 0 });
    const ledger = await customer.query(api.depositTransactions.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(ledger.page).toHaveLength(2);
    await expect(admin.mutation(api.depositTransactions.reverse, { transactionId: credit.transactionId })).rejects.toThrow(
      "DEPOSIT_TRANSACTION_ALREADY_REVERSED",
    );
    await expect(admin.mutation(api.depositTransactions.reverse, { transactionId: reversal.transactionId })).rejects.toThrow(
      "DEPOSIT_REVERSAL_INVALID",
    );
  });

  it("reverses an allocation through a new ledger row", async () => {
    const t = testConvex();
    const { admin, invoice } = await createIssuedInvoice(t);
    const credit = await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 100000 });
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
