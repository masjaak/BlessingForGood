"use client";

import { useQuery } from "convex/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { api } from "../../convex/_generated/api";
import { ActivityCenter } from "@/components/activity-center";
import { Button, LinkButton } from "@/components/ui";

export type WorkspaceActivityCounts = { activity?: number };

export type ActivityPanelGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  mode: "anchored" | "bounded" | "mobile";
};

export function calculateActivityPanelGeometry(
  viewport: { left?: number; top?: number; width: number; height: number },
  anchor: { top: number; bottom: number; right: number },
): ActivityPanelGeometry {
  const viewportLeft = viewport.left ?? 0;
  const viewportTop = viewport.top ?? 0;
  const gutter = 12;
  const gap = 8;
  const preferredWidth = 410;
  const mobileBottomReserve = 84;
  const isMobile = viewport.width <= 480;
  const width = Math.max(1, Math.min(preferredWidth, viewport.width - gutter * 2));
  const left = Math.min(
    Math.max(anchor.right - width, viewportLeft + gutter),
    viewportLeft + viewport.width - gutter - width,
  );
  const preferredTop = anchor.bottom + gap;
  const safeBottom = viewportTop + viewport.height - (isMobile ? mobileBottomReserve : gutter);
  const spaceBelow = safeBottom - preferredTop;
  const spaceAbove = anchor.top - gap - (viewportTop + gutter);
  const opensAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
  const availableHeight = Math.max(1, opensAbove ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(560, availableHeight);
  const preferredPanelTop = opensAbove ? anchor.top - gap - maxHeight : preferredTop;
  const minTop = viewportTop + gutter;
  const maxTop = Math.max(minTop, safeBottom - maxHeight);

  return {
    left,
    top: Math.min(Math.max(minTop, preferredPanelTop), maxTop),
    width,
    maxHeight,
    mode: isMobile ? "mobile" : viewport.width <= 900 ? "bounded" : "anchored",
  };
}

export const WorkspaceActivityContext = createContext<WorkspaceActivityCounts>({});

export function WorkspaceActivityProvider({
  enabled,
  workspace,
  children,
}: {
  enabled: boolean;
  workspace: "admin" | "customer";
  children: ReactNode;
}) {
  const activity = useQuery(api.notifications.unreadActivityCount, enabled ? { workspace } : "skip");

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
    <Button
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`Aktivitas${activity ? `, ${activity} belum dibaca` : ""}`}
      className="workspace-activity-trigger"
      onClick={onClick}
      ref={triggerRef}
      type="button"
      variant="secondary"
    >
      <ActivityIcon />
      <span>Aktivitas</span>
      {activity ? <span className="workspace-action-badge">{activity > 99 ? "99+" : activity}</span> : null}
    </Button>
  );
}

function ActivityPopover({ workspace, activity }: { workspace: "admin" | "customer"; activity?: number }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    if (!open) return;
    const observedTrigger = triggerRef.current;
    const observedRoot = activityRef.current;
    if (!observedTrigger || !observedRoot) return;

    function updatePanelGeometry() {
      const trigger = triggerRef.current;
      const activityRoot = activityRef.current;
      if (!trigger || !activityRoot) return;
      const viewport = window.visualViewport;
      const geometry = calculateActivityPanelGeometry(
        {
          left: viewport?.offsetLeft,
          top: viewport?.offsetTop,
          width: viewport?.width ?? window.innerWidth,
          height: viewport?.height ?? window.innerHeight,
        },
        trigger.getBoundingClientRect(),
      );
      const rootRect = activityRoot.getBoundingClientRect();
      const nextStyle: CSSProperties = {
        top: geometry.top - rootRect.top,
        left: geometry.left - rootRect.left,
        width: geometry.width,
        maxHeight: geometry.maxHeight,
        right: "auto",
        bottom: "auto",
      };
      setPanelStyle((current) =>
        current.top === nextStyle.top &&
        current.left === nextStyle.left &&
        current.width === nextStyle.width &&
        current.maxHeight === nextStyle.maxHeight
          ? current
          : nextStyle,
      );
    }

    updatePanelGeometry();
    document.addEventListener("scroll", updatePanelGeometry, true);
    window.addEventListener("resize", updatePanelGeometry);
    window.visualViewport?.addEventListener("resize", updatePanelGeometry);
    window.visualViewport?.addEventListener("scroll", updatePanelGeometry);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePanelGeometry);
    if (resizeObserver) {
      resizeObserver.observe(observedTrigger);
      resizeObserver.observe(observedRoot);
    }

    return () => {
      document.removeEventListener("scroll", updatePanelGeometry, true);
      window.removeEventListener("resize", updatePanelGeometry);
      window.visualViewport?.removeEventListener("resize", updatePanelGeometry);
      window.visualViewport?.removeEventListener("scroll", updatePanelGeometry);
      resizeObserver?.disconnect();
    };
  }, [open]);

  return (
    <div className="workspace-activity" ref={activityRef}>
      <ActivityTrigger
        activity={activity}
        onClick={() => setOpen((current) => !current)}
        open={open}
        triggerRef={triggerRef}
      />
      {open ? (
        <div
          aria-label="Aktivitas"
          className="workspace-activity-panel"
          ref={panelRef}
          role="dialog"
          style={panelStyle}
        >
          <ActivityCenter compact onClose={closePanel} unreadCount={activity} workspace={workspace} />
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
    <LinkButton
      aria-label="Aktivitas"
      className="workspace-activity-trigger"
      href={`${workspace === "admin" ? "/admin" : "/account"}/notifications`}
      variant="secondary"
    >
      <ActivityIcon />
      <span>Aktivitas</span>
    </LinkButton>
  );
}
