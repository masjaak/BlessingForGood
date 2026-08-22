import { describe, expect, it } from "vitest";
import { detectUploadedContentType } from "./storage";

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
});
