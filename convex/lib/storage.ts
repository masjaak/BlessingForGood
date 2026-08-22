import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { fail } from "./errors";

export const MAX_STORED_FILE_BYTES = 5_000_000;
const HEADER_BYTES = 64;

export const IMAGE_CONTENT_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PROOF_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

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
  header: Uint8Array,
  allowedTypes: ReadonlySet<string>,
  errorMessage: string,
): string {
  const declaredType = declaredMimeType.trim().toLowerCase();
  const storedType = storedMimeType?.trim().toLowerCase();
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

  const detectedType = detectUploadedContentType(header);
  if (detectedType !== storedType || !hasValidStructure(detectedType, header, fileSize)) {
    fail("VALIDATION_FAILED", errorMessage);
  }
  return detectedType;
}

function hasValidStructure(type: string, bytes: Uint8Array, fileSize: number): boolean {
  if (type === "image/jpeg") {
    if (fileSize < 6 || bytes.length < 6 || bytes[3] === 0 || bytes[3] === 0xff || bytes[3] === 0xd9) return false;
    const segmentLength = (bytes[4] << 8) | bytes[5];
    return segmentLength >= 2 && fileSize >= segmentLength + 4;
  }
  if (type === "image/png") {
    return (
      fileSize >= 45 &&
      bytes.length >= 33 &&
      readBigEndian(bytes, 8) === 13 &&
      ascii(bytes, 12, "IHDR") &&
      readBigEndian(bytes, 16) > 0 &&
      readBigEndian(bytes, 20) > 0
    );
  }
  if (type === "image/webp") {
    if (fileSize < 20 || bytes.length < 20) return false;
    const riffSize = readLittleEndian(bytes, 4);
    const chunkSize = readLittleEndian(bytes, 16);
    return riffSize >= 12 && riffSize + 8 <= fileSize && chunkSize >= 0 && chunkSize + 20 <= fileSize;
  }
  return type === "application/pdf" && fileSize >= 8 && bytes.length >= 8;
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
  const header = new Uint8Array(await blob.slice(0, HEADER_BYTES).arrayBuffer());
  return validateUploadedContent(
    fileName,
    declaredMimeType,
    metadata.contentType,
    metadata.size,
    header,
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
  const contentType = metadata?.contentType?.trim().toLowerCase();
  if (!contentType || !allowedTypes.has(contentType) || metadata.size > MAX_STORED_FILE_BYTES) {
    fail("VALIDATION_FAILED", errorMessage);
  }
  return contentType;
}
