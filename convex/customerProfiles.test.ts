/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Customer profile Admin controls", () => {
  beforeEach(configureTestEnvironment);

  it("lets Admin correct a Customer display name without changing Clerk identity fields", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const current = await customer.query(api.users.current, {});
    if (!current) throw new Error("customer fixture missing");

    await customer.mutation(api.customerProfiles.upsertMine, {
      displayName: "Nama Lama",
      phone: "08123456789",
      whatsappNumber: "08123456789",
    });

    await expect(
      admin.mutation(api.customerProfiles.updateDisplayNameForAdmin, {
        userId: current.appUserId,
        displayName: "Nama Yang Benar",
      }),
    ).resolves.toMatchObject({
      userId: current.appUserId,
      displayName: "Nama Yang Benar",
      phone: "08123456789",
      whatsappNumber: "08123456789",
    });

    await expect(customer.query(api.customerProfiles.getMine, {})).resolves.toMatchObject({
      displayName: "Nama Yang Benar",
      phone: "08123456789",
      whatsappNumber: "08123456789",
    });

    const appUser = await admin.query(api.users.getForAdmin, { userId: current.appUserId });
    expect(appUser.emailSnapshot).toBe(current.emailSnapshot);

    const auditActions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect())
        .filter((event) => event.targetType === "customerProfile")
        .map((event) => event.action),
    );
    expect(auditActions).toContain("customer.display_name_updated");
  });

  it("does not let a Customer use the Admin name correction mutation", async () => {
    const t = testConvex();
    const { customer } = await setupUsers(t);
    const current = await customer.query(api.users.current, {});
    if (!current) throw new Error("customer fixture missing");

    await expect(
      customer.mutation(api.customerProfiles.updateDisplayNameForAdmin, {
        userId: current.appUserId,
        displayName: "Tidak Boleh",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
});
