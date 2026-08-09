import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function recordAudit(
  ctx: MutationCtx,
  actorUserId: Id<"appUsers">,
  action: string,
  targetType: string,
  targetId: string,
  safeMetadata?: Record<string, string>,
) {
  return ctx.db.insert("auditEvents", {
    actorUserId,
    action,
    targetType,
    targetId,
    createdAt: Date.now(),
    safeMetadata,
  });
}
