import type { Id } from "../../convex/_generated/dataModel";
import { optimizeBfgFileForUpload, normalizeUploadMimeType } from "@/lib/upload-file";

export class DirectR2TransportError extends Error {
  constructor() {
    super("DIRECT_R2_TRANSPORT_FAILED");
    this.name = "DirectR2TransportError";
  }
}

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
  let prepared: PreparedDirectUpload;
  try {
    prepared = await prepare(target);
  } catch (error) {
    if (String(error).includes("R2 unavailable")) throw new DirectR2TransportError();
    throw error;
  }
  const { url, key } = prepared;
  let upload: Response;
  try {
    upload = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: uploadFile,
    });
  } catch {
    throw new DirectR2TransportError();
  }
  if (!upload.ok) throw new DirectR2TransportError();
  return attach({
    ...target,
    key,
    fileName: uploadFile.name,
    mimeType,
    altText,
  });
}
