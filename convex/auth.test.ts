/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const ownerIdentity = { subject: "owner-test", tokenIdentifier: "clerk|owner-test" };
const customerIdentity = { subject: "customer-test", tokenIdentifier: "clerk|customer-test" };
const secondCustomerIdentity = { subject: "customer-two-test", tokenIdentifier: "clerk|customer-two-test" };

function testConvex() {
  return convexTest(schema, modules);
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

    const customer = t.withIdentity(customerIdentity);
    await expect(customer.mutation(api.users.ensureCurrentUser, { role: "owner" } as never)).rejects.toThrow();
    await expect(customer.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "customer",
      status: "active",
    });
  });

  it("enforces operational RBAC and owner-only role management", async () => {
    const t = testConvex();
    const owner = t.withIdentity(ownerIdentity);
    const customer = t.withIdentity(customerIdentity);
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

  it("protects the owner and denies suspended ownership access", async () => {
    const t = testConvex();
    const owner = t.withIdentity(ownerIdentity);
    const customer = t.withIdentity(customerIdentity);
    const secondCustomer = t.withIdentity(secondCustomerIdentity);
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
