import type { Id } from "../../convex/_generated/dataModel";

export type BfgUploadPurpose = "book-cover" | "book-gallery" | "payment-proof" | "deposit-proof";
type ConvexToken = (options: { template?: "convex" }) => Promise<string | null>;

export function normalizeUploadMimeType(value: string): string {
  const normalized = value.split(";", 1)[0]?.trim().toLowerCase() || "";
  return normalized === "image/jpg" || normalized === "image/pjpeg" ? "image/jpeg" : normalized;
}

export async function uploadBfgFile(
  file: File,
  purpose: BfgUploadPurpose,
  getToken: ConvexToken,
  sessionClaims?: unknown,
): Promise<Id<"_storage">> {
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
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
