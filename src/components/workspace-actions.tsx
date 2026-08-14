"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function ActionIcon({ type }: { type: "notification" | "inbox" }) {
  return type === "notification" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0v4l2 2.5h-15l2-2.5zM10 19h4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v14H4zM4 7l8 6 8-6" />
    </svg>
  );
}

function ActionLinks({
  workspace,
  notifications,
  inbox,
}: {
  workspace: "admin" | "customer";
  notifications?: number;
  inbox?: number;
}) {
  const base = workspace === "admin" ? "/admin" : "/account";
  return (
    <div className="workspace-actions" aria-label="Pusat aktivitas">
      {(
        [
          ["notification", "Notifikasi", notifications],
          ["inbox", "Inbox", inbox],
        ] as const
      ).map(([type, label, count]) => (
        <Link
          key={type}
          href={`${base}/${type === "notification" ? "notifications" : "inbox"}`}
          aria-label={`${label}${count ? `, ${count} belum dibaca` : ""}`}
        >
          <ActionIcon type={type} />
          {count ? <span className="workspace-action-badge">{count > 99 ? "99+" : count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

function ConnectedActions({ workspace }: { workspace: "admin" | "customer" }) {
  const notifications = useQuery(api.notifications.unreadCount, { surface: "notification" });
  const inbox = useQuery(api.notifications.unreadCount, { surface: "inbox" });
  return <ActionLinks workspace={workspace} notifications={notifications} inbox={inbox} />;
}

export function WorkspaceActions({ workspace, enabled }: { workspace: "admin" | "customer"; enabled: boolean }) {
  return enabled ? <ConnectedActions workspace={workspace} /> : <ActionLinks workspace={workspace} />;
}
