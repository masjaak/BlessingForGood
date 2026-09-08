"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { FLOATING_BLESSY_TIMING } from "./floating-blessy.config";
import type { FloatingBlessyNavigation } from "./floating-blessy-context";

export type FloatingBlessyStage =
  "boot-delay" | "visible-message" | "bubble-exit" | "idle" | "pose-transition" | "dismissed";
export type FloatingBlessyBubbleMode = "context" | "cta" | "hidden";

type PoseTransitionPhase = "exit" | "enter" | null;

type FloatingBlessyState = {
  navigationContext: FloatingBlessyNavigation["navigationContext"] | null;
  semanticContext: FloatingBlessyNavigation["semanticContext"] | null;
  currentPoseId: FloatingBlessyNavigation["poseId"] | null;
  currentMessage: string | null;
  bubbleAlign: FloatingBlessyNavigation["bubbleAlign"] | null;
  pendingNavigation: FloatingBlessyNavigation | null;
  bubbleMode: FloatingBlessyBubbleMode;
  bubbleVersion: number;
  transitionEpoch: number;
  stage: FloatingBlessyStage;
  transitionPhase: PoseTransitionPhase;
  dismissed: boolean;
};

type FloatingBlessyAction =
  | { type: "show-initial"; navigation: FloatingBlessyNavigation }
  | { type: "hide-bubble"; epoch: number }
  | { type: "finish-bubble-exit"; epoch: number }
  | { type: "start-context-transition"; navigation: FloatingBlessyNavigation }
  | { type: "enter-context"; epoch: number }
  | { type: "show-context-message"; epoch: number }
  | { type: "dismiss" };

const initialState: FloatingBlessyState = {
  navigationContext: null,
  semanticContext: null,
  currentPoseId: null,
  currentMessage: null,
  bubbleAlign: null,
  pendingNavigation: null,
  bubbleMode: "hidden",
  bubbleVersion: 0,
  transitionEpoch: 0,
  stage: "boot-delay",
  transitionPhase: null,
  dismissed: false,
};

function reducer(state: FloatingBlessyState, action: FloatingBlessyAction): FloatingBlessyState {
  if (state.dismissed && action.type !== "dismiss") return state;
  if ("epoch" in action && action.epoch !== state.transitionEpoch) return state;

  switch (action.type) {
    case "show-initial":
      return state.stage === "boot-delay"
        ? {
            ...state,
            navigationContext: action.navigation.navigationContext,
            semanticContext: action.navigation.semanticContext,
            currentPoseId: action.navigation.poseId,
            currentMessage: action.navigation.message,
            bubbleAlign: action.navigation.bubbleAlign,
            bubbleMode: "context",
            stage: "visible-message",
          }
        : state;
    case "hide-bubble":
      return state.stage === "visible-message" ? { ...state, stage: "bubble-exit" } : state;
    case "finish-bubble-exit":
      if (state.stage !== "bubble-exit") return state;
      if (!state.pendingNavigation) {
        return { ...state, bubbleMode: "cta", transitionEpoch: state.transitionEpoch + 1, stage: "idle" };
      }
      return state.pendingNavigation.poseId === state.currentPoseId
        ? commitContext(state, state.pendingNavigation)
        : {
            ...state,
            transitionEpoch: state.transitionEpoch + 1,
            stage: "pose-transition",
            transitionPhase: "exit",
          };
    case "start-context-transition":
      if (
        state.currentPoseId === null ||
        (state.navigationContext === action.navigation.navigationContext && state.pendingNavigation === null) ||
        state.pendingNavigation?.navigationContext === action.navigation.navigationContext
      ) {
        return state;
      }
      if (state.stage === "bubble-exit" || state.stage === "pose-transition") {
        return {
          ...state,
          pendingNavigation: action.navigation,
          transitionEpoch: state.transitionEpoch + 1,
        };
      }
      if (state.currentPoseId === action.navigation.poseId) {
        return {
          ...state,
          pendingNavigation: action.navigation,
          transitionEpoch: state.transitionEpoch + 1,
          stage: "bubble-exit",
        };
      }
      return {
        ...state,
        pendingNavigation: action.navigation,
        transitionEpoch: state.transitionEpoch + 1,
        stage: "pose-transition",
        transitionPhase: "exit",
      };
    case "enter-context":
      if (state.stage !== "pose-transition" || state.transitionPhase !== "exit" || !state.pendingNavigation) {
        return state;
      }
      if (state.currentPoseId === state.pendingNavigation.poseId) return commitContext(state, state.pendingNavigation);
      return {
        ...state,
        navigationContext: state.pendingNavigation.navigationContext,
        semanticContext: state.pendingNavigation.semanticContext,
        currentPoseId: state.pendingNavigation.poseId,
        currentMessage: state.pendingNavigation.message,
        bubbleAlign: state.pendingNavigation.bubbleAlign,
        pendingNavigation: null,
        bubbleMode: "context",
        bubbleVersion: state.bubbleVersion + 1,
        transitionEpoch: state.transitionEpoch + 1,
        transitionPhase: "enter",
      };
    case "show-context-message":
      if (state.stage !== "pose-transition" || state.transitionPhase !== "enter") return state;
      if (state.pendingNavigation) {
        return state.pendingNavigation.poseId === state.currentPoseId
          ? commitContext(state, state.pendingNavigation)
          : {
              ...state,
              transitionEpoch: state.transitionEpoch + 1,
              transitionPhase: "exit",
            };
      }
      return {
        ...state,
        bubbleMode: "context",
        transitionEpoch: state.transitionEpoch + 1,
        stage: "visible-message",
        transitionPhase: null,
      };
    case "dismiss":
      return {
        ...state,
        bubbleMode: "hidden",
        pendingNavigation: null,
        transitionEpoch: state.transitionEpoch + 1,
        stage: "dismissed",
        transitionPhase: null,
        dismissed: true,
      };
  }
}

function commitContext(state: FloatingBlessyState, navigation: FloatingBlessyNavigation): FloatingBlessyState {
  return {
    ...state,
    navigationContext: navigation.navigationContext,
    semanticContext: navigation.semanticContext,
    currentPoseId: navigation.poseId,
    currentMessage: navigation.message,
    bubbleAlign: navigation.bubbleAlign,
    pendingNavigation: null,
    bubbleMode: "context",
    bubbleVersion: state.bubbleVersion + 1,
    transitionEpoch: state.transitionEpoch + 1,
    stage: "visible-message",
    transitionPhase: null,
  };
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
        action = { type: "hide-bubble", epoch: state.transitionEpoch };
        break;
      case "bubble-exit":
        delay = FLOATING_BLESSY_TIMING.bubbleTransitionMs;
        action = { type: "finish-bubble-exit", epoch: state.transitionEpoch };
        break;
      case "pose-transition":
        delay =
          state.transitionPhase === "exit"
            ? Math.max(FLOATING_BLESSY_TIMING.poseExitMs, FLOATING_BLESSY_TIMING.bubbleTransitionMs)
            : FLOATING_BLESSY_TIMING.poseEnterMs;
        action =
          state.transitionPhase === "exit"
            ? { type: "enter-context", epoch: state.transitionEpoch }
            : { type: "show-context-message", epoch: state.transitionEpoch };
        break;
      case "idle":
      case "dismissed":
        return;
    }

    const timer = window.setTimeout(() => dispatch(action!), delay);
    return () => window.clearTimeout(timer);
  }, [
    enabled,
    state.bubbleVersion,
    state.dismissed,
    state.pendingNavigation?.navigationContext,
    state.stage,
    state.transitionEpoch,
    state.transitionPhase,
  ]);

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
      navigation,
    });
  }, [
    enabled,
    navigation,
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
