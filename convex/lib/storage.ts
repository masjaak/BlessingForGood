import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { fail } from "./errors";

export const MAX_STORED_FILE_BYTES = 5_000_000;
export const MAX_IMAGE_DIMENSION = 10_000;
export const MAX_IMAGE_PIXELS = 25_000_000;

export const IMAGE_CONTENT_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PROOF_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function normalizeContentType(value: string | null | undefined): string | null {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "image/jpg" || normalized === "image/pjpeg") return "image/jpeg";
  return normalized;
}

const extensionTypes: ReadonlyMap<string, string> = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["pdf", "application/pdf"],
]);

export const getMetadata = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    return metadata ? { size: metadata.size, contentType: metadata.contentType ?? null } : null;
  },
});

function ascii(bytes: Uint8Array, offset: number, value: string): boolean {
  return Array.from(value, (character) => character.charCodeAt(0)).every(
    (character, index) => bytes[offset + index] === character,
  );
}

function readBigEndian(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  );
}

function readUnsignedBigEndian(bytes: Uint8Array, offset: number): number {
  return readBigEndian(bytes, offset) >>> 0;
}

function readLittleEndian(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24)
  );
}

export function detectUploadedContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && ascii(bytes, 0, "\x89PNG\r\n\x1a\n")) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "image/webp";
  if (bytes.length >= 5 && ascii(bytes, 0, "%PDF-")) return "application/pdf";
  return null;
}

export function validateUploadedContent(
  fileName: string,
  declaredMimeType: string,
  storedMimeType: string | null | undefined,
  fileSize: number,
  bytes: Uint8Array,
  allowedTypes: ReadonlySet<string>,
  errorMessage: string,
): string {
  const declaredType = normalizeContentType(declaredMimeType);
  const storedType = normalizeContentType(storedMimeType);
  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize < 0 ||
    fileSize > MAX_STORED_FILE_BYTES ||
    !storedType ||
    !allowedTypes.has(storedType) ||
    declaredType !== storedType ||
    extensionType(fileName) !== storedType
  ) {
    fail("VALIDATION_FAILED", errorMessage);
  }

  const detectedType = detectUploadedContentType(bytes);
  if (detectedType !== storedType || !hasValidStructure(detectedType, bytes, fileSize)) {
    fail("VALIDATION_FAILED", errorMessage);
  }
  return detectedType;
}

function hasValidStructure(type: string, bytes: Uint8Array, fileSize: number): boolean {
  if (type === "image/jpeg") {
    if (fileSize < 6 || bytes.length < 6 || bytes[3] === 0 || bytes[3] === 0xff || bytes[3] === 0xd9) return false;
    const segmentLength = (bytes[4] << 8) | bytes[5];
    return segmentLength >= 2 && fileSize >= segmentLength + 4 && hasSafeImageDimensions(type, bytes);
  }
  if (type === "image/png") {
    return (
      fileSize >= 45 &&
      bytes.length >= 33 &&
      readBigEndian(bytes, 8) === 13 &&
      ascii(bytes, 12, "IHDR") &&
      readUnsignedBigEndian(bytes, 16) > 0 &&
      readUnsignedBigEndian(bytes, 20) > 0 &&
      hasSafeImageDimensions(type, bytes)
    );
  }
  if (type === "image/webp") {
    if (fileSize < 20 || bytes.length < 20) return false;
    const riffSize = readLittleEndian(bytes, 4);
    const chunkSize = readLittleEndian(bytes, 16);
    return (
      riffSize >= 12 &&
      riffSize + 8 <= fileSize &&
      chunkSize >= 0 &&
      chunkSize + 20 <= fileSize &&
      hasSafeImageDimensions(type, bytes)
    );
  }
  return type === "application/pdf" && fileSize >= 8 && bytes.length >= 8;
}

function hasSafeImageDimensions(type: string, bytes: Uint8Array): boolean {
  const dimensions = readImageDimensions(type, bytes);
  if (!dimensions) return false;
  const [width, height] = dimensions;
  return (
    width > 0 &&
    height > 0 &&
    width <= MAX_IMAGE_DIMENSION &&
    height <= MAX_IMAGE_DIMENSION &&
    width * height <= MAX_IMAGE_PIXELS
  );
}

function readImageDimensions(type: string, bytes: Uint8Array): [number, number] | null {
  if (type === "image/png" && bytes.length >= 24) {
    return [readUnsignedBigEndian(bytes, 16), readUnsignedBigEndian(bytes, 20)];
  }
  if (type === "image/webp" && bytes.length >= 30) {
    if (ascii(bytes, 12, "VP8X")) {
      return [1 + read24LittleEndian(bytes, 24), 1 + read24LittleEndian(bytes, 27)];
    }
    if (ascii(bytes, 12, "VP8 ") && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return [readLittleEndian(bytes, 26) & 0x3fff, readLittleEndian(bytes, 28) & 0x3fff];
    }
  }
  if (type === "image/webp" && bytes.length >= 25 && ascii(bytes, 12, "VP8L") && bytes[20] === 0x2f) {
    return [
      1 + ((bytes[22] & 0x3f) << 8) + bytes[21],
      1 + ((bytes[24] & 0x0f) << 10) + (bytes[23] << 2) + ((bytes[22] & 0xc0) >> 6),
    ];
  }
  if (type === "image/jpeg") return readJpegDimensions(bytes);
  return null;
}

function read24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function readJpegDimensions(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset++];
    if (marker === 0xda) return null;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const data = offset + 2;
      if (segmentLength < 7) return null;
      return [(bytes[data + 3] << 8) | bytes[data + 4], (bytes[data + 1] << 8) | bytes[data + 2]];
    }
    offset += segmentLength;
  }
  return null;
}

function extensionType(fileName: string): string | null {
  const normalized = fileName.trim();
  const dot = normalized.lastIndexOf(".");
  return dot < 0 ? null : (extensionTypes.get(normalized.slice(dot + 1).toLowerCase()) ?? null);
}

export async function validateUploadedFile(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
  fileName: string,
  declaredMimeType: string,
  allowedTypes: ReadonlySet<string>,
  errorMessage: string,
): Promise<string> {
  const metadata = await ctx.runQuery(internal.lib.storage.getMetadata, { storageId });
  if (!metadata) fail("VALIDATION_FAILED", errorMessage);
  const blob = await ctx.storage.get(storageId);
  if (!blob || blob.size !== metadata.size) fail("VALIDATION_FAILED", errorMessage);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return validateUploadedContent(
    fileName,
    declaredMimeType,
    metadata.contentType,
    metadata.size,
    bytes,
    allowedTypes,
    errorMessage,
  );
}

export async function validateStoredFile(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  allowedTypes: ReadonlySet<string>,
  errorMessage: string,
) {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) fail("VALIDATION_FAILED", errorMessage);
  const contentType = normalizeContentType(metadata?.contentType);
  if (!contentType || !allowedTypes.has(contentType) || metadata.size > MAX_STORED_FILE_BYTES) {
    fail("VALIDATION_FAILED", errorMessage);
  }
  return contentType;
}
