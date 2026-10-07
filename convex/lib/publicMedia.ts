import { R2 } from "@convex-dev/r2";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

const r2 = new R2(components.r2);
const R2_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

export function publicMediaR2Enabled(): boolean {
  return Boolean(
    process.env.R2_BUCKET &&
      process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );
}

function publicBaseUrl(): string | null {
  const value = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  return value || null;
}

function publicObjectUrl(key: string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export async function storePublicMedia(
  ctx: ActionCtx,
  blob: Blob,
  contentType: string,
): Promise<string | null> {
  if (!publicMediaR2Enabled()) return null;
  return r2.store(ctx, blob, {
    type: contentType,
    cacheControl: "public, max-age=31536000, immutable",
  });
}

export async function publicMediaUrl(
  ctx: QueryCtx,
  storageId?: Id<"_storage">,
  r2Key?: string,
): Promise<string | null> {
  if (r2Key && publicMediaR2Enabled()) {
    return publicObjectUrl(r2Key) ?? r2.getUrl(r2Key, { expiresIn: R2_URL_TTL_SECONDS });
  }
  return storageId ? ctx.storage.getUrl(storageId) : null;
}

export async function deletePublicMedia(
  ctx: MutationCtx | ActionCtx,
  storageId?: Id<"_storage">,
  r2Key?: string,
): Promise<void> {
  if (r2Key && publicMediaR2Enabled()) await r2.deleteObject(ctx, r2Key);
  if (storageId) await ctx.storage.delete(storageId);
}
