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
  getFloatingBlessyMascotExclusionGap,
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
  const closeRef = useRef<HTMLDivElement | null>(null);
  const mascotRef = useRef<HTMLImageElement | null>(null);
  const [labelGeometry, setLabelGeometry] = useState(emptyGeometry);
  const { position, isDragging, dragHandlers } = useDraggableBlessy(enabled && !state.dismissed, rootRef);
  const message = state.currentMessage || navigation.message;
  const bubbleAlign = state.bubbleAlign || navigation.bubbleAlign;

  useLayoutEffect(() => {
    if (!enabled || !pose) return;
    const root = rootRef.current;
    const label = bubbleRef.current;
    const close = closeRef.current;
    const mascot = mascotRef.current;
    const homepageCta = pathname === "/" ? document.querySelector<HTMLElement>(".home-hero-actions") : null;
    if (!root || !label || !close || !mascot) return;

    const updateGeometry = () => {
      const rootRect = root.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      const mascotRect = mascot.getBoundingClientRect();
      const ctaRect = homepageCta?.getBoundingClientRect();
      const next = resolveFloatingBlessyBubble({
        anchor: {
          x: rootRect.left,
          y: rootRect.top,
          width: rootRect.width,
          height: rootRect.height,
        },
        mascot: {
          x: mascotRect.left,
          y: mascotRect.top,
          width: mascotRect.width,
          height: mascotRect.height,
        },
        bubble: { width: labelRect.width, height: labelRect.height },
        mascotGap: getFloatingBlessyMascotExclusionGap(window.innerWidth),
        close: { x: closeRect.left, y: closeRect.top, width: closeRect.width, height: closeRect.height },
        obstacle:
          ctaRect && ctaRect.width > 0 && ctaRect.height > 0
            ? { x: ctaRect.left, y: ctaRect.top, width: ctaRect.width, height: ctaRect.height }
            : undefined,
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
    observer?.observe(close);
    observer?.observe(mascot);
    if (homepageCta) observer?.observe(homepageCta);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("orientationchange", updateGeometry);
      observer?.disconnect();
    };
  }, [enabled, message, navigation.bubbleAlign, pathname, pose, position?.x, position?.y, state.bubbleMode]);

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
  const bubbleVisible =
    state.bubbleMode !== "hidden" && state.stage !== "bubble-exit" && state.stage !== "pose-transition";
  const bubbleClass =
    "floating-blessy__bubble " +
    (state.bubbleMode === "cta" ? "floating-blessy__bubble--cta" : "floating-blessy__bubble--context") +
    (bubbleVisible ? " is-visible" : "");

  return (
    <aside
      ref={rootRef}
      className="floating-blessy"
      style={positionStyle}
      data-pose-id={pose.id}
      data-navigation-context={state.navigationContext || navigation.navigationContext}
      data-semantic-context={state.semanticContext || navigation.semanticContext}
      data-stage={state.stage}
      data-testid="floating-blessy"
      data-dragging={isDragging ? "true" : "false"}
      data-transition-phase={state.transitionPhase || undefined}
      aria-label="Blessy"
    >
      <div className="floating-blessy__close-layer" ref={closeRef}>
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
      </div>
      <div
        ref={bubbleRef}
        className={bubbleClass}
        style={labelStyle}
        data-placement={labelGeometry.placement}
        data-align={state.bubbleMode === "cta" ? "center" : bubbleAlign}
        data-bubble-mode={state.bubbleMode}
        data-testid="floating-blessy-bubble"
        data-visible={bubbleVisible ? "true" : "false"}
        aria-hidden={!bubbleVisible}
        aria-live={state.bubbleMode === "context" && bubbleVisible ? "polite" : "off"}
      >
        <div className="floating-blessy__bubble-inner">
          <p>{state.bubbleMode === "cta" ? FLOATING_BLESSY_CTA : message}</p>
        </div>
      </div>
      <div className="floating-blessy__visual">
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
                ref={mascotRef}
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
