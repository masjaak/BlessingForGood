/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG bounded operational settings", () => {
  beforeEach(configureTestEnvironment);

  it("persists only owner-managed operational fields and exposes safe customer values", async () => {
    const t = testConvex();
    const { owner, admin, customer } = await setupUsers(t);

    await expect(
      admin.mutation(api.settings.update, {
        storeName: "Denied",
        whatsappNumber: "0812",
        paymentInstructions: "Denied",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");

    await owner.mutation(api.settings.update, {
      storeName: "BFG Store",
      whatsappNumber: "0812",
      paymentInstructions: "Transfer sebelum batas waktu.",
      supportEmail: "help@example.com",
      socialContact: "@bfg",
      bankName: "Bank BFG",
      bankAccountNumber: "123456",
      bankAccountName: "Blessing For Goods",
    });

    expect(await customer.query(api.settings.getForCustomer, {})).toEqual({
      storeName: "BFG Store",
      whatsappNumber: "0812",
      paymentInstructions: "Transfer sebelum batas waktu.",
      supportEmail: "help@example.com",
      socialContact: "@bfg",
      bankName: "Bank BFG",
      bankAccountNumber: "123456",
      bankAccountName: "Blessing For Goods",
    });
  });
});
