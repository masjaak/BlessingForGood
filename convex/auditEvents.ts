import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { requirePermission } from "./lib/auth";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "audit.read");
    const page = await ctx.db
      .query("auditEvents")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (event) => {
          const actor = await ctx.db.get(event.actorUserId);
          return {
            auditEventId: event._id,
            actorName: actor?.displayNameSnapshot || actor?.emailSnapshot || "Admin",
            action: event.action,
            targetType: event.targetType,
            targetId: event.targetId,
            safeMetadata: event.safeMetadata ?? null,
            createdAt: event.createdAt,
          };
        }),
      ),
    };
  },
});
