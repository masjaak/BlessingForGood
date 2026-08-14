import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type Notice = {
  surface: "notification" | "inbox";
  eventType: string;
  title: string;
  body: string;
  destination: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

export function notifyUser(ctx: MutationCtx, recipientUserId: Id<"appUsers">, notice: Notice) {
  return ctx.db.insert("notifications", { recipientUserId, ...notice, createdAt: Date.now() });
}

export async function notifyAdmins(ctx: MutationCtx, notice: Notice) {
  const recipients = (
    await Promise.all(
      (["owner", "admin"] as const).map((role) =>
        ctx.db
          .query("appUsers")
          .withIndex("by_role_and_status", (query) => query.eq("role", role).eq("status", "active"))
          .take(100),
      ),
    )
  ).flat();
  await Promise.all(recipients.map((recipient) => notifyUser(ctx, recipient._id, notice)));
}
