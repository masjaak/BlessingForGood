import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";

export async function validateStoredFile(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  allowedTypes: ReadonlySet<string>,
  errorMessage: string,
) {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata?.contentType || !allowedTypes.has(metadata.contentType) || metadata.size > 5_000_000) {
    fail("VALIDATION_FAILED", errorMessage);
  }
  return metadata.contentType;
}
