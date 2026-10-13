/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function setupRegularInvoice(t: ReturnType<typeof testConvex>, withDp = true) {
  const users = await setupUsers(t);
  const bundle = await createOpenCatalog(users.admin, "Reminder Catalog", "3431", "reminder-code");
  await users.customer.mutation(api.catalogAccess.unlock, { accessCode: "reminder-code" });
  const order = await users.customer.mutation(api.orders.submit, {
    catalogId: bundle.catalogId,
    customerName: "Reminder Customer",
    items: [{ variantId: bundle.variantIds[0], quantity: 2, expectedUnitPriceAmount: 125000 }],
  });
  const draft = await users.admin.mutation(api.invoices.create, {
    orderId: order.orderId,
    depositRequirementMode: withDp ? "percentage" : "none",
    depositRequirementValue: withDp ? 3000 : undefined,
  });
  return { ...users, draft };
}

async function settleDp(
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
  customer: Awaited<ReturnType<typeof setupUsers>>["customer"],
  invoiceId: Id<"invoices">,
) {
  const submitted = await customer.action(api.paymentConfirmations.submit, {
    invoiceId,
    amount: 75000,
    paymentMethod: "Bank transfer",
    paidAt: Date.now() - 86400000,
  });
  await admin.mutation(api.paymentConfirmations.approve, { confirmationId: submitted.confirmationId });
}

describe("BFG-TCK-003 regular PO settlement reminders", () => {
  beforeEach(configureTestEnvironment);

  it("lists paginated Regular PO invoices with DP and outstanding, including eligibility reasons", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, draft } = await setupRegularInvoice(t);
    const invoice = await admin.mutation(api.invoices.issue, { invoiceId: draft.invoiceId });

    // Do not leak the Admin finance queue to a customer.
    await expect(
      customer.query(api.invoiceReminders.listForAdmin, { paginationOpts: { numItems: 10, cursor: null } }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      secondCustomer.query(api.invoiceReminders.listForAdmin, { paginationOpts: { numItems: 10, cursor: null } }),
    ).rejects.toThrow("PERMISSION_DENIED");

    const before = await admin.query(api.invoiceReminders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(before.page).toHaveLength(1);
    expect(before.page[0]).toMatchObject({
      invoiceId: invoice.invoiceId,
      outstandingAmount: 250000,
      depositRequiredAmount: 75000,
      canSend: false,
    });
    expect(before.page[0].reason).toContain("DP belum terpenuhi");

    await settleDp(admin, customer, invoice.invoiceId);
    const ready = await admin.query(api.invoiceReminders.listForAdmin, {
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(ready.page).toMatchObject([{
      invoiceId: invoice.invoiceId,
      canSend: true,
      outstandingAmount: 175000,
    }]);

    await admin.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId });
    const cooldown = await admin.query(api.invoiceReminders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(cooldown.page).toMatchObject([{
      invoiceId: invoice.invoiceId,
      canSend: false,
      lastSentAt: expect.any(Number),
    }]);
    expect(cooldown.page[0].reason).toContain("24 jam");
  });

  it("does not list Random PO invoices in the Regular PO bulk reminder queue", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const current = await customer.query(api.users.current, {});
    if (!current) throw new Error("Customer fixture missing");
    const entry = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: current.appUserId,
      title: "Random PO excluded",
      priceAmount: 200000,
      etaText: "April 2027",
    });
    await admin.mutation(api.invoices.issueManualPo, {
      entryId: entry.entryId,
      depositPercentageBasisPoints: 3000,
    });
    const candidates = await admin.query(api.invoiceReminders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(candidates.page).toHaveLength(0);
  });

  it("sends a guarded in-app reminder for the existing invoice, records audit, and enforces cooldown", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, draft } = await setupRegularInvoice(t);
    const invoice = await admin.mutation(api.invoices.issue, { invoiceId: draft.invoiceId });
    expect((await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId })).canSend).toBe(false);
    await settleDp(admin, customer, invoice.invoiceId);

    const ready = await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId });
    expect(ready).toMatchObject({ canSend: true, outstandingAmount: 175000 });
    await expect(customer.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(
      secondCustomer.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("PERMISSION_DENIED");

    const sent = await admin.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId });
    expect(sent).toMatchObject({ sent: true, outstandingAmount: 175000 });
    const notifications = await customer.query(api.notifications.listMine, { surface: "notification" });
    const reminder = notifications.find((notice) => notice.eventType === "invoice.settlement_reminder");
    expect(reminder).toMatchObject({
      title: "Pengingat pelunasan PO",
      destination: `/account/invoices/${invoice.invoiceId}`,
      relatedEntityType: "invoice",
      relatedEntityId: String(invoice.invoiceId),
    });
    expect(reminder?.body).toContain("175.000");
    expect(reminder?.body).toContain(invoice.invoiceNumber);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("auditEvents")
          .filter((q) => q.eq(q.field("action"), "invoice.settlement_reminder.sent"))
          .collect(),
      ),
    ).toHaveLength(1);

    const cooldown = await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId });
    expect(cooldown).toMatchObject({
      canSend: false,
      lastSentAt: expect.any(Number),
      nextAllowedAt: expect.any(Number),
    });
    await expect(admin.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
    const original = await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId });
    expect(original).toMatchObject({
      totalAmount: 250000,
      verifiedPaymentAmount: 75000,
      outstandingAmount: 175000,
      paymentStatus: "partially_paid",
    });
    expect(await t.run(async (ctx) => (await ctx.db.query("invoices").collect()).length)).toBe(1);
  });

  it("blocks draft, non-DP, pending-payment and fully-paid invoices", async () => {
    const t = testConvex();
    const { admin, customer, draft } = await setupRegularInvoice(t);
    await expect(admin.mutation(api.invoiceReminders.send, { invoiceId: draft.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
    const invoice = await admin.mutation(api.invoices.issue, { invoiceId: draft.invoiceId });
    await settleDp(admin, customer, invoice.invoiceId);
    const pending = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 175000,
      paymentMethod: "Bank transfer",
      paidAt: Date.now() - 86400000,
    });
    expect((await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId })).canSend).toBe(false);
    await expect(admin.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: pending.confirmationId });
    await expect(admin.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
  });

  it("does not send settlement reminders on Random PO even when DP is paid", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const user = await customer.query(api.users.current, {});
    if (!user) throw new Error("Missing fixture");
    const entry = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: user.appUserId,
      title: "Random Book",
      priceAmount: 100000,
      etaText: "December 2026",
    });
    const invoice = await admin.mutation(api.invoices.issueManualPo, {
      entryId: entry.entryId,
      depositPercentageBasisPoints: 3000,
    });
    expect((await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId })).canSend).toBe(false);
    await expect(admin.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_INVALID_STATE",
    );
  });
});
