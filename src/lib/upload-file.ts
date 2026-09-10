import type { Id } from "../../convex/_generated/dataModel";

export type BfgUploadPurpose = "book-cover" | "book-gallery" | "payment-proof" | "deposit-proof";
type ConvexToken = (options: { template?: "convex" }) => Promise<string | null>;

export function normalizeUploadMimeType(value: string): string {
  const normalized = value.split(";", 1)[0]?.trim().toLowerCase() || "";
  return normalized === "image/jpg" || normalized === "image/pjpeg" ? "image/jpeg" : normalized;
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
  const siteUrl = convexSiteUrl();
  if (!siteUrl) throw new Error("UPLOAD_REJECTED");
  const nativeConvexSession =
    typeof sessionClaims === "object" &&
    sessionClaims !== null &&
    "aud" in sessionClaims &&
    sessionClaims.aud === "convex";
  const token = await getToken(nativeConvexSession ? {} : { template: "convex" });
  if (!token) throw new Error("UPLOAD_REJECTED");
  const url = new URL("/bfg/upload", siteUrl);
  url.searchParams.set("purpose", purpose);
  url.searchParams.set("fileName", file.name);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": normalizeUploadMimeType(file.type),
      "X-BFG-File-Size": String(file.size),
    },
    body: file,
  });
  const result = (await response.json()) as { storageId?: string };
  if (!response.ok || !result.storageId) throw new Error("UPLOAD_REJECTED");
  return result.storageId as Id<"_storage">;
}
