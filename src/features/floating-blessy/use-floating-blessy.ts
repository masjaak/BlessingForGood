"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { FLOATING_BLESSY_TIMING } from "./floating-blessy.config";
import type { FloatingBlessyNavigation } from "./floating-blessy-context";

export type FloatingBlessyStage =
  "boot-delay" | "visible-message" | "bubble-exit" | "idle" | "pose-transition" | "dismissed";

type PoseTransitionPhase = "exit" | "enter" | null;

type FloatingBlessyState = {
  navigationContext: FloatingBlessyNavigation["navigationContext"] | null;
  currentPoseId: FloatingBlessyNavigation["poseId"] | null;
  pendingNavigation: FloatingBlessyNavigation | null;
  bubbleVisible: boolean;
  stage: FloatingBlessyStage;
  transitionPhase: PoseTransitionPhase;
  dismissed: boolean;
};

type FloatingBlessyAction =
  | { type: "show-initial"; navigation: FloatingBlessyNavigation }
  | { type: "hide-bubble" }
  | { type: "finish-bubble-exit" }
  | { type: "start-context-transition"; navigation: FloatingBlessyNavigation }
  | { type: "enter-context" }
  | { type: "show-context-message" }
  | { type: "dismiss" };

const initialState: FloatingBlessyState = {
  navigationContext: null,
  currentPoseId: null,
  pendingNavigation: null,
  bubbleVisible: false,
  stage: "boot-delay",
  transitionPhase: null,
  dismissed: false,
};

function reducer(state: FloatingBlessyState, action: FloatingBlessyAction): FloatingBlessyState {
  if (state.dismissed && action.type !== "dismiss") return state;

  switch (action.type) {
    case "show-initial":
      return state.stage === "boot-delay"
        ? {
            ...state,
            navigationContext: action.navigation.navigationContext,
            currentPoseId: action.navigation.poseId,
            bubbleVisible: true,
            stage: "visible-message",
          }
        : state;
    case "hide-bubble":
      return state.stage === "visible-message" ? { ...state, bubbleVisible: false, stage: "bubble-exit" } : state;
    case "finish-bubble-exit":
      return state.stage === "bubble-exit" ? { ...state, stage: "idle" } : state;
    case "start-context-transition":
      if (
        state.currentPoseId === null ||
        (state.navigationContext === action.navigation.navigationContext && state.pendingNavigation === null) ||
        state.pendingNavigation?.navigationContext === action.navigation.navigationContext
      ) {
        return state;
      }
      return {
        ...state,
        pendingNavigation: action.navigation,
        bubbleVisible: false,
        stage: "pose-transition",
        transitionPhase: "exit",
      };
    case "enter-context":
      if (state.stage !== "pose-transition" || state.transitionPhase !== "exit" || !state.pendingNavigation) {
        return state;
      }
      return {
        ...state,
        navigationContext: state.pendingNavigation.navigationContext,
        currentPoseId: state.pendingNavigation.poseId,
        pendingNavigation: null,
        transitionPhase: "enter",
      };
    case "show-context-message":
      return state.stage === "pose-transition" && state.transitionPhase === "enter"
        ? { ...state, bubbleVisible: true, stage: "visible-message", transitionPhase: null }
        : state;
    case "dismiss":
      return { ...state, bubbleVisible: false, stage: "dismissed", transitionPhase: null, dismissed: true };
  }
}

export function useFloatingBlessy(enabled: boolean, navigation: FloatingBlessyNavigation) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigationRef = useRef(navigation);
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  useEffect(() => {
    if (!enabled || state.dismissed) return;

    let delay: number | undefined;
    let action: FloatingBlessyAction | undefined;
    switch (state.stage) {
      case "boot-delay":
        delay = FLOATING_BLESSY_TIMING.initialDelayMs;
        action = { type: "show-initial", navigation: navigationRef.current };
        break;
      case "visible-message":
        delay = FLOATING_BLESSY_TIMING.bubbleVisibleMs;
        action = { type: "hide-bubble" };
        break;
      case "bubble-exit":
        delay = FLOATING_BLESSY_TIMING.bubbleTransitionMs;
        action = { type: "finish-bubble-exit" };
        break;
      case "pose-transition":
        delay =
          state.transitionPhase === "exit" ? FLOATING_BLESSY_TIMING.poseExitMs : FLOATING_BLESSY_TIMING.poseEnterMs;
        action = state.transitionPhase === "exit" ? { type: "enter-context" } : { type: "show-context-message" };
        break;
      case "idle":
      case "dismissed":
        return;
    }

    const timer = window.setTimeout(() => dispatch(action!), delay);
    return () => window.clearTimeout(timer);
  }, [enabled, state.dismissed, state.stage, state.transitionPhase]);

  useEffect(() => {
    if (
      !enabled ||
      state.dismissed ||
      state.currentPoseId === null ||
      state.navigationContext === navigation.navigationContext ||
      state.pendingNavigation?.navigationContext === navigation.navigationContext
    ) {
      return;
    }

    dispatch({
      type: "start-context-transition",
      navigation: { navigationContext: navigation.navigationContext, poseId: navigation.poseId },
    });
  }, [
    enabled,
    navigation.navigationContext,
    navigation.poseId,
    state.currentPoseId,
    state.dismissed,
    state.navigationContext,
    state.pendingNavigation?.navigationContext,
  ]);

  const dismiss = useCallback(() => dispatch({ type: "dismiss" }), []);
  return { ...state, onDismiss: dismiss };
}
