"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { ActivityCenter } from "@/components/activity-center";

type ActivitySurface = "notification" | "inbox";

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0v4l2 2.5h-15l2-2.5zM10 19h4" />
    </svg>
  );
}

function ActivityTrigger({
  open,
  total,
  onClick,
  triggerRef,
}: {
  open: boolean;
  total?: number;
  onClick: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`Aktivitas${total ? `, ${total} belum dibaca` : ""}`}
      className="workspace-activity-trigger"
      onClick={onClick}
      ref={triggerRef}
      type="button"
    >
      <ActivityIcon />
      <span>Aktivitas</span>
      {total ? <span className="workspace-action-badge">{total > 99 ? "99+" : total}</span> : null}
    </button>
  );
}

function ActivityPopover({
  workspace,
  notifications,
  inbox,
}: {
  workspace: "admin" | "customer";
  notifications?: number;
  inbox?: number;
}) {
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<ActivitySurface>("notification");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const total = typeof notifications === "number" && typeof inbox === "number" ? notifications + inbox : undefined;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="workspace-activity">
      <ActivityTrigger
        onClick={() => setOpen((current) => !current)}
        open={open}
        total={total}
        triggerRef={triggerRef}
      />
      {open ? (
        <div aria-label="Aktivitas" className="workspace-activity-panel" ref={panelRef} role="dialog">
          <ActivityCenter
            compact
            counts={{ notification: notifications, inbox }}
            onSurfaceChange={setSurface}
            surface={surface}
            workspace={workspace}
          />
        </div>
      ) : null}
    </div>
  );
}

function ConnectedActions({ workspace }: { workspace: "admin" | "customer" }) {
  const notifications = useQuery(api.notifications.unreadCount, { surface: "notification" });
  const inbox = useQuery(api.notifications.unreadCount, { surface: "inbox" });
  return <ActivityPopover inbox={inbox} notifications={notifications} workspace={workspace} />;
}

export function WorkspaceActions({ workspace, enabled }: { workspace: "admin" | "customer"; enabled: boolean }) {
  if (enabled) return <ConnectedActions workspace={workspace} />;
  return (
    <Link
      aria-label="Aktivitas"
      className="workspace-activity-trigger workspace-activity-link"
      href={`${workspace === "admin" ? "/admin" : "/account"}/notifications`}
    >
      <ActivityIcon />
      <span>Aktivitas</span>
    </Link>
  );
}
