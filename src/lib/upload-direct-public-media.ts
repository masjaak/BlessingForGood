import type { Id } from "../../convex/_generated/dataModel";
import { optimizeBfgFileForUpload, normalizeUploadMimeType } from "@/lib/upload-file";

export type DirectMediaTarget = {
  bookId?: Id<"books">;
  listingId?: Id<"readyStockListings">;
  purpose: "cover" | "gallery";
};

export type PreparedDirectUpload = { key: string; url: string };
export type DirectMediaInput = DirectMediaTarget & {
  key: string;
  fileName: string;
  mimeType: string;
  altText?: string;
};

export async function uploadDirectPublicMedia(
  originalFile: File,
  target: DirectMediaTarget,
  prepare: (args: DirectMediaTarget) => Promise<PreparedDirectUpload>,
  attach: (args: DirectMediaInput) => Promise<string>,
  altText?: string,
): Promise<string> {
  const uploadFile = await optimizeBfgFileForUpload(
    originalFile,
    target.purpose === "cover" ? "book-cover" : "book-gallery",
  );
  const mimeType = normalizeUploadMimeType(uploadFile.type);
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType) || uploadFile.size > 5_000_000) {
    throw new Error("File gambar tidak sesuai format atau melebihi 5 MB");
  }
  const { url, key } = await prepare(target);
  const upload = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: uploadFile,
  });
  if (!upload.ok) throw new Error(`R2 direct upload rejected (${upload.status})`);
  return attach({
    ...target,
    key,
    fileName: uploadFile.name,
    mimeType,
    altText,
  });
}
