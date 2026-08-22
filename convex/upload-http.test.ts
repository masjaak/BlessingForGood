import { beforeEach, describe, expect, it } from "vitest";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const validWebp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x22, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x18, 0x00, 0x00,
  0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x0e, 0xc0, 0xfe, 0x25, 0xa4, 0x00, 0x03, 0x70,
  0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00,
]);

describe("BFG owned upload HTTP boundary", () => {
  beforeEach(configureTestEnvironment);

  it("stores only validated files and records the authenticated owner claim", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const validResponse = await admin.fetch(
      `/bfg/upload?purpose=book-cover&fileName=${encodeURIComponent("cover.webp")}`,
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "image/webp",
          "X-BFG-File-Size": String(validWebp.byteLength),
        },
        body: validWebp,
      },
    );
    expect(validResponse.status).toBe(200);
    const { storageId } = (await validResponse.json()) as { storageId: string };
    expect(storageId).toBeTruthy();
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("uploadClaims")
          .withIndex("by_storage_id", (index) => index.eq("storageId", storageId as never))
          .unique(),
      ),
    ).toMatchObject({ purpose: "book-cover" });

    const deniedResponse = await customer.fetch(
      `/bfg/upload?purpose=book-cover&fileName=${encodeURIComponent("denied.webp")}`,
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "image/webp",
          "X-BFG-File-Size": String(validWebp.byteLength),
        },
        body: validWebp,
      },
    );
    expect(deniedResponse.status).toBe(400);
  });

  it("rejects a byte/content mismatch before storage", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const response = await admin.fetch(`/bfg/upload?purpose=book-cover&fileName=${encodeURIComponent("cover.webp")}`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "image/webp",
        "X-BFG-File-Size": "12",
      },
      body: new TextEncoder().encode("not an image"),
    });
    expect(response.status).toBe(400);
    expect(await t.run(async (ctx) => ctx.db.query("uploadClaims").collect())).toEqual([]);
  });
});
