import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { notifyUser } from "./lib/notifications";

type DataCtx = MutationCtx | QueryCtx;
const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const REMINDER_EVENT = "invoice.settlement_reminder";

async function reminderState(ctx: DataCtx, invoice: Doc<"invoices">) {
  const latest = await ctx.db
    .query("notifications")
    .withIndex("by_related_entity", (index) =>
      index.eq("relatedEntityType", "invoice").eq("relatedEntityId", String(invoice._id)),
    )
    .order("desc")
    .filter((q) => q.eq(q.field("eventType"), REMINDER_EVENT))
    .first();
  const lastSentAt = latest?.createdAt ?? null;
  const nextAllowedAt = lastSentAt === null ? null : lastSentAt + REMINDER_COOLDOWN_MS;
  let reason: string | null = null;

  if (invoice.status !== "issued") {
    reason = "Pengingat hanya tersedia untuk invoice yang sudah terbit dan belum dibatalkan.";
  } else if (invoice.manualPoEntryId || invoice.readyStockOrderId) {
    reason = "Pengingat pelunasan ini khusus untuk PO reguler.";
  } else if (invoice.outstandingAmount <= 0) {
    reason = "Invoice sudah lunas.";
  } else if (invoice.depositRequiredAmount <= 0) {
    reason = "Invoice tidak memiliki syarat DP untuk alur pelunasan.";
  } else if (invoice.allocatedDepositAmount + invoice.verifiedPaymentAmount < invoice.depositRequiredAmount) {
    reason = "DP belum terpenuhi. Tunggu pembayaran DP terverifikasi terlebih dahulu.";
  } else {
    const customer = await ctx.db.get(invoice.customerUserId);
    if (!customer || customer.role !== "customer" || customer.status !== "active") {
      reason = "Akun customer tidak aktif.";
    } else {
      const pendingConfirmation = await ctx.db
        .query("paymentConfirmations")
        .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice._id))
        .filter((q) => q.or(q.eq(q.field("status"), "submitted"), q.eq(q.field("status"), "under_review")))
        .first();
      if (pendingConfirmation || invoice.paymentStatus === "payment_submitted") {
        reason = "Ada konfirmasi pembayaran yang sedang ditinjau.";
      } else if (nextAllowedAt !== null && Date.now() < nextAllowedAt) {
        reason = "Pengingat sudah dikirim. Tunggu 24 jam sebelum mengirim lagi.";
      }
    }
  }

  return {
    canSend: reason === null,
    reason,
    lastSentAt,
    nextAllowedAt,
    outstandingAmount: invoice.outstandingAmount,
  };
}

/**
 * Admin-only, paginated Regular PO settlement queue.
 * Filters invoice categories on the backend before pagination; the per-invoice
 * reminderState still enforces all payment, permission and cooldown guards.
 * Displaying blocked rows lets Admin understand why an invoice is not selectable.
 */
export const listForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const page = await ctx.db
      .query("invoices")
      .withIndex("by_status", (index) => index.eq("status", "issued"))
      .filter((q) =>
        q.and(
          q.eq(q.field("manualPoEntryId"), undefined),
          q.eq(q.field("readyStockOrderId"), undefined),
          q.gt(q.field("depositRequiredAmount"), 0),
          q.gt(q.field("outstandingAmount"), 0),
        ),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (invoice) => {
          const [customer, order, batch, status] = await Promise.all([
            ctx.db.get(invoice.customerUserId),
            invoice.orderId ? ctx.db.get(invoice.orderId) : Promise.resolve(null),
            invoice.batchId ? ctx.db.get(invoice.batchId) : Promise.resolve(null),
            reminderState(ctx, invoice),
          ]);
          return {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            // Use the immutable order customer name first, matching invoiceView().
            // Older appUsers may have no displayNameSnapshot even though the order
            // (and printed invoice) already knows the customer's actual name.
            customerName:
              (order?.customerUserId === invoice.customerUserId ? order.customerName?.trim() : "") ||
              customer?.displayNameSnapshot?.trim() ||
              customer?.emailSnapshot?.trim() ||
              customer?.memberCode ||
              "Nama pelanggan belum tersedia",
            memberCode: customer?.memberCode ?? null,
            batchName: batch?.name ?? null,
            depositRequiredAmount: invoice.depositRequiredAmount,
            ...status,
          };
        }),
      ),
    };
  },
});

/**
 * Read-only eligibility lookup for already-issued invoice rows in
 * Admin -> Invoice -> Penerbitan Invoice -> Status tag: Sudah bayar DP.
 * The actual reminder mutation independently checks the same conditions.
 */
export const getEligibilityForInvoices = query({
  args: { invoiceIds: v.array(v.id("invoices")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    if (args.invoiceIds.length > 100) fail("INVOICE_INVALID_STATE", "Maksimal 100 invoice.");
    const uniqueIds = [...new Set(args.invoiceIds)];
    return Promise.all(
      uniqueIds.map(async (invoiceId) => {
        const invoice = await ctx.db.get(invoiceId);
        if (!invoice) {
          return { invoiceId, canSend: false, reason: "Invoice tidak ditemukan.", outstandingAmount: 0 };
        }
        const status = await reminderState(ctx, invoice);
        return { invoiceId, canSend: status.canSend, reason: status.reason, outstandingAmount: status.outstandingAmount };
      }),
    );
  },
});

export const getStatus = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "invoices.read.all");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    return reminderState(ctx, invoice);
  },
});

export const send = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "invoices.manage");
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) fail("INVOICE_NOT_FOUND");
    // Recheck all guards in the same atomic mutation to prevent race conditions
    // with payment settlement or another Admin sending the same reminder.
    const status = await reminderState(ctx, invoice);
    if (!status.canSend) fail("INVOICE_INVALID_STATE", status.reason || "Pengingat tidak tersedia");

    const outstandingLabel = `Rp${invoice.outstandingAmount.toLocaleString("id-ID")}`;
    const notificationId = await notifyUser(ctx, invoice.customerUserId, {
      surface: "notification",
      audience: "customer",
      eventType: REMINDER_EVENT,
      title: "Pengingat pelunasan PO",
      body:
        `Sisa tagihan invoice ${invoice.invoiceNumber}: ${outstandingLabel}. ` +
        "DP sudah tercatat. Silakan lanjutkan pelunasan melalui invoice yang sama di BFG. " +
        "Tidak perlu membuat pesanan atau invoice baru.",
      destination: `/account/invoices/${String(invoice._id)}`,
      relatedEntityType: "invoice",
      relatedEntityId: String(invoice._id),
    });
    await recordAudit(ctx, admin._id, "invoice.settlement_reminder.sent", "invoice", String(invoice._id), {
      invoiceNumber: invoice.invoiceNumber,
      outstandingAmount: String(invoice.outstandingAmount),
    });
    return { sent: true, notificationId, outstandingAmount: invoice.outstandingAmount };
  },
});
