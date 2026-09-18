/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ADMIN_SUBJECT, configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG Admin Dashboard count contracts", () => {
  beforeEach(configureTestEnvironment);

  it("stays exact beyond list page sizes without reading detail projections", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);

    await t.run(async (ctx) => {
      const adminUser = await ctx.db
        .query("appUsers")
        .withIndex("by_clerk_user_id", (index) => index.eq("clerkUserId", ADMIN_SUBJECT))
        .unique();
      if (!adminUser) throw new Error("admin fixture missing");

      const now = Date.now();
      const publisherId = await ctx.db.insert("publishers", {
        name: "Dashboard Scale Publisher",
        slug: "dashboard-scale-publisher",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdByUserId: adminUser._id,
      });
      const bookId = await ctx.db.insert("books", {
        publisherId,
        title: "Dashboard Scale Book",
        slug: "dashboard-scale-book",
        categories: ["Other"],
        publicationStatus: "published",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdByUserId: adminUser._id,
      });
      const bookVariantId = await ctx.db.insert("bookVariants", {
        bookId,
        format: "PB",
        isbn: "9780000000001",
        priceAmount: 100000,
        currency: "IDR",
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
      const catalogIds: Id<"secretCatalogs">[] = [];
      for (let index = 0; index < 50; index += 1) {
        catalogIds.push(
          await ctx.db.insert("secretCatalogs", {
            name: `Dashboard Scale Catalog ${index}`,
            slug: `dashboard-scale-catalog-${index}`,
            status: "open",
            createdAt: now,
            updatedAt: now,
            createdByUserId: adminUser._id,
          }),
        );
      }
      for (let index = 0; index < 1000; index += 1) {
        await ctx.db.insert("catalogItems", {
          catalogId: catalogIds[0],
          bookVariantId,
          isAvailable: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        });
      }

      const orderIds: Id<"orders">[] = [];
      for (let index = 0; index < 101; index += 1) {
        orderIds.push(
          await ctx.db.insert("orders", {
            customerUserId: adminUser._id,
            catalogId: catalogIds[0],
            source: "customer_self_service",
            customerName: `Dashboard Customer ${index}`,
            customerEmail: `dashboard-${index}@example.com`,
            status: "submitted",
            currency: "IDR",
            subtotalAmount: 100000,
            totalAmount: 100000,
            createdAt: now + index,
            updatedAt: now + index,
            submittedAt: now + index,
            editableUntil: now + 86_400_000,
          }),
        );
      }
      const orderItemId = await ctx.db.insert("orderItems", {
        orderId: orderIds[0],
        catalogItemId: undefined,
        bookId,
        bookVariantId,
        bookTitleSnapshot: "Dashboard Scale Book",
        publisherNameSnapshot: "Dashboard Scale Publisher",
        formatSnapshot: "PB",
        isbnSnapshot: "9780000000001",
        unitPriceAmountSnapshot: 100000,
        currencySnapshot: "IDR",
        quantity: 1,
        subtotalAmount: 100000,
        createdAt: now,
      });

      const invoiceIds: Id<"invoices">[] = [];
      for (let index = 0; index < 101; index += 1) {
        invoiceIds.push(
          await ctx.db.insert("invoices", {
            orderId: orderIds[index],
            customerUserId: adminUser._id,
            invoiceNumber: `BFG-DASH-${String(index).padStart(4, "0")}`,
            status: "issued",
            currency: "IDR",
            subtotalAmount: 100000,
            totalAmount: 100000,
            adjustedTotalAmount: 100000,
            financialAdjustmentAmount: 0,
            depositRequirementMode: "none",
            depositRequiredAmount: 0,
            allocatedDepositAmount: 0,
            verifiedPaymentAmount: 0,
            outstandingAmount: 100000,
            overpaymentAmount: 0,
            refundObligationAmount: 0,
            refundObligationStatus: "none",
            paymentStatus: "unpaid",
            createdAt: now + index,
            updatedAt: now + index,
            issuedAt: now + index,
            createdByUserId: adminUser._id,
          }),
        );
      }
      for (let index = 0; index < 202; index += 1) {
        await ctx.db.insert("paymentConfirmations", {
          invoiceId: invoiceIds[index % invoiceIds.length],
          customerUserId: adminUser._id,
          amount: 100000,
          paymentMethod: "Bank transfer",
          paidAt: now,
          status: index < 101 ? "submitted" : "under_review",
          submittedAt: now + index,
          createdAt: now + index,
          updatedAt: now + index,
        });
      }
      for (let index = 0; index < 202; index += 1) {
        await ctx.db.insert("orderExceptions", {
          orderId: orderIds[0],
          orderItemId,
          customerUserId: adminUser._id,
          type: "defect",
          status: index < 101 ? "opened" : "resolved",
          reason: `Dashboard exception ${index}`,
          affectedQuantity: 1,
          createdAt: now + index,
          updatedAt: now + index,
          createdByUserId: adminUser._id,
        });
      }
      for (let index = 0; index < 202; index += 1) {
        await ctx.db.insert("refundObligations", {
          customerUserId: adminUser._id,
          orderId: orderIds[0],
          invoiceId: invoiceIds[0],
          reason: "cancellation",
          amount: 100000,
          paidAmount: index < 101 ? 0 : 100000,
          reservedAmount: 0,
          status: index < 101 ? "pending" : "paid",
          createdAt: now + index,
          updatedAt: now + index,
          createdByUserId: adminUser._id,
        });
      }
      for (const status of ["submitted", "under_review"] as const) {
        for (let index = 0; index < 201; index += 1) {
          await ctx.db.insert("joinRequests", {
            name: `Dashboard Join ${status} ${index}`,
            email: `join-${status}-${index}@example.com`,
            normalizedEmail: `join-${status}-${index}@example.com`,
            contact: "081200000000",
            normalizedContact: "+628120000000",
            bookInterest: "Other",
            source: "dashboard-scale",
            acknowledged: true,
            status,
            invitationStatus: "not_ready",
            submittedAt: now + index,
            createdAt: now + index,
            updatedAt: now + index,
          });
        }
      }
      for (let index = 0; index < 101; index += 1) {
        await ctx.db.insert("batches", {
          name: `Dashboard Batch ${index}`,
          createdAt: now + index,
          updatedAt: now + index,
          createdByUserId: adminUser._id,
          isArchived: false,
        });
      }
      for (let index = 0; index < 25; index += 1) {
        await ctx.db.insert("batches", {
          name: `Dashboard Archived Batch ${index}`,
          createdAt: now + index,
          updatedAt: now + index,
          createdByUserId: adminUser._id,
          isArchived: true,
        });
      }
    });

    expect(await admin.query(api.orders.countSubmittedForAdmin, {})).toBe(101);
    expect(await admin.query(api.joinRequests.pendingCount, {})).toBe(402);
    expect(await admin.query(api.paymentConfirmations.countPendingForAdmin, {})).toBe(202);
    expect(await admin.query(api.orderExceptions.countOpenForAdmin, {})).toBe(101);
    expect(await admin.query(api.batches.countActiveForAdmin, {})).toBe(101);
    expect(await admin.query(api.invoices.countOpenForAdmin, {})).toBe(101);
    expect(await admin.query(api.refunds.countPendingForAdmin, {})).toBe(101);
  });
});
