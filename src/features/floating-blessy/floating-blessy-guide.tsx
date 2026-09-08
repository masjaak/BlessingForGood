"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui";
import {
  FLOATING_BLESSY_CTA,
  FLOATING_BLESSY_POSES,
  FLOATING_BLESSY_WHATSAPP_LABEL,
  FLOATING_BLESSY_WHATSAPP_URL,
} from "./floating-blessy.config";
import { findFloatingBlessyPose, resolveFloatingBlessyNavigation } from "./floating-blessy-context";
import {
  getFloatingBlessyBounds,
  resolveFloatingBlessyBubble,
  type FloatingBlessyBubblePlacement,
} from "./floating-blessy-position";
import { useDraggableBlessy } from "./use-draggable-blessy";
import { useFloatingBlessy } from "./use-floating-blessy";

const excludedRoutes = ["/admin", "/sign-in", "/sign-up", "/accept-invitation"];
const emptyGeometry = { placement: "top-left" as FloatingBlessyBubblePlacement, left: 0, top: 0 };

function isExcludedRoute(pathname: string) {
  return excludedRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function FloatingBlessyGuide() {
  const pathname = usePathname() || "/";
  const enabled = !isExcludedRoute(pathname);
  const navigation = resolveFloatingBlessyNavigation(pathname);
  const state = useFloatingBlessy(enabled, navigation);
  const pose = state.currentPoseId ? findFloatingBlessyPose(state.currentPoseId) : null;
  const rootRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const [labelGeometry, setLabelGeometry] = useState(emptyGeometry);
  const { position, isDragging, dragHandlers } = useDraggableBlessy(enabled && !state.dismissed, rootRef);

  useLayoutEffect(() => {
    if (!enabled || !pose) return;
    const root = rootRef.current;
    const label = state.bubbleVisible ? bubbleRef.current : ctaRef.current;
    if (!root || !label) return;

    const updateGeometry = () => {
      const rootRect = root.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const next = resolveFloatingBlessyBubble({
        anchor: {
          x: rootRect.left,
          y: rootRect.top,
          width: rootRect.width,
          height: rootRect.height,
        },
        bubble: { width: labelRect.width, height: labelRect.height },
        bounds: getFloatingBlessyBounds(),
      });
      const local = { placement: next.placement, left: next.left - rootRect.left, top: next.top - rootRect.top };
      setLabelGeometry((previous) =>
        previous.placement === local.placement && previous.left === local.left && previous.top === local.top
          ? previous
          : local,
      );
    };

    updateGeometry();
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("orientationchange", updateGeometry);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateGeometry);
    observer?.observe(root);
    observer?.observe(label);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("orientationchange", updateGeometry);
      observer?.disconnect();
    };
  }, [enabled, pose, position?.x, position?.y, state.bubbleVisible]);

  useLayoutEffect(() => {
    if (!enabled) return;
    for (const nextPose of FLOATING_BLESSY_POSES) {
      const image = new window.Image();
      image.decoding = "async";
      image.src = nextPose.asset.src;
    }
  }, [enabled]);

  if (!enabled || state.dismissed || !pose) return null;

  const positionStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: "auto", bottom: "auto" }
    : undefined;
  const labelStyle = { left: `${labelGeometry.left}px`, top: `${labelGeometry.top}px` };

  return (
    <aside
      ref={rootRef}
      className="floating-blessy"
      style={positionStyle}
      data-pose-id={pose.id}
      data-navigation-context={state.navigationContext || navigation.navigationContext}
      data-stage={state.stage}
      data-testid="floating-blessy"
      data-dragging={isDragging ? "true" : "false"}
      data-transition-phase={state.transitionPhase || undefined}
      aria-label="Blessy"
    >
      <div
        ref={bubbleRef}
        className={"floating-blessy__bubble" + (state.bubbleVisible ? " is-visible" : "")}
        style={labelStyle}
        data-placement={labelGeometry.placement}
        data-testid="floating-blessy-bubble"
        data-visible={state.bubbleVisible ? "true" : "false"}
        aria-hidden={!state.bubbleVisible}
        aria-live={state.bubbleVisible ? "polite" : "off"}
      >
        <p>{pose.message}</p>
      </div>
      <div
        ref={ctaRef}
        className={"floating-blessy__cta" + (!state.bubbleVisible ? " is-visible" : "")}
        style={labelStyle}
        data-placement={labelGeometry.placement}
        data-testid="floating-blessy-cta"
        data-visible={!state.bubbleVisible ? "true" : "false"}
        aria-hidden={state.bubbleVisible}
      >
        <p>{FLOATING_BLESSY_CTA}</p>
      </div>
      <div className="floating-blessy__visual">
        <IconButton
          className="floating-blessy__close"
          type="button"
          aria-label="Tutup Blessy"
          onClick={state.onDismiss}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </IconButton>
        <a
          className={"floating-blessy__mascot" + (isDragging ? " is-dragging" : "")}
          href={FLOATING_BLESSY_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={FLOATING_BLESSY_WHATSAPP_LABEL}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          {...dragHandlers}
        >
          <div
            className={["floating-blessy__pose", state.transitionPhase ? "is-" + state.transitionPhase : ""]
              .filter(Boolean)
              .join(" ")}
            data-testid="floating-blessy-pose"
          >
            <div className="floating-blessy__idle">
              <Image
                src={pose.asset.src}
                alt=""
                width={pose.asset.width}
                height={pose.asset.height}
                className="floating-blessy__image"
                draggable={false}
                priority={state.currentPoseId === "greeting"}
                sizes="(max-width: 800px) 30vw, 152px"
              />
            </div>
          </div>
        </a>
      </div>
    </aside>
  );
}
