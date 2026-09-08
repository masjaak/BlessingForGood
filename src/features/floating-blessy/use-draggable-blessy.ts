"use client";

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { FLOATING_BLESSY_TIMING } from "./floating-blessy.config";
import {
  clampFloatingBlessyPosition,
  getFloatingBlessyBounds,
  type FloatingBlessyPosition,
} from "./floating-blessy-position";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: FloatingBlessyPosition;
  moved: boolean;
};

export function useDraggableBlessy(enabled: boolean, rootRef: RefObject<HTMLElement | null>) {
  const [position, setPositionState] = useState<FloatingBlessyPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef<FloatingBlessyPosition | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const setPosition = useCallback((next: FloatingBlessyPosition) => {
    positionRef.current = next;
    setPositionState((previous) => (previous && previous.x === next.x && previous.y === next.y ? previous : next));
  }, []);

  const clampCurrentPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const next = clampFloatingBlessyPosition(
      positionRef.current || { x: rect.left, y: rect.top },
      { width: rect.width, height: rect.height },
      getFloatingBlessyBounds(),
    );
    setPosition(next);
  }, [rootRef, setPosition]);

  useLayoutEffect(() => {
    if (!enabled) return;

    clampCurrentPosition();
    window.addEventListener("resize", clampCurrentPosition);
    window.addEventListener("orientationchange", clampCurrentPosition);
    return () => {
      window.removeEventListener("resize", clampCurrentPosition);
      window.removeEventListener("orientationchange", clampCurrentPosition);
    };
  }, [clampCurrentPosition, enabled]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || (event.pointerType === "mouse" && event.button !== 0)) return;

      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const origin = clampFloatingBlessyPosition(
        positionRef.current || { x: rect.left, y: rect.top },
        { width: rect.width, height: rect.height },
        getFloatingBlessyBounds(),
      );
      setPosition(origin);
      suppressClickRef.current = false;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [enabled, rootRef, setPosition],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      const root = rootRef.current;
      if (!drag || !root || drag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < FLOATING_BLESSY_TIMING.dragThresholdPx) return;

      drag.moved = true;
      setIsDragging(true);
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      setPosition(
        clampFloatingBlessyPosition(
          { x: drag.origin.x + deltaX, y: drag.origin.y + deltaY },
          { width: rect.width, height: rect.height },
          getFloatingBlessyBounds(),
        ),
      );
    },
    [rootRef, setPosition],
  );

  const finishPointer = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const onClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  return {
    position,
    isDragging,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onClick,
    },
  };
}
