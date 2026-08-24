import { describe, expect, it } from "vitest";
import { detectUploadedContentType, IMAGE_CONTENT_TYPES, normalizeContentType, validateUploadedContent } from "./storage";

const progressiveExifJpeg = new Uint8Array([
  0xff,
  0xd8,
  0xff,
  0xe1,
  0x00,
  0x10,
  0x45,
  0x78,
  0x69,
  0x66,
  0x00,
  0x00,
  0x4d,
  0x4d,
  0x00,
  0x2a,
  0x00,
  0x00,
  0x00,
  0x08,
  0xff,
  0xc2,
  0x00,
  0x0b,
  0x08,
  0x04,
  0x00,
  0x06,
  0x00,
  0x06,
  0x01,
  0x01,
  0x11,
  0x00,
  0xff,
  0xda,
  0x00,
  0x08,
  0x01,
  0x01,
  0x00,
  0x00,
  0x3f,
  0x00,
  0xff,
  0xd9,
]);

describe("uploaded content signatures", () => {
  it.each([
    ["JPEG", [0xff, 0xd8, 0xff, 0xe0], "image/jpeg"],
    ["PNG", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    ["WebP", [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], "image/webp"],
    ["PDF", [0x25, 0x50, 0x44, 0x46, 0x2d], "application/pdf"],
  ])("detects %s from bytes", (_label, bytes, contentType) => {
    expect(detectUploadedContentType(new Uint8Array(bytes))).toBe(contentType);
  });

  it.each([
    new Uint8Array([]),
    new Uint8Array([0xff, 0xd8]),
    new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
    new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
  ])("rejects an unknown or incomplete signature", (bytes) => {
    expect(detectUploadedContentType(bytes)).toBeNull();
  });

  it("rejects an image dimension bomb before attachment", () => {
    const png = new Uint8Array(45);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 50_001);
    new DataView(png.buffer).setUint32(20, 50_001);

    expect(() =>
      validateUploadedContent("cover.png", "image/png", "image/png", png.length, png, IMAGE_CONTENT_TYPES, "rejected"),
    ).toThrow("rejected");
  });

  it("keeps a structurally valid JPEG upload accepted", () => {
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
      0x11, 0x00, 0xff, 0xd9,
    ]);

    expect(
      validateUploadedContent(
        "cover.jpg",
        "image/jpeg",
        "image/jpeg",
        jpeg.length,
        jpeg,
        IMAGE_CONTENT_TYPES,
        "rejected",
      ),
    ).toBe("image/jpeg");
  });

  it.each([
    "81vi9d-A1dL._SL1500_ (1).jpg",
    "IMG-20260819-WA0166.jpg",
    "downloaded.book.cover.jpeg",
  ])("accepts a realistic progressive EXIF JPEG named %s", (fileName) => {
    expect(
      validateUploadedContent(
        fileName,
        "image/pjpeg; charset=binary",
        "image/jpeg",
        progressiveExifJpeg.length,
        progressiveExifJpeg,
        IMAGE_CONTENT_TYPES,
        "rejected",
      ),
    ).toBe("image/jpeg");
  });

  it("canonicalizes browser JPEG aliases without broadening the allowed set", () => {
    expect(normalizeContentType("image/jpg; charset=binary")).toBe("image/jpeg");
    expect(normalizeContentType("image/pjpeg")).toBe("image/jpeg");
    expect(normalizeContentType("image/gif")).toBe("image/gif");
  });
});
