"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { ActivityCenter } from "@/components/activity-center";

export type WorkspaceActivityCounts = { activity?: number };

export const WorkspaceActivityContext = createContext<WorkspaceActivityCounts>({});

export function WorkspaceActivityProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const activity = useQuery(api.notifications.unreadActivityCount, enabled ? {} : "skip");

  return <WorkspaceActivityContext.Provider value={{ activity }}>{children}</WorkspaceActivityContext.Provider>;
}

export function useWorkspaceActivity() {
  return useContext(WorkspaceActivityContext);
}

export function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0v4l2 2.5h-15l2-2.5zM10 19h4" />
    </svg>
  );
}

function ActivityTrigger({
  open,
  activity,
  onClick,
  triggerRef,
}: {
  open: boolean;
  activity?: number;
  onClick: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`Aktivitas${activity ? `, ${activity} belum dibaca` : ""}`}
      className="workspace-activity-trigger"
      onClick={onClick}
      ref={triggerRef}
      type="button"
    >
      <ActivityIcon />
      <span>Aktivitas</span>
      {activity ? <span className="workspace-action-badge">{activity > 99 ? "99+" : activity}</span> : null}
    </button>
  );
}

function ActivityPopover({ workspace, activity }: { workspace: "admin" | "customer"; activity?: number }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        closePanel();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
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
        activity={activity}
        onClick={() => setOpen((current) => !current)}
        open={open}
        triggerRef={triggerRef}
      />
      {open ? (
        <div aria-label="Aktivitas" className="workspace-activity-panel" ref={panelRef} role="dialog">
          <ActivityCenter compact onClose={closePanel} workspace={workspace} />
        </div>
      ) : null}
    </div>
  );
}

function ConnectedActions({ workspace }: { workspace: "admin" | "customer" }) {
  const { activity } = useWorkspaceActivity();
  return <ActivityPopover activity={activity} workspace={workspace} />;
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
