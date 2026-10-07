import type { Id } from "../../convex/_generated/dataModel";

export type BfgUploadPurpose = "book-cover" | "book-gallery" | "payment-proof" | "deposit-proof";
export type BfgUploadErrorCode = "UPLOAD_RATE_LIMITED" | "UPLOAD_REJECTED";
type ConvexToken = (options: { template?: "convex" }) => Promise<string | null>;

export class BfgUploadError extends Error {
  constructor(
    public readonly code: BfgUploadErrorCode,
    public readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "BfgUploadError";
  }
}

export function normalizeUploadMimeType(value: string): string {
  const normalized = value.split(";", 1)[0]?.trim().toLowerCase() || "";
  return normalized === "image/jpg" || normalized === "image/pjpeg" ? "image/jpeg" : normalized;
}

const PUBLIC_MEDIA_OPTIMIZE_ABOVE_BYTES = 750_000;
const PUBLIC_MEDIA_MAX_DIMENSION = 1_800;
const PUBLIC_MEDIA_WEBP_QUALITY = 0.82;

export async function optimizeBfgFileForUpload(file: File, purpose: BfgUploadPurpose): Promise<File> {
  if (
    (purpose !== "book-cover" && purpose !== "book-gallery") ||
    file.size <= PUBLIC_MEDIA_OPTIMIZE_ABOVE_BYTES ||
    !["image/jpeg", "image/png", "image/webp"].includes(normalizeUploadMimeType(file.type)) ||
    typeof createImageBitmap !== "function" ||
    typeof document === "undefined"
  ) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PUBLIC_MEDIA_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", PUBLIC_MEDIA_WEBP_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

function convexSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (configured) return configured;
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!cloudUrl) return null;
  try {
    const parsed = new URL(cloudUrl);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".convex.cloud")) return null;
    parsed.hostname = `${parsed.hostname.slice(0, -".convex.cloud".length)}.convex.site`;
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function uploadBfgFile(
  file: File,
  purpose: BfgUploadPurpose,
  getToken: ConvexToken,
  sessionClaims?: unknown,
): Promise<Id<"_storage">> {
  const uploadFile = await optimizeBfgFileForUpload(file, purpose);
  const siteUrl = convexSiteUrl();
  if (!siteUrl) throw new BfgUploadError("UPLOAD_REJECTED");
  const nativeConvexSession =
    typeof sessionClaims === "object" &&
    sessionClaims !== null &&
    "aud" in sessionClaims &&
    sessionClaims.aud === "convex";
  const token = await getToken(nativeConvexSession ? {} : { template: "convex" });
  if (!token) throw new BfgUploadError("UPLOAD_REJECTED");
  const url = new URL("/bfg/upload", siteUrl);
  url.searchParams.set("purpose", purpose);
  url.searchParams.set("fileName", uploadFile.name);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": normalizeUploadMimeType(uploadFile.type),
      "X-BFG-File-Size": String(uploadFile.size),
    },
    body: uploadFile,
  });
  let result: { code?: string; retryAfterSeconds?: number; storageId?: string } = {};
  try {
    result = (await response.json()) as typeof result;
  } catch {
    // The status still determines the generic rejection below.
  }
  if (response.status === 429 && result.code === "RATE_LIMITED") {
    const headerRetryAfter = Number(response.headers.get("Retry-After"));
    const retryAfterSeconds =
      typeof result.retryAfterSeconds === "number" && Number.isFinite(result.retryAfterSeconds)
        ? Math.max(1, Math.ceil(result.retryAfterSeconds))
        : Number.isFinite(headerRetryAfter) && headerRetryAfter > 0
          ? Math.ceil(headerRetryAfter)
          : undefined;
    throw new BfgUploadError("UPLOAD_RATE_LIMITED", retryAfterSeconds);
  }
  if (!response.ok || !result.storageId) throw new BfgUploadError("UPLOAD_REJECTED");
  return result.storageId as Id<"_storage">;
}
