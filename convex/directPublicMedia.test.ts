/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Direct R2 admin media authorization", () => {
  beforeEach(configureTestEnvironment);

  it("requires admin permission, exact owner, target and purpose on attach", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const owner = await admin.query(api.users.current, {});
    if (!owner) throw new Error("admin fixture missing");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Direct Media Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Direct Media Test" });
    const uuid = "e86c473f-6d1a-4b08-b732-2a73c6829c4a";
    const key = `bfg-direct/${owner.appUserId}/book/${bookId}/cover/${uuid}`;
    const args = { bookId, purpose: "cover" as const, key };
    await expect(admin.query(internal.directPublicMedia.authorizeAttach, args)).resolves.toMatchObject({
      ownerId: owner.appUserId,
    });
    await expect(customer.query(internal.directPublicMedia.authorizeAttach, args)).rejects.toThrow("PERMISSION_DENIED");
    await expect(t.query(internal.directPublicMedia.authorizeAttach, args)).rejects.toThrow("IDENTITY_REQUIRED");
    await expect(
      admin.query(internal.directPublicMedia.authorizeAttach, { ...args, purpose: "gallery" }),
    ).rejects.toThrow("upload ownership mismatch");
    await expect(
      admin.query(internal.directPublicMedia.authorizeAttach, { ...args, key: key.replace("/cover/", "/gallery/") }),
    ).rejects.toThrow("upload ownership mismatch");
  });

  it("does not let a user reuse a key already attached to the same book", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const owner = await admin.query(api.users.current, {});
    if (!owner) throw new Error("fixture missing");
    const publisherId = await admin.mutation(api.publishers.create, { name: "No Duplicate" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Duplicate Key Test" });
    const key = `bfg-direct/${owner.appUserId}/book/${bookId}/cover/7e7fb0d7-46d0-43c3-a37a-cae45f41834b`;
    const args = { bookId, purpose: "cover" as const, key };
    await admin.mutation(internal.directPublicMedia.attachValidated, args);
    await expect(admin.mutation(internal.directPublicMedia.attachValidated, args)).rejects.toThrow("image already attached");
    expect(await admin.query(api.books.getForAdmin, { bookId })).toMatchObject({ coverR2Key: key });
  });
});
