"use client";

import { useCallback, useEffect, useReducer } from "react";
import { FLOATING_BLESSY_POSES, FLOATING_BLESSY_TIMING } from "./floating-blessy.config";

export type FloatingBlessyStage =
  "boot-delay" | "visible-message" | "bubble-exit" | "idle-wait" | "pose-transition" | "complete-idle" | "dismissed";

type PoseTransitionPhase = "exit" | "enter" | null;

type FloatingBlessyState = {
  currentPoseIndex: number | null;
  bubbleVisible: boolean;
  stage: FloatingBlessyStage;
  transitionPhase: PoseTransitionPhase;
  dismissed: boolean;
  sequenceComplete: boolean;
};

type FloatingBlessyAction =
  | { type: "show-greeting" }
  | { type: "hide-bubble" }
  | { type: "finish-bubble-exit" }
  | { type: "start-pose-transition" }
  | { type: "enter-next-pose" }
  | { type: "show-next-message" }
  | { type: "dismiss" };

const initialState: FloatingBlessyState = {
  currentPoseIndex: null,
  bubbleVisible: false,
  stage: "boot-delay",
  transitionPhase: null,
  dismissed: false,
  sequenceComplete: false,
};

function reducer(state: FloatingBlessyState, action: FloatingBlessyAction): FloatingBlessyState {
  if (state.dismissed && action.type !== "dismiss") return state;

  switch (action.type) {
    case "show-greeting":
      return state.stage === "boot-delay"
        ? { ...state, currentPoseIndex: 0, bubbleVisible: true, stage: "visible-message" }
        : state;
    case "hide-bubble":
      return state.stage === "visible-message" ? { ...state, bubbleVisible: false, stage: "bubble-exit" } : state;
    case "finish-bubble-exit":
      if (state.stage !== "bubble-exit") return state;
      return state.currentPoseIndex === FLOATING_BLESSY_POSES.length - 1
        ? { ...state, stage: "complete-idle", sequenceComplete: true }
        : { ...state, stage: "idle-wait" };
    case "start-pose-transition":
      return state.stage === "idle-wait" && state.currentPoseIndex !== FLOATING_BLESSY_POSES.length - 1
        ? { ...state, stage: "pose-transition", transitionPhase: "exit" }
        : state;
    case "enter-next-pose":
      if (state.stage !== "pose-transition" || state.transitionPhase !== "exit" || state.currentPoseIndex === null) {
        return state;
      }
      return {
        ...state,
        currentPoseIndex: state.currentPoseIndex + 1,
        transitionPhase: "enter",
      };
    case "show-next-message":
      return state.stage === "pose-transition" && state.transitionPhase === "enter"
        ? { ...state, bubbleVisible: true, stage: "visible-message", transitionPhase: null }
        : state;
    case "dismiss":
      return { ...state, bubbleVisible: false, stage: "dismissed", transitionPhase: null, dismissed: true };
  }
}

export function useFloatingBlessy(enabled: boolean) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!enabled || state.dismissed) return;

    let delay: number | undefined;
    let action: FloatingBlessyAction | undefined;
    switch (state.stage) {
      case "boot-delay":
        delay = FLOATING_BLESSY_TIMING.initialDelayMs;
        action = { type: "show-greeting" };
        break;
      case "visible-message":
        delay = FLOATING_BLESSY_TIMING.bubbleVisibleMs;
        action = { type: "hide-bubble" };
        break;
      case "bubble-exit":
        delay = FLOATING_BLESSY_TIMING.bubbleTransitionMs;
        action = { type: "finish-bubble-exit" };
        break;
      case "idle-wait":
        delay = FLOATING_BLESSY_TIMING.betweenMessagesMs;
        action = { type: "start-pose-transition" };
        break;
      case "pose-transition":
        delay =
          state.transitionPhase === "exit" ? FLOATING_BLESSY_TIMING.poseExitMs : FLOATING_BLESSY_TIMING.poseEnterMs;
        action = state.transitionPhase === "exit" ? { type: "enter-next-pose" } : { type: "show-next-message" };
        break;
      case "complete-idle":
      case "dismissed":
        return;
    }

    const timer = window.setTimeout(() => dispatch(action!), delay);
    return () => window.clearTimeout(timer);
  }, [enabled, state.dismissed, state.stage, state.transitionPhase]);

  const dismiss = useCallback(() => dispatch({ type: "dismiss" }), []);
  return { ...state, onDismiss: dismiss };
}
