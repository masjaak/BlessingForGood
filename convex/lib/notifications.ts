import type { Doc, Id } from "../_generated/dataModel";
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

export type ActivityItem = {
  source: "notification" | "inbox";
  type: "system" | "message";
  timestamp: number;
  title: string;
  description: string;
  readAt: number | null;
  destination: string;
  sourceId: Id<"notifications">;
};

function safeDestination(destination: string) {
  return destination.startsWith("/") && !destination.startsWith("//") ? destination : "/";
}

function safeActivityDescription(body: string): string {
  return body.replace(/BFG-\d{6}-[A-Z0-9]{16,}/gi, "referensi invoice lama");
}

export function projectActivity(notices: Doc<"notifications">[]): ActivityItem[] {
  return notices
    .map((notice) => ({
      source: notice.surface,
      type: (notice.surface === "notification" ? "system" : "message") as ActivityItem["type"],
      timestamp: notice.createdAt,
      title: notice.title,
      description: safeActivityDescription(notice.body),
      readAt: notice.readAt ?? null,
      destination: safeDestination(notice.destination),
      sourceId: notice._id,
    }))
    .sort(
      (left, right) =>
        right.timestamp - left.timestamp ||
        (left.type === right.type ? 0 : left.type === "system" ? -1 : 1) ||
        String(left.sourceId).localeCompare(String(right.sourceId)),
    );
}

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
