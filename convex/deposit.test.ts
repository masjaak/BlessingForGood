/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const adminAccessCode = "test-admin-code";
const adminToken = "deposit-admin-token-012345678901234567890123456789";
const customerToken = "deposit-customer-token-012345678901234567890123456789";
const secondCustomerToken = "deposit-second-customer-token-012345678901234567890123456789";

function testConvex() {
  return convexTest(schema, import.meta.glob("./**/*.ts"));
}

async function createIssuedInvoice(t: ReturnType<typeof testConvex>) {
  await t.mutation(api.prototypeSessions.createCustomer, { token: adminToken });
  await t.mutation(api.prototypeSessions.claimAdmin, { token: adminToken, accessCode: adminAccessCode });
  const bundle = await t.mutation(api.secretCatalogs.createBundle, {
    sessionToken: adminToken,
    name: "Deposit Catalog",
    publisherName: "Deposit Publisher",
    bookTitle: "Deposit Book",
    accessCode: "deposit-catalog-code",
    variants: [{ format: "PB", isbn: "9780000012353", priceAmount: 125000 }],
  });
  await t.mutation(api.secretCatalogs.open, { sessionToken: adminToken, catalogId: bundle.catalogId });
  await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
  await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "deposit-catalog-code" });
  const order = await t.mutation(api.orders.submit, {
    sessionToken: customerToken,
    catalogId: bundle.catalogId,
    customerName: "Deposit Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 2 }],
  });
  const invoice = await t.mutation(api.invoices.create, {
    sessionToken: adminToken,
    orderId: order.orderId,
    depositRequirementMode: "percentage",
    depositRequirementValue: 5000,
  });
  return t.mutation(api.invoices.issue, { sessionToken: adminToken, invoiceId: invoice.invoiceId });
}

describe("BFG append-only deposit ledger", () => {
  beforeEach(() => {
    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
    process.env.BFG_SESSION_TOKEN_PEPPER = "session-test-pepper";
    process.env.BFG_PREVIEW_ADMIN_ACCESS_CODE = adminAccessCode;
  });

  it("starts empty and records admin credit for the invoice customer", async () => {
    const t = testConvex();
    const invoice = await createIssuedInvoice(t);
    expect(await t.query(api.depositAccounts.getMine, { sessionToken: customerToken })).toEqual({ account: null });

    const credit = await t.mutation(api.depositTransactions.recordCredit, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 100000,
      note: "prototype deposit",
    });
    expect(credit.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0, currency: "IDR" });
    const mine = await t.query(api.depositAccounts.getMine, { sessionToken: customerToken });
    expect(mine.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0 });
    await t.mutation(api.prototypeSessions.createCustomer, { token: secondCustomerToken });
    expect(await t.query(api.depositAccounts.getMine, { sessionToken: secondCustomerToken })).toEqual({
      account: null,
    });
    const ledger = await t.query(api.depositTransactions.listMine, {
      sessionToken: customerToken,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(ledger.page).toMatchObject([{ type: "credit", amount: 100000, availableDelta: 100000 }]);
    await expect(
      t.mutation(api.depositTransactions.recordCredit, {
        sessionToken: customerToken,
        invoiceId: invoice.invoiceId,
        amount: 1,
      }),
    ).rejects.toThrow("ADMIN_REQUIRED");
  });

  it("allocates and releases a reservation atomically", async () => {
    const t = testConvex();
    const invoice = await createIssuedInvoice(t);
    await t.mutation(api.depositTransactions.recordCredit, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 100000,
    });
    const allocation = await t.mutation(api.invoiceDepositAllocations.allocate, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    expect(allocation).toMatchObject({ status: "active", amount: 80000 });
    expect(allocation.account).toMatchObject({ availableAmount: 20000, reservedAmount: 80000 });
    expect(allocation.invoice).toMatchObject({ allocatedDepositAmount: 80000, outstandingAmount: 170000 });
    await expect(
      t.mutation(api.invoiceDepositAllocations.allocate, {
        sessionToken: adminToken,
        invoiceId: invoice.invoiceId,
        amount: 20001,
      }),
    ).rejects.toThrow("DEPOSIT_BALANCE_INSUFFICIENT");

    const released = await t.mutation(api.invoiceDepositAllocations.release, {
      sessionToken: adminToken,
      allocationId: allocation.allocationId,
    });
    expect(released).toMatchObject({ status: "released", amount: 80000 });
    expect(released.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0 });
    expect(released.invoice).toMatchObject({ allocatedDepositAmount: 0, outstandingAmount: 250000 });
    const ledgerSummary = await t.run(async (ctx) => {
      const account = await ctx.db.get(released.account.accountId);
      const transactions = await ctx.db
        .query("depositTransactions")
        .withIndex("by_account", (index) => index.eq("accountId", released.account.accountId))
        .take(100);
      return {
        availableAmount: account?.availableAmount,
        reservedAmount: account?.reservedAmount,
        availableDelta: transactions.reduce((sum, transaction) => sum + transaction.availableDelta, 0),
        reservedDelta: transactions.reduce((sum, transaction) => sum + transaction.reservedDelta, 0),
      };
    });
    expect(ledgerSummary).toMatchObject({
      availableAmount: 100000,
      reservedAmount: 0,
      availableDelta: 100000,
      reservedDelta: 0,
    });
  });

  it("rejects allocation beyond outstanding and preserves customer ownership", async () => {
    const t = testConvex();
    const invoice = await createIssuedInvoice(t);
    await t.mutation(api.depositTransactions.recordCredit, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 300000,
    });
    await expect(
      t.mutation(api.invoiceDepositAllocations.allocate, {
        sessionToken: adminToken,
        invoiceId: invoice.invoiceId,
        amount: 250001,
      }),
    ).rejects.toThrow("DEPOSIT_ALLOCATION_EXCEEDS_OUTSTANDING");
    await t.mutation(api.invoices.voidInvoice, { sessionToken: adminToken, invoiceId: invoice.invoiceId });
    await expect(
      t.mutation(api.invoiceDepositAllocations.allocate, {
        sessionToken: adminToken,
        invoiceId: invoice.invoiceId,
        amount: 1,
      }),
    ).rejects.toThrow("INVOICE_VOID");
  });

  it("reverses a credit with an inverse transaction and rejects unsafe reversals", async () => {
    const t = testConvex();
    const invoice = await createIssuedInvoice(t);
    const credit = await t.mutation(api.depositTransactions.recordCredit, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 100000,
    });
    const reversal = await t.mutation(api.depositTransactions.reverse, {
      sessionToken: adminToken,
      transactionId: credit.transactionId,
      note: "corrected test credit",
    });
    expect(reversal).toMatchObject({ type: "reversal", amount: 100000, availableDelta: -100000 });
    expect((await t.query(api.depositAccounts.getMine, { sessionToken: customerToken })).account).toMatchObject({
      availableAmount: 0,
      reservedAmount: 0,
    });
    const ledger = await t.query(api.depositTransactions.listMine, {
      sessionToken: customerToken,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(ledger.page).toHaveLength(2);
    expect(ledger.page.find((row: { type: string }) => row.type === "credit")).toMatchObject({
      amount: 100000,
      reversedByTransactionId: reversal.transactionId,
    });
    await expect(
      t.mutation(api.depositTransactions.reverse, { sessionToken: adminToken, transactionId: credit.transactionId }),
    ).rejects.toThrow("DEPOSIT_TRANSACTION_ALREADY_REVERSED");
    await expect(
      t.mutation(api.depositTransactions.reverse, { sessionToken: adminToken, transactionId: reversal.transactionId }),
    ).rejects.toThrow("DEPOSIT_REVERSAL_INVALID");
  });

  it("reverses an allocation through a new ledger row", async () => {
    const t = testConvex();
    const invoice = await createIssuedInvoice(t);
    const credit = await t.mutation(api.depositTransactions.recordCredit, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 100000,
    });
    const allocation = await t.mutation(api.invoiceDepositAllocations.allocate, {
      sessionToken: adminToken,
      invoiceId: invoice.invoiceId,
      amount: 80000,
    });
    const reversed = await t.mutation(api.invoiceDepositAllocations.reverse, {
      sessionToken: adminToken,
      allocationId: allocation.allocationId,
    });
    expect(reversed).toMatchObject({ status: "reversed", amount: 80000 });
    expect(reversed.account).toMatchObject({ availableAmount: 100000, reservedAmount: 0 });
    expect(reversed.invoice).toMatchObject({ allocatedDepositAmount: 0, outstandingAmount: 250000 });
    await expect(
      t.mutation(api.invoiceDepositAllocations.reverse, {
        sessionToken: adminToken,
        allocationId: allocation.allocationId,
      }),
    ).rejects.toThrow("DEPOSIT_ALLOCATION_INVALID");
    expect(credit.transactionId).toBeDefined();
  });
});
