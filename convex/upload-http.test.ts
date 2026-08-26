import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const progressiveExifJpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00,
  0x08, 0xff, 0xc2, 0x00, 0x0b, 0x08, 0x04, 0x00, 0x06, 0x00, 0x06, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08,
  0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9,
]);

const baselineJpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01,
  0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9,
]);

const exifJpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00,
  0x08, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01,
  0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9,
]);

const validPng = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const validWebp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x22, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x18, 0x00, 0x00,
  0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x0e, 0xc0, 0xfe, 0x25, 0xa4, 0x00, 0x03, 0x70,
  0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00,
]);

describe("BFG owned upload HTTP boundary", () => {
  beforeEach(configureTestEnvironment);

  it("allows the local browser origin used by the Development Playwright server", async () => {
    const t = testConvex();
    const response = await t.fetch("/bfg/upload", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3100" },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3100");

    for (const origin of [
      "https://www.blessingforgood.com",
      "https://blessingforgood.com",
      "https://blessingforgood.vercel.app",
      "https://blessing-for-good.vercel.app",
      "https://blessing-for-good-masjaaks-projects.vercel.app",
    ]) {
      const productionAlias = await t.fetch("/bfg/upload", {
        method: "OPTIONS",
        headers: { Origin: origin },
      });
      expect(productionAlias.status).toBe(204);
      expect(productionAlias.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    }

    for (const origin of [
      "https://not-blessing-for-good.example",
      "https://blessing-for-good-b61uabzb5-masjaaks-projects.vercel.app",
      "https://preview-blessing-for-good.vercel.app",
    ]) {
      const denied = await t.fetch("/bfg/upload", { method: "OPTIONS", headers: { Origin: origin } });
      expect(denied.status).toBe(204);
      expect(denied.headers.get("Access-Control-Allow-Origin")).toBe("null");
    }
  });

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

  it("accepts the client file matrix at the real HTTP upload boundary", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const files = [
      { bytes: baselineJpeg, fileName: "IMG-20260819-WA0166.jpg", mimeType: "image/jpeg" },
      { bytes: progressiveExifJpeg, fileName: "progressive.jpg", mimeType: "image/jpeg" },
      { bytes: exifJpeg, fileName: "81vi9d-A1dL._SL1500_ (1).jpg", mimeType: "image/jpeg" },
      { bytes: baselineJpeg, fileName: "alias-jpg.jpg", mimeType: "image/jpg" },
      { bytes: baselineJpeg, fileName: "alias-pjpeg.jpg", mimeType: "image/pjpeg" },
      { bytes: validPng, fileName: "book.png", mimeType: "image/png" },
      { bytes: validWebp, fileName: "book.webp", mimeType: "image/webp" },
    ];

    for (const [index, file] of files.entries()) {
      const response = await admin.fetch(
        `/bfg/upload?purpose=${index === 0 ? "book-cover" : "book-gallery"}&fileName=${encodeURIComponent(file.fileName)}`,
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3100",
            "Content-Type": `${file.mimeType}; charset=binary`,
            "X-BFG-File-Size": String(file.bytes.byteLength),
          },
          body: file.bytes,
        },
      );
      expect(response.status, file.fileName).toBe(200);
      expect((await response.json()).storageId).toBeTruthy();
    }

    expect(await t.run(async (ctx) => ctx.db.query("uploadClaims").collect())).toHaveLength(files.length);
  });

  it("runs the real JPEG upload, attach, reload, and customer projection path", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Upload Journey Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Upload Journey Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000041091",
      priceAmount: 125000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 3 });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    const coverResponse = await admin.fetch(
      `/bfg/upload?purpose=book-cover&fileName=${encodeURIComponent("81vi9d-A1dL._SL1500_ (1).jpg")}`,
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:3100",
          "Content-Type": "image/pjpeg; charset=binary",
          "X-BFG-File-Size": String(progressiveExifJpeg.byteLength),
        },
        body: progressiveExifJpeg,
      },
    );
    expect(coverResponse.status).toBe(200);
    const { storageId: coverStorageId } = (await coverResponse.json()) as { storageId: string };
    const galleryResponse = await admin.fetch(
      `/bfg/upload?purpose=book-gallery&fileName=${encodeURIComponent("cover.final.v2.JPG")}`,
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:3100",
          "Content-Type": "image/jpg; charset=binary",
          "X-BFG-File-Size": String(progressiveExifJpeg.byteLength),
        },
        body: progressiveExifJpeg,
      },
    );
    expect(galleryResponse.status).toBe(200);
    const { storageId: galleryStorageId } = (await galleryResponse.json()) as { storageId: string };
    const secondGalleryResponse = await admin.fetch(
      `/bfg/upload?purpose=book-gallery&fileName=${encodeURIComponent("gallery-second.png")}`,
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:3100",
          "Content-Type": "image/png; charset=binary",
          "X-BFG-File-Size": String(validPng.byteLength),
        },
        body: validPng,
      },
    );
    expect(secondGalleryResponse.status).toBe(200);
    const { storageId: secondGalleryStorageId } = (await secondGalleryResponse.json()) as { storageId: string };

    // convex-test does not retain Blob.type in synthetic storage metadata; real Convex Storage does.
    await t.run(async (ctx) => {
      await ctx.db.patch(coverStorageId as never, { contentType: "image/jpeg" } as never);
      await ctx.db.patch(galleryStorageId as never, { contentType: "image/jpeg" } as never);
      await ctx.db.patch(secondGalleryStorageId as never, { contentType: "image/png" } as never);
    });
    expect(
      await t.run(async (ctx) => {
        const metadata = await ctx.db.system.get("_storage", coverStorageId as Id<"_storage">);
        const blob = await ctx.storage.get(coverStorageId as Id<"_storage">);
        return { contentType: metadata?.contentType, size: metadata?.size, bodySize: blob?.size };
      }),
    ).toEqual({
      contentType: "image/jpeg",
      size: progressiveExifJpeg.byteLength,
      bodySize: progressiveExifJpeg.byteLength,
    });

    await admin.action(api.books.attachCover, {
      bookId,
      storageId: coverStorageId as Id<"_storage">,
      fileName: "81vi9d-A1dL._SL1500_ (1).jpg",
      mimeType: "image/pjpeg; charset=binary",
    });
    const firstGalleryMediaId = await admin.action(api.books.attachGalleryImage, {
      bookId,
      storageId: galleryStorageId as Id<"_storage">,
      fileName: "cover.final.v2.JPG",
      mimeType: "image/jpg; charset=binary",
      altText: "Upload journey gallery first",
    });
    const secondGalleryMediaId = await admin.action(api.books.attachGalleryImage, {
      bookId,
      storageId: secondGalleryStorageId as Id<"_storage">,
      fileName: "gallery-second.png",
      mimeType: "image/png; charset=binary",
      altText: "Upload journey gallery second",
    });
    await admin.mutation(api.books.moveGalleryImage, { mediaId: secondGalleryMediaId, direction: "up" });

    const persistedAdminBook = await admin.query(api.books.getForAdmin, { bookId });
    expect(persistedAdminBook).toMatchObject({
      coverStorageId: coverStorageId,
      gallery: [
        { storageId: secondGalleryStorageId, altText: "Upload journey gallery second" },
        { storageId: galleryStorageId, altText: "Upload journey gallery first" },
      ],
    });
    const persistedCustomerBook = await customer.query(api.readyStock.getBySlug, { slug: "upload-journey-book" });
    expect(persistedCustomerBook?.coverImageUrl).toBeTruthy();
    expect(persistedCustomerBook?.gallery).toEqual([
      expect.objectContaining({ altText: "Upload journey gallery second", url: expect.any(String) }),
      expect.objectContaining({ altText: "Upload journey gallery first", url: expect.any(String) }),
    ]);
    expect(await admin.query(api.books.getForAdmin, { bookId })).toMatchObject({
      coverStorageId: coverStorageId,
      gallery: [{ storageId: secondGalleryStorageId }, { storageId: galleryStorageId }],
    });
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("uploadClaims")
          .withIndex("by_storage_id", (index) => index.eq("storageId", coverStorageId as never))
          .first(),
      ),
    ).toBeNull();
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("uploadClaims")
          .withIndex("by_storage_id", (index) => index.eq("storageId", galleryStorageId as never))
          .first(),
      ),
    ).toBeNull();
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("uploadClaims")
          .withIndex("by_storage_id", (index) => index.eq("storageId", secondGalleryStorageId as never))
          .first(),
      ),
    ).toBeNull();
    expect(firstGalleryMediaId).toBeDefined();
  });
});
