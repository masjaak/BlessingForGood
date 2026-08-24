/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import {
  configureTestEnvironment,
  createOpenCatalog,
  CUSTOMER_SUBJECT,
  setupUsers,
  testConvex,
} from "../tests/convex-helpers";

describe("Phase 07.1 reconciliation", () => {
  beforeEach(configureTestEnvironment);

  it("exposes digest-safe catalog access metadata and lets Admin revoke a member grant", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "Access Managed", "97101", "managed-code");
    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "managed-code" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);

    const access = await admin.query(api.catalogAccess.listForAdmin, { catalogId: bundle.catalogId });
    expect(access.codes[0]).toMatchObject({ isActive: true, expiresAt: null });
    expect(access.grants).toHaveLength(1);
    expect(JSON.stringify(access)).not.toContain("codeDigest");
    expect(JSON.stringify(access)).not.toContain("lookupDigest");

    await admin.mutation(api.catalogAccess.revokeGrant, { grantId: access.grants[0].grantId });
    expect(await customer.query(api.catalogAccess.getUnlocked, { catalogId: bundle.catalogId })).toBeNull();
    await admin.mutation(api.catalogAccess.revokeCode, { catalogId: bundle.catalogId });
    expect(
      await t.query(api.catalogAccess.getUnlocked, {
        catalogId: bundle.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).toBeNull();
  });

  it("supports assigning and removing an existing product from a catalog", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Existing Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Existing Product" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000971020",
      priceAmount: 175000,
    });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "special" });
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Curated Existing Products" });

    expect(await admin.query(api.catalogItems.listAssignable, { catalogId })).toEqual([
      expect.objectContaining({ variantId, title: "Existing Product" }),
    ]);
    const itemId = await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: variantId });
    await admin.mutation(api.catalogItems.remove, { catalogItemId: itemId });
    expect(await admin.query(api.catalogItems.listForCatalog, { catalogId })).toEqual([]);
  });

  it("creates owned operational Inbox/Notification records and enforces read ownership", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    await t.mutation(api.joinRequests.submit, {
      name: "Inbox Applicant",
      email: "inbox-applicant@example.com",
      contact: "+62 811-9000-0001",
      city: "Jakarta",
      bookInterest: "Children Books",
      acknowledged: true,
    });
    const adminInbox = await admin.query(api.notifications.listMine, { surface: "inbox" });
    expect(adminInbox[0]).toMatchObject({ eventType: "join_request.submitted", readAt: null });

    const bundle = await createOpenCatalog(admin, "Invoice Notice", "97103", "invoice-notice-code");
    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "invoice-notice-code" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    const order = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Notice Customer",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });

    const notifications = await customer.query(api.notifications.listMine, { surface: "notification" });
    expect(notifications[0]).toMatchObject({ eventType: "invoice.issued", readAt: null });
    expect(await customer.query(api.notifications.unreadCount, { surface: "notification" })).toBe(1);

    await t.run(async (ctx) => {
      const customerUser = await ctx.db
        .query("appUsers")
        .withIndex("by_clerk_user_id", (index) => index.eq("clerkUserId", CUSTOMER_SUBJECT))
        .unique();
      if (!customerUser) throw new Error("customer fixture missing");
      await ctx.db.insert("notifications", {
        recipientUserId: customerUser._id,
        surface: "inbox",
        eventType: "message.test",
        title: "Pesan operasional",
        body: "Pesan yang lebih baru.",
        destination: "javascript:alert(1)",
        createdAt: 2_000,
      });
      await ctx.db.insert("notifications", {
        recipientUserId: customerUser._id,
        surface: "notification",
        eventType: "system.test",
        title: "Sistem test",
        body: "Tie-break sistem.",
        destination: "/account/orders",
        createdAt: 2_000,
        readAt: 1,
      });
    });

    const activity = await customer.query(api.notifications.listActivity, {});
    const messageIndex = activity.findIndex((item) => item.title === "Pesan operasional");
    const systemIndex = activity.findIndex((item) => item.title === "Sistem test");
    expect(activity[messageIndex]).toMatchObject({ type: "message", source: "inbox", destination: "/" });
    expect(activity[systemIndex]).toMatchObject({ type: "system", source: "notification" });
    expect(systemIndex).toBeLessThan(messageIndex);
    expect(await customer.query(api.notifications.unreadActivityCount, {})).toBe(2);
    expect(await secondCustomer.query(api.notifications.listActivity, {})).toEqual([]);

    await expect(
      secondCustomer.mutation(api.notifications.markRead, { notificationId: notifications[0].notificationId }),
    ).rejects.toThrow("NOTIFICATION_ACCESS_DENIED");
    await customer.mutation(api.notifications.markRead, { notificationId: notifications[0].notificationId });
    await customer.mutation(api.notifications.markRead, { notificationId: notifications[0].notificationId });
    expect(await customer.query(api.notifications.unreadCount, { surface: "notification" })).toBe(0);
  });

  it("returns authorized period reports and immutable audit activity", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const now = Date.now();
    const report = await admin.query(api.reports.get, { from: now - 86_400_000, to: now + 86_400_000 });
    expect(report).toMatchObject({
      sales: { invoiceCount: 0, issuedAmount: 0 },
      orders: [],
      invoices: [],
      batches: [],
    });
    await expect(customer.query(api.reports.get, { from: now - 1, to: now + 1 })).rejects.toThrow("PERMISSION_DENIED");
    await admin.mutation(api.reports.recordExport, { from: now - 86_400_000, to: now + 86_400_000, rowCount: 0 });

    const audit = await owner.query(api.auditEvents.list, { paginationOpts: { numItems: 20, cursor: null } });
    expect(audit.page.length).toBeGreaterThan(0);
    expect(audit.page[0]).not.toHaveProperty("unsafeMetadata");
    expect(audit.page.map((event) => event.action)).toContain("report.exported");
    await expect(admin.query(api.auditEvents.list, { paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
  });

  it("applies the report period before its operational row cap", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const now = Date.now();
    const historical = now - 100 * 86_400_000;
    await t.run(async (ctx) => {
      const customer = await ctx.db
        .query("appUsers")
        .withIndex("by_role_and_status", (query) => query.eq("role", "customer").eq("status", "active"))
        .first();
      if (!customer) throw new Error("customer fixture missing");
      for (let index = 0; index < 2_001; index += 1) {
        const createdAt = index ? now + index : historical;
        await ctx.db.insert("orders", {
          customerUserId: customer._id,
          customerName: `Report ${index}`,
          status: "submitted",
          currency: "IDR",
          subtotalAmount: 1,
          totalAmount: 1,
          createdAt,
          updatedAt: createdAt,
          submittedAt: createdAt,
          editableUntil: createdAt + 1,
        });
      }
    });

    const report = await admin.query(api.reports.get, { from: historical - 1, to: historical + 1 });
    expect(report.orders).toHaveLength(1);
    expect(report.orders[0].customerName).toBe("Report 0");
  });

  it("stores a future Batch PO deadline and rejects a past deadline", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const deadline = Date.now() + 86_400_000;
    const created = await admin.mutation(api.batches.create, {
      name: "Deadline Batch",
      poDeadlineAt: deadline,
      etaCargoMonth: "2026-10",
    });
    expect(created).toMatchObject({ poDeadlineAt: deadline, etaCargoMonth: "2026-10" });
    await expect(
      admin.mutation(api.batches.updateEtaCargoMonth, { batchId: created.batchId, etaCargoMonth: "2026-11" }),
    ).resolves.toMatchObject({ etaCargoMonth: "2026-11" });
    await expect(
      admin.mutation(api.batches.updateEtaCargoMonth, { batchId: created.batchId, etaCargoMonth: "Oktober 2026" }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(admin.mutation(api.batches.create, { name: "Invalid ETA", etaCargoMonth: "Oktober 2026" })).rejects.toThrow(
      "VALIDATION_FAILED",
    );
    await expect(
      admin.mutation(api.batches.create, { name: "Past Batch", poDeadlineAt: Date.now() - 1 }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });

  it("attaches an authorized validated image upload to Book Master", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Cover Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Cover Book" });
    const storageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(
        new Blob(
          [
            new Uint8Array([
              0x52, 0x49, 0x46, 0x46, 0x22, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x18,
              0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x0e, 0xc0, 0xfe, 0x25,
              0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00,
            ]),
          ],
          { type: "image/webp" },
        ),
      );
      // convex-test omits Blob.type from its synthetic _storage metadata.
      await ctx.db.patch(id as never, { contentType: "image/webp" } as never);
      await ctx.db.insert("uploadClaims", {
        storageId: id,
        ownerUserId: adminUser.appUserId,
        purpose: "book-cover",
        createdAt: Date.now(),
      });
      return id;
    });
    await expect(
      customer.action(api.books.attachCover, { bookId, storageId, fileName: "cover.webp", mimeType: "image/webp" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await admin.action(api.books.attachCover, { bookId, storageId, fileName: "cover.webp", mimeType: "image/webp" });
    expect(await admin.query(api.books.getForAdmin, { bookId })).toMatchObject({ coverStorageId: storageId });
  });

  it("runs an owned deposit top-up proof through Admin verification into the ledger", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    const storageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["%PDF-1.7\n"], { type: "application/pdf" }));
      await ctx.db.patch(id as never, { contentType: "application/pdf" } as never);
      await ctx.db.insert("uploadClaims", {
        storageId: id,
        ownerUserId: customerUser.appUserId,
        purpose: "deposit-proof",
        createdAt: Date.now(),
      });
      return id;
    });
    await expect(
      secondCustomer.action(api.depositTopUps.submit, {
        amount: 250000,
        storageId,
        fileName: "proof.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    const request = await customer.action(api.depositTopUps.submit, {
      amount: 250000,
      storageId,
      fileName: "proof.pdf",
      mimeType: "application/pdf",
      bankReference: "TRX-971",
    });
    expect(await secondCustomer.query(api.depositTopUps.listMine, {})).toEqual([]);
    const queue = await admin.query(api.depositTopUps.listForAdmin, { status: "submitted" });
    expect(queue[0]).toMatchObject({ topUpId: request.topUpId, amount: 250000, status: "submitted" });
    await admin.mutation(api.depositTopUps.startReview, { topUpId: request.topUpId });
    await admin.mutation(api.depositTopUps.approve, { topUpId: request.topUpId });
    expect(await customer.query(api.depositAccounts.getMine, {})).toMatchObject({
      account: { availableAmount: 250000 },
    });
    await admin.mutation(api.depositTransactions.adjust, {
      customerUserId: queue[0].customerUserId,
      direction: "debit",
      amount: 50000,
      note: "Verified correction",
    });
    expect(await customer.query(api.depositAccounts.getMine, {})).toMatchObject({
      account: { availableAmount: 200000 },
    });
    await expect(admin.mutation(api.depositTopUps.approve, { topUpId: request.topUpId })).rejects.toThrow(
      "DEPOSIT_TOP_UP_INVALID_STATE",
    );
  });

  it("persists a private payment-proof upload for the Admin review queue", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    const bundle = await createOpenCatalog(admin, "Payment Proof", "97107", "payment-proof-code");
    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "payment-proof-code" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    const order = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Proof Customer",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    const proofStorageId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(
        new Blob(
          [
            new Uint8Array([
              0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00,
              0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
            ]),
          ],
          { type: "image/png" },
        ),
      );
      await ctx.db.patch(id as never, { contentType: "image/png" } as never);
      await ctx.db.insert("uploadClaims", {
        storageId: id,
        ownerUserId: customerUser.appUserId,
        purpose: "payment-proof",
        createdAt: Date.now(),
      });
      return id;
    });
    await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 125000,
      paymentMethod: "Bank transfer",
      paidAt: Date.now(),
      proofStorageId,
      proofFileName: "proof.png",
      proofMimeType: "image/png",
    });
    const queue = await admin.query(api.paymentConfirmations.listPendingForAdmin, {});
    expect(queue[0].proofUrl).toContain("convex.cloud");
    await expect(
      secondCustomer.query(api.paymentConfirmations.listMineForInvoice, { invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_ACCESS_DENIED");
  });

  it("publishes audited community content and keeps critical settings Owner-only", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    await admin.mutation(api.contentBlocks.upsert, {
      key: "community",
      eyebrow: "Blessfriends",
      title: "A real community title",
      body: "A real published community description.",
    });
    expect(await t.query(api.contentBlocks.getPublished, { key: "community" })).toBeNull();
    await admin.mutation(api.contentBlocks.publish, { key: "community" });
    expect(await t.query(api.contentBlocks.getPublished, { key: "community" })).toMatchObject({
      title: "A real community title",
    });
    await expect(
      customer.mutation(api.contentBlocks.upsert, { key: "community", eyebrow: "No", title: "No", body: "No" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await owner.mutation(api.settings.update, {
      storeName: "Blessing For Goods",
      whatsappNumber: "+628111111111",
      paymentInstructions: "Transfer only after an invoice is issued.",
    });
    expect(await owner.query(api.settings.getForAdmin, {})).toMatchObject({ storeName: "Blessing For Goods" });
    expect(await customer.query(api.settings.getForCustomer, {})).toMatchObject({
      paymentInstructions: "Transfer only after an invoice is issued.",
    });
    await expect(admin.query(api.settings.getForAdmin, {})).rejects.toThrow("PERMISSION_DENIED");
  });

  it("lets the Owner pre-authorize a staff email and claims the Admin role on sign-in", async () => {
    const t = testConvex();
    const { owner, admin } = await setupUsers(t);
    const invitation = await owner.mutation(api.users.inviteStaff, { email: "new-admin@example.com" });
    await expect(admin.mutation(api.users.inviteStaff, { email: "not-allowed@example.com" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    const invited = t.withIdentity({
      subject: "new-admin-clerk",
      tokenIdentifier: "clerk|new-admin",
      email: "new-admin@example.com",
      name: "New Admin",
    });
    expect(await invited.mutation(api.users.ensureCurrentUser, {})).toMatchObject({ role: "admin", status: "active" });
    expect(await owner.query(api.users.listStaffInvitations, {})).toEqual([
      expect.objectContaining({
        invitationId: invitation.invitationId,
        status: "claimed",
        email: "new-admin@example.com",
      }),
    ]);
  });

  it("lets Admin maintain publisher metadata and availability", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Old Publisher Name" });
    await admin.mutation(api.publishers.update, { publisherId, name: "Current Publisher Name", isActive: false });
    expect(await admin.query(api.publishers.listForAdmin, {})).toEqual([
      expect.objectContaining({ _id: publisherId, name: "Current Publisher Name", isActive: false }),
    ]);
    await expect(customer.mutation(api.publishers.update, { publisherId, name: "No", isActive: true })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
  });
});
