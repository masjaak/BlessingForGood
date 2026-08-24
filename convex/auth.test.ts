/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { asUser, seedApprovedJoinRequest, setupUsers } from "../tests/convex-helpers";

const modules = import.meta.glob("./**/*.ts");
const ownerIdentity = { subject: "owner-test", tokenIdentifier: "clerk|owner-test" };
const customerIdentity = {
  subject: "customer-test",
  tokenIdentifier: "clerk|customer-test",
  email: "customer-test@example.com",
};
const secondCustomerIdentity = {
  subject: "customer-two-test",
  tokenIdentifier: "clerk|customer-two-test",
  email: "customer-two-test@example.com",
};

function testConvex() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

describe("Clerk identity and BFG authorization", () => {
  beforeEach(() => {
    process.env.BFG_OWNER_CLERK_USER_ID = ownerIdentity.subject;
    process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
    delete process.env.BFG_PREVIEW_DEMO_MODE;
  });

  it("rejects missing identity and provisions owner/customer idempotently", async () => {
    const t = testConvex();
    await expect(t.mutation(api.users.ensureCurrentUser, {})).rejects.toThrow("IDENTITY_REQUIRED");

    const owner = t.withIdentity(ownerIdentity);
    const firstOwner = await owner.mutation(api.users.ensureCurrentUser, {});
    const secondOwner = await owner.mutation(api.users.ensureCurrentUser, {});
    expect(firstOwner).toMatchObject({ role: "owner", status: "active" });
    expect(secondOwner.appUserId).toBe(firstOwner.appUserId);
    expect(secondOwner.memberCode).toBe(firstOwner.memberCode);

    const customer = t.withIdentity(customerIdentity);
    await seedApprovedJoinRequest(t, customerIdentity.email);
    await expect(customer.mutation(api.users.ensureCurrentUser, { role: "owner" } as never)).rejects.toThrow();
    await expect(customer.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "customer",
      status: "active",
    });
  });

  it("does not provision an uninvited identity", async () => {
    const t = testConvex();
    const visitor = t.withIdentity({
      subject: "uninvited-test",
      tokenIdentifier: "clerk|uninvited-test",
      email: "uninvited@example.com",
    });
    await expect(visitor.mutation(api.users.ensureCurrentUser, {})).rejects.toThrow("ADMISSION_REQUIRED");
    expect(await t.run(async (ctx) => ctx.db.query("appUsers").collect())).toHaveLength(0);
  });

  it("enforces operational RBAC and owner-only role management", async () => {
    const t = testConvex();
    const owner = t.withIdentity(ownerIdentity);
    const customer = t.withIdentity(customerIdentity);
    await seedApprovedJoinRequest(t, customerIdentity.email);
    const customerUser = await customer.mutation(api.users.ensureCurrentUser, {});
    await owner.mutation(api.users.ensureCurrentUser, {});

    await expect(customer.mutation(api.publishers.create, { name: "Customer Publisher" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await owner.mutation(api.users.updateRole, { userId: customerUser.appUserId, role: "admin" });
    const admin = t.withIdentity(customerIdentity);
    await expect(admin.mutation(api.publishers.create, { name: "Admin Publisher" })).resolves.toBeDefined();
    await expect(
      admin.mutation(api.users.updateRole, { userId: customerUser.appUserId, role: "customer" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(owner.mutation(api.users.suspend, { userId: customerUser.appUserId })).resolves.toMatchObject({
      status: "suspended",
    });
    await expect(admin.query(api.users.current, {})).resolves.toMatchObject({ status: "suspended" });
  });

  it("fails closed for Admin data and writes across every identity state", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);
    const missingAppUser = asUser(t, "missing-app-user");
    const customerUser = await customer.query(api.users.current, {});
    const adminUser = await admin.query(api.users.current, {});
    if (!customerUser || !adminUser) throw new Error("test users were not provisioned");

    await customer.mutation(api.customerProfiles.upsertMine, {
      displayName: "Protected Customer",
      phone: "081234567890",
    });
    const sensitiveQueryArgs = { userId: customerUser.appUserId };

    await expect(t.query(api.customerProfiles.getForAdmin, sensitiveQueryArgs)).rejects.toThrow("IDENTITY_REQUIRED");
    await expect(missingAppUser.query(api.customerProfiles.getForAdmin, sensitiveQueryArgs)).rejects.toThrow(
      "APP_USER_REQUIRED",
    );
    await expect(customer.query(api.customerProfiles.getForAdmin, sensitiveQueryArgs)).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(admin.query(api.customerProfiles.getForAdmin, sensitiveQueryArgs)).resolves.toMatchObject({
      displayName: "Protected Customer",
      phone: "081234567890",
    });
    await expect(owner.query(api.customerProfiles.getForAdmin, sensitiveQueryArgs)).resolves.toMatchObject({
      displayName: "Protected Customer",
      phone: "081234567890",
    });

    await expect(t.mutation(api.publishers.create, { name: "Signed Out Publisher" })).rejects.toThrow(
      "IDENTITY_REQUIRED",
    );
    await expect(missingAppUser.mutation(api.publishers.create, { name: "Missing User Publisher" })).rejects.toThrow(
      "APP_USER_REQUIRED",
    );
    await expect(customer.mutation(api.publishers.create, { name: "Customer Publisher" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(admin.mutation(api.publishers.create, { name: "Admin Publisher" })).resolves.toBeDefined();
    await expect(owner.mutation(api.publishers.create, { name: "Owner Publisher" })).resolves.toBeDefined();

    const ownOrdersArgs = { paginationOpts: { numItems: 10, cursor: null } };
    await expect(customer.query(api.orders.listMine, ownOrdersArgs)).resolves.toMatchObject({ page: [] });
    await expect(admin.query(api.orders.listMine, ownOrdersArgs)).resolves.toMatchObject({ page: [] });
    await expect(owner.query(api.orders.listMine, ownOrdersArgs)).resolves.toMatchObject({ page: [] });

    await expect(
      customer.mutation(api.users.updateRole, { userId: adminUser.appUserId, role: "customer" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      admin.mutation(api.users.updateRole, { userId: customerUser.appUserId, role: "admin" }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      owner.mutation(api.users.updateRole, { userId: customerUser.appUserId, role: "customer" }),
    ).resolves.toMatchObject({ role: "customer" });

    await owner.mutation(api.users.suspend, { userId: adminUser.appUserId });
    await expect(admin.query(api.customerProfiles.getForAdmin, sensitiveQueryArgs)).rejects.toThrow("USER_SUSPENDED");
    await expect(admin.mutation(api.publishers.create, { name: "Suspended Publisher" })).rejects.toThrow(
      "USER_SUSPENDED",
    );
  });

  it("protects the owner and denies suspended ownership access", async () => {
    const t = testConvex();
    const owner = t.withIdentity(ownerIdentity);
    const customer = t.withIdentity(customerIdentity);
    const secondCustomer = t.withIdentity(secondCustomerIdentity);
    await seedApprovedJoinRequest(t, customerIdentity.email);
    await seedApprovedJoinRequest(t, secondCustomerIdentity.email);
    const ownerUser = await owner.mutation(api.users.ensureCurrentUser, {});
    const customerUser = await customer.mutation(api.users.ensureCurrentUser, {});
    await secondCustomer.mutation(api.users.ensureCurrentUser, {});

    await expect(owner.mutation(api.users.suspend, { userId: ownerUser.appUserId })).rejects.toThrow("SELF_SUSPENSION");
    await expect(owner.mutation(api.users.suspend, { userId: customerUser.appUserId })).resolves.toMatchObject({
      status: "suspended",
    });
    await expect(
      customer.query(api.catalogAccess.listAccessible, { paginationOpts: { numItems: 10, cursor: null } }),
    ).rejects.toThrow("USER_SUSPENDED");
  });

  it("keeps catalog grants and orders isolated by app user", async () => {
    const t = testConvex();
    const owner = t.withIdentity(ownerIdentity);
    const customer = t.withIdentity(customerIdentity);
    const secondCustomer = t.withIdentity(secondCustomerIdentity);
    await seedApprovedJoinRequest(t, customerIdentity.email);
    await seedApprovedJoinRequest(t, secondCustomerIdentity.email);
    await owner.mutation(api.users.ensureCurrentUser, {});
    await customer.mutation(api.users.ensureCurrentUser, {});
    await secondCustomer.mutation(api.users.ensureCurrentUser, {});
    const bundle = await owner.mutation(api.secretCatalogs.createBundle, {
      name: "Identity Catalog",
      publisherName: "Identity Publisher",
      bookTitle: "Identity Book",
      accessCode: "identity-code",
      variants: [{ format: "PB", isbn: "9780000090001", priceAmount: 100000 }],
    });
    await owner.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "identity-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Customer One",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });
    await expect(secondCustomer.query(api.orders.getMine, { orderId: order.orderId })).rejects.toThrow(
      "ORDER_ACCESS_DENIED",
    );
    await expect(
      secondCustomer.query(api.catalogAccess.getUnlocked, { catalogId: bundle.catalogId }),
    ).resolves.toBeNull();
  });

  it("does not allow the legacy anonymous identity to enter active functions", async () => {
    const t = testConvex();
    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    await expect(
      t.mutation(api.prototypeSessions.createCustomer, {
        token: "legacy-token-012345678901234567890123456789",
      }),
    ).rejects.toThrow("LEGACY_IDENTITY_DISABLED");
  });

  it("isolates customer profiles and keeps one default address", async () => {
    const t = testConvex();
    const owner = t.withIdentity(ownerIdentity);
    const customer = t.withIdentity(customerIdentity);
    const secondCustomer = t.withIdentity(secondCustomerIdentity);
    await seedApprovedJoinRequest(t, customerIdentity.email);
    await seedApprovedJoinRequest(t, secondCustomerIdentity.email);
    const customerUser = await customer.mutation(api.users.ensureCurrentUser, {});
    await owner.mutation(api.users.ensureCurrentUser, {});
    await secondCustomer.mutation(api.users.ensureCurrentUser, {});

    const profile = await customer.mutation(api.customerProfiles.upsertMine, {
      displayName: "Customer One",
      phone: "081234567890",
    });
    expect(profile).toMatchObject({ userId: customerUser.appUserId, displayName: "Customer One" });
    expect(await secondCustomer.query(api.customerProfiles.getMine, {})).toBeNull();

    const first = await customer.mutation(api.customerAddresses.create, {
      label: "Home",
      recipientName: "Customer One",
      phone: "081234567890",
      addressLine1: "One Street",
      city: "Jakarta",
      province: "DKI Jakarta",
      postalCode: "10000",
      isDefault: true,
    });
    const second = await customer.mutation(api.customerAddresses.create, {
      label: "Office",
      recipientName: "Customer One",
      phone: "081234567890",
      addressLine1: "Two Street",
      city: "Jakarta",
      province: "DKI Jakarta",
      postalCode: "10001",
      isDefault: true,
    });
    const addresses = await customer.query(api.customerAddresses.listMine, {});
    expect(addresses).toHaveLength(2);
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
    if (!first || !second) throw new Error("address creation failed");
    await expect(
      secondCustomer.mutation(api.customerAddresses.update, { addressId: first.addressId, label: "Nope" }),
    ).rejects.toThrow("ADDRESS_ACCESS_DENIED");
    await customer.mutation(api.customerAddresses.remove, { addressId: second.addressId });
    expect(await customer.query(api.customerAddresses.listMine, {})).toHaveLength(1);
    await expect(
      customer.mutation(api.customerAddresses.update, { addressId: first.addressId, isDefault: false }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });
});
