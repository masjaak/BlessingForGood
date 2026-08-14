import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { recordAudit } from "./lib/audit";

const MAX_PERIOD_MS = 366 * 24 * 60 * 60 * 1000;

export const get = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    if (
      !Number.isFinite(args.from) ||
      !Number.isFinite(args.to) ||
      args.from > args.to ||
      args.to - args.from > MAX_PERIOD_MS
    ) {
      fail("VALIDATION_FAILED", "report period is invalid");
    }
    // ponytail: reports cap each domain at 2,000 rows; add server-side rollups when real annual volume reaches the ceiling.
    const [orders, invoices, batches] = await Promise.all([
      ctx.db
        .query("orders")
        .withIndex("by_created_at", (index) => index.gte("createdAt", args.from).lte("createdAt", args.to))
        .order("desc")
        .take(2000),
      ctx.db
        .query("invoices")
        .withIndex("by_created_at", (index) => index.gte("createdAt", args.from).lte("createdAt", args.to))
        .order("desc")
        .take(2000),
      ctx.db
        .query("batches")
        .withIndex("by_created_at", (index) => index.gte("createdAt", args.from).lte("createdAt", args.to))
        .order("desc")
        .take(2000),
    ]);
    return {
      sales: {
        invoiceCount: invoices.filter((invoice) => invoice.status === "issued").length,
        issuedAmount: invoices
          .filter((invoice) => invoice.status === "issued")
          .reduce((sum, invoice) => sum + invoice.adjustedTotalAmount, 0),
      },
      orders: orders.map((order) => ({
        orderId: order._id,
        customerName: order.customerName,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      })),
      invoices: invoices.map((invoice) => ({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: invoice.adjustedTotalAmount,
        outstandingAmount: invoice.outstandingAmount,
        createdAt: invoice.createdAt,
      })),
      batches: batches.map((batch) => ({
        batchId: batch._id,
        name: batch.name,
        stage: batch.currentShipmentStage ?? null,
        deadlineAt: batch.poDeadlineAt ?? null,
        createdAt: batch.createdAt,
      })),
    };
  },
});

export const recordExport = mutation({
  args: { from: v.number(), to: v.number(), rowCount: v.number() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.all");
    if (
      !Number.isSafeInteger(args.rowCount) ||
      args.rowCount < 0 ||
      args.from > args.to ||
      args.to - args.from > MAX_PERIOD_MS
    ) {
      fail("VALIDATION_FAILED", "export metadata is invalid");
    }
    await recordAudit(ctx, user._id, "report.exported", "report", `${args.from}:${args.to}`, {
      rowCount: String(args.rowCount),
    });
    return { recorded: true };
  },
});
