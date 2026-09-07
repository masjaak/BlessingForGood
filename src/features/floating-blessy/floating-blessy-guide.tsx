"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { IconButton } from "@/components/ui";
import { FLOATING_BLESSY_POSES } from "./floating-blessy.config";
import { useFloatingBlessy } from "./use-floating-blessy";

const excludedRoutes = ["/admin", "/sign-in", "/sign-up", "/accept-invitation"];

function isExcludedRoute(pathname: string) {
  return excludedRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function FloatingBlessyGuide() {
  const pathname = usePathname() || "";
  const enabled = Boolean(pathname) && !isExcludedRoute(pathname);
  const state = useFloatingBlessy(enabled);
  const pose = state.currentPoseIndex === null ? null : FLOATING_BLESSY_POSES[state.currentPoseIndex];

  useEffect(() => {
    if (!enabled) return;
    for (const nextPose of FLOATING_BLESSY_POSES.slice(1)) {
      const image = new window.Image();
      image.decoding = "async";
      image.src = nextPose.asset.src;
    }
  }, [enabled]);

  if (!enabled || state.dismissed || !pose) return null;

  return (
    <aside
      className="floating-blessy"
      data-pose-id={pose.id}
      data-stage={state.stage}
      data-sequence-complete={state.sequenceComplete ? "true" : "false"}
      data-testid="floating-blessy"
      data-transition-phase={state.transitionPhase || undefined}
      aria-label="Blessy"
    >
      <div
        className={"floating-blessy__bubble" + (state.bubbleVisible ? " is-visible" : "")}
        data-testid="floating-blessy-bubble"
        data-visible={state.bubbleVisible ? "true" : "false"}
        aria-hidden={!state.bubbleVisible}
        aria-live="polite"
      >
        <p>{pose.message}</p>
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
              priority={state.currentPoseIndex === 0}
              sizes="(max-width: 800px) 30vw, 152px"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
