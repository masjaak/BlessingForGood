/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Random PO invoice DP", () => {
  beforeEach(configureTestEnvironment);

  it("enforces a 30% DP and accepts the remaining balance on the original invoice", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const user = await customer.query(api.users.current, {});
    if (!user) throw new Error("Missing fixture");
    const entry = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: user.appUserId, title: "Random Book", priceAmount: 600000, etaText: "April 2027",
    });
    const invoice = await admin.mutation(api.invoices.issueManualPo, {
      entryId: entry.entryId, depositPercentageBasisPoints: 3000,
    });
    expect(invoice).toMatchObject({
      status: "issued", totalAmount: 600000, depositRequirementMode: "percentage",
      depositRequirementValue: 3000, depositRequiredAmount: 180000,
      minimumPaymentAmount: 180000, outstandingAmount: 600000,
    });
    const first = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId, amount: 180000,
      paymentMethod: "Bank transfer", paidAt: Date.now() - 86400000,
    });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: first.confirmationId });
    expect(await customer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).toMatchObject({
      paymentStatus: "partially_paid", outstandingAmount: 420000,
    });
    const last = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId, amount: 420000,
      paymentMethod: "Bank transfer", paidAt: Date.now() - 86400000,
    });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: last.confirmationId });
    expect(await customer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).toMatchObject({
      paymentStatus: "paid", outstandingAmount: 0,
    });
  });

  it("validates percentages and never reissues an existing Random PO", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const user = await customer.query(api.users.current, {});
    if (!user) throw new Error("Missing fixture");
    const entry = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: user.appUserId, title: "Selected Book", priceAmount: 200000, etaText: "May 2027",
    });
    for (const invalid of [-1, 10001, 2500.5]) {
      await expect(admin.mutation(api.invoices.issueManualPo, {
        entryId: entry.entryId, depositPercentageBasisPoints: invalid,
      })).rejects.toThrow("INVOICE_REQUIREMENT_INVALID");
    }
    const first = await admin.mutation(api.invoices.issueManualPo, {
      entryId: entry.entryId, depositPercentageBasisPoints: 10000,
    });
    expect(first).toMatchObject({ depositRequiredAmount: 200000, minimumPaymentAmount: 200000 });
    const repeated = await admin.mutation(api.invoices.issueManualPo, {
      entryId: entry.entryId, depositPercentageBasisPoints: 0,
    });
    expect(repeated.invoiceId).toBe(first.invoiceId);
    expect(repeated.depositRequirementValue).toBe(10000);
    expect(await t.run(async (ctx) => (await ctx.db.query("invoices").collect()).length)).toBe(1);
  });
});
