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

  it("sends a guarded in-app reminder for the existing invoice, records audit, and enforces cooldown", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer, draft } = await setupRegularInvoice(t);
    const invoice = await admin.mutation(api.invoices.issue, { invoiceId: draft.invoiceId });
    expect((await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId })).canSend).toBe(false);
    await settleDp(admin, customer, invoice.invoiceId);

    const ready = await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId });
    expect(ready).toMatchObject({ canSend: true, outstandingAmount: 175000 });
    await expect(
      customer.mutation(api.invoiceReminders.send, { invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("PERMISSION_DENIED");
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
        ctx.db.query("auditEvents").filter((q) =>
          q.eq(q.field("action"), "invoice.settlement_reminder.sent"),
        ).collect(),
      ),
    ).toHaveLength(1);

    const cooldown = await admin.query(api.invoiceReminders.getStatus, { invoiceId: invoice.invoiceId });
    expect(cooldown).toMatchObject({ canSend: false, lastSentAt: expect.any(Number), nextAllowedAt: expect.any(Number) });
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
