import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Phase 09.1 adversarial authorization", () => {
  beforeEach(configureTestEnvironment);

  it("denies cross-customer reads and writes across private resources", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Isolation Catalog", "0911", "isolation-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "isolation-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Customer A",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const address = await customer.mutation(api.customerAddresses.create, {
      label: "Home",
      recipientName: "Customer A",
      phone: "081200000001",
      addressLine1: "A Street",
      city: "Jakarta",
      province: "DKI Jakarta",
      postalCode: "10110",
      isDefault: true,
    });
    const invoice = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    await admin.mutation(api.invoices.issue, { invoiceId: invoice.invoiceId });
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 1,
      paymentMethod: "bank_transfer",
      paidAt: Date.now(),
      customerNote: "safe test fixture",
    });
    await admin.mutation(api.depositTransactions.recordCredit, { invoiceId: invoice.invoiceId, amount: 1000 });

    const batch = await admin.mutation(api.batches.create, { name: "Isolation Batch", referenceCode: "BFG-0911" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });
    const orderItemId = await t.run(async (ctx) => {
      const item = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (index) => index.eq("orderId", order.orderId))
        .first();
      return item?._id;
    });
    if (!orderItemId || !address || !confirmation.confirmationId) throw new Error("fixture setup failed");
    await admin.mutation(api.batchTracking.assignOrderItem, {
      orderItemId,
      batchId: batch.batchId,
      assignedQuantity: 1,
    });

    await expect(secondCustomer.query(api.orders.getMine, { orderId: order.orderId })).rejects.toThrow(
      "ORDER_ACCESS_DENIED",
    );
    await expect(
      secondCustomer.mutation(api.orders.edit, {
        orderId: order.orderId,
        customerName: "B must not edit A",
        items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("ORDER_ACCESS_DENIED");
    await expect(secondCustomer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).rejects.toThrow(
      "INVOICE_ACCESS_DENIED",
    );
    await expect(
      secondCustomer.query(api.paymentConfirmations.getMine, { confirmationId: confirmation.confirmationId }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    await expect(
      secondCustomer.query(api.paymentConfirmations.listMineForInvoice, { invoiceId: invoice.invoiceId }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    await expect(
      secondCustomer.action(api.paymentConfirmations.submit, {
        invoiceId: invoice.invoiceId,
        amount: 1,
        paymentMethod: "bank_transfer",
        paidAt: Date.now(),
      }),
    ).rejects.toThrow("PAYMENT_CONFIRMATION_ACCESS_DENIED");
    await expect(
      secondCustomer.mutation(api.customerAddresses.update, { addressId: address.addressId, label: "B cannot edit A" }),
    ).rejects.toThrow("ADDRESS_ACCESS_DENIED");
    await expect(secondCustomer.query(api.batchTracking.getMine, { orderId: order.orderId })).rejects.toThrow(
      "ORDER_ACCESS_DENIED",
    );
    await expect(secondCustomer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId })).resolves.toBeNull();
    await expect(
      secondCustomer.query(api.depositTransactions.listMine, {
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(secondCustomer.query(api.notifications.listMine, { surface: "notification" })).resolves.toEqual([]);
    await expect(
      secondCustomer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId }),
    ).resolves.toBeNull();

    const customerUser = await customer.query(api.users.current, {});
    const adminCatalog = await admin.query(api.catalogAccess.listForAdmin, { catalogId: catalog.catalogId });
    const customerGrant = adminCatalog.grants.find((grant) => grant.appUserId === customerUser?.appUserId);
    if (!customerGrant) throw new Error("customer grant fixture missing");
    await admin.mutation(api.catalogAccess.revokeGrant, { grantId: customerGrant.grantId });
    await expect(customer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId })).resolves.toBeNull();
  });

  it("denies direct privileged calls, owner boundaries, and suspended access", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    const adminUser = await admin.query(api.users.current, {});
    if (!customerUser || !adminUser) throw new Error("user fixture setup failed");
    const catalog = await createOpenCatalog(admin, "Privilege Catalog", "0912", "privilege-code");

    await expect(customer.mutation(api.publishers.create, { name: "customer-admin-bypass" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(customer.mutation(api.books.generateCoverUploadUrl, {})).rejects.toThrow("PERMISSION_DENIED");
    await expect(customer.mutation(api.bulkImport.confirm, { csv: "", fileName: "fixture.csv" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(customer.mutation(api.catalogAccess.generateCode, { catalogId: catalog.catalogId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(customer.mutation(api.users.inviteStaff, { email: "attacker@example.com" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(
      admin.mutation(api.users.updateRole, { userId: customerUser.appUserId, role: "admin" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(admin.mutation(api.users.suspend, { userId: customerUser.appUserId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(admin.mutation(api.users.inviteStaff, { email: "admin-bypass@example.com" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );

    await owner.mutation(api.users.suspend, { userId: customerUser.appUserId });
    await expect(
      customer.query(api.catalogAccess.listAccessible, { paginationOpts: { numItems: 10, cursor: null } }),
    ).rejects.toThrow("USER_SUSPENDED");
    await expect(customer.query(api.notifications.listMine, { surface: "notification" })).rejects.toThrow(
      "USER_SUSPENDED",
    );
    await expect(customer.mutation(api.publishers.create, { name: "suspended-bypass" })).rejects.toThrow(
      "USER_SUSPENDED",
    );
  });

  it("engages the shared limiter on anonymous join submission", async () => {
    const t = testConvex();
    for (let index = 0; index < 20; index += 1) {
      await t.mutation(api.joinRequests.submit, {
        name: `Fixture ${index}`,
        email: `fixture-${index}@example.com`,
        contact: `08120000${String(index).padStart(4, "0")}`,
        city: "Jakarta",
        bookInterest: "Children Books",
        acknowledged: true,
      });
    }
    await expect(
      t.mutation(api.joinRequests.submit, {
        name: "Fixture overflow",
        email: "fixture-overflow@example.com",
        contact: "081299999999",
        city: "Jakarta",
        bookInterest: "Children Books",
        acknowledged: true,
      }),
    ).rejects.toThrow("RATE_LIMITED");
  });
});
