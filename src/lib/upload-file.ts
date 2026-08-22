import type { Id } from "../../convex/_generated/dataModel";

export type BfgUploadPurpose = "book-cover" | "book-gallery" | "payment-proof" | "deposit-proof";
type ConvexToken = (options: { template: "convex" }) => Promise<string | null>;

export async function uploadBfgFile(
  file: File,
  purpose: BfgUploadPurpose,
  getToken: ConvexToken,
): Promise<Id<"_storage">> {
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!siteUrl) throw new Error("UPLOAD_REJECTED");
  const token = await getToken({ template: "convex" });
  if (!token) throw new Error("UPLOAD_REJECTED");
  const url = new URL("/bfg/upload", siteUrl);
  url.searchParams.set("purpose", purpose);
  url.searchParams.set("fileName", file.name);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type,
      "X-BFG-File-Size": String(file.size),
    },
    body: file,
  });
  const result = (await response.json()) as { storageId?: string };
  if (!response.ok || !result.storageId) throw new Error("UPLOAD_REJECTED");
  return result.storageId as Id<"_storage">;
}
