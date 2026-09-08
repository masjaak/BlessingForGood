export type FloatingBlessyPosition = { x: number; y: number };

export type FloatingBlessyBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type FloatingBlessySize = { width: number; height: number };
export type FloatingBlessyBubblePlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left";

const VIEWPORT_PADDING_PX = 8;
const NAV_GAP_PX = 8;
const CLOSE_CLEARANCE_PX = 36;
const CLOSE_EXCLUSION_GAP_PX = 6;
const BUBBLE_GAP_PX = 10;
const MOBILE_BREAKPOINT_PX = 800;
const MASCOT_GAP_PX = { mobile: 12, desktop: 16 } as const;
const MASCOT_IDLE_TRAVEL_PX = 4;

export function getFloatingBlessyMascotGap(viewportWidth: number) {
  return viewportWidth <= MOBILE_BREAKPOINT_PX ? MASCOT_GAP_PX.mobile : MASCOT_GAP_PX.desktop;
}

export function getFloatingBlessyMascotExclusionGap(viewportWidth: number) {
  return getFloatingBlessyMascotGap(viewportWidth) + MASCOT_IDLE_TRAVEL_PX;
}

export function getFloatingBlessyBounds(): FloatingBlessyBounds {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const nav = document.querySelector<HTMLElement>(".customer-bottom-nav");
  const navRect = nav?.getBoundingClientRect();
  const navVisible = Boolean(
    nav &&
    navRect &&
    navRect.height > 0 &&
    navRect.top > 0 &&
    navRect.top < viewportHeight &&
    window.getComputedStyle(nav).display !== "none",
  );

  return {
    left: VIEWPORT_PADDING_PX,
    top: VIEWPORT_PADDING_PX,
    right: viewportWidth - VIEWPORT_PADDING_PX,
    bottom: navVisible ? navRect!.top - NAV_GAP_PX : viewportHeight - VIEWPORT_PADDING_PX,
  };
}

export function clampFloatingBlessyPosition(
  position: FloatingBlessyPosition,
  size: FloatingBlessySize,
  bounds: FloatingBlessyBounds,
): FloatingBlessyPosition {
  const minX = bounds.left;
  const maxX = Math.max(minX, bounds.right - size.width);
  const minY = bounds.top + CLOSE_CLEARANCE_PX;
  const maxY = Math.max(minY, bounds.bottom - size.height);

  return {
    x: Math.min(maxX, Math.max(minX, position.x)),
    y: Math.min(maxY, Math.max(minY, position.y)),
  };
}

type BubbleGeometryInput = {
  anchor: FloatingBlessyPosition & FloatingBlessySize;
  mascot?: FloatingBlessyPosition & FloatingBlessySize;
  bubble: FloatingBlessySize;
  mascotGap?: number;
  close?: FloatingBlessyPosition & FloatingBlessySize;
  bounds: FloatingBlessyBounds;
};

export function resolveFloatingBlessyBubble({ anchor, mascot, bubble, mascotGap, close, bounds }: BubbleGeometryInput) {
  const mascotRect = mascot || anchor;
  const gap = mascot ? (mascotGap ?? MASCOT_GAP_PX.desktop) : BUBBLE_GAP_PX;
  const candidates: Array<{ placement: FloatingBlessyBubblePlacement; left: number; top: number }> = [
    {
      placement: "top-right",
      left: mascotRect.x + mascotRect.width - bubble.width,
      top: mascotRect.y - bubble.height - gap,
    },
    {
      placement: "top-left",
      left: mascotRect.x,
      top: mascotRect.y - bubble.height - gap,
    },
    {
      placement: "bottom-right",
      left: mascotRect.x + mascotRect.width - bubble.width,
      top: mascotRect.y + mascotRect.height + gap,
    },
    {
      placement: "bottom-left",
      left: mascotRect.x,
      top: mascotRect.y + mascotRect.height + gap,
    },
  ];

  const exclusions = [
    ...(mascot ? [expandRect(mascot, gap)] : []),
    ...(close ? [expandRect(close, CLOSE_EXCLUSION_GAP_PX)] : []),
  ];

  const fits = (candidate: (typeof candidates)[number]) =>
    isInsideBounds({ x: candidate.left, y: candidate.top }, bubble, bounds) &&
    exclusions.every((exclusion) => !overlaps({ x: candidate.left, y: candidate.top }, bubble, exclusion));
  const states = candidates.map((candidate) => {
    const clamped = clampBubblePosition({ x: candidate.left, y: candidate.top }, bubble, bounds);
    return { candidate, clamped, adjusted: moveOutsideExclusions(clamped, bubble, bounds, exclusions) };
  });
  const selected =
    states.find(({ candidate }) => fits(candidate)) || [...states].sort((a, b) => score(a) - score(b))[0];

  return {
    placement: selected.candidate.placement,
    left: selected.adjusted.left,
    top: selected.adjusted.top,
  };

  function overflow(candidate: (typeof candidates)[number]) {
    return (
      Math.max(0, bounds.left - candidate.left) +
      Math.max(0, candidate.left + bubble.width - bounds.right) +
      Math.max(0, bounds.top - candidate.top) +
      Math.max(0, candidate.top + bubble.height - bounds.bottom)
    );
  }

  function score(state: (typeof states)[number]) {
    return (
      overflow(state.candidate) * 10 +
      exclusions.reduce(
        (total, exclusion) =>
          total + collisionArea({ x: state.adjusted.left, y: state.adjusted.top }, bubble, exclusion),
        0,
      ) *
        100 +
      Math.abs(state.adjusted.left - state.clamped.left) +
      Math.abs(state.adjusted.top - state.clamped.top)
    );
  }
}

function expandRect(rect: FloatingBlessyPosition & FloatingBlessySize, gap: number) {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2,
  };
}

function isInsideBounds(position: FloatingBlessyPosition, size: FloatingBlessySize, bounds: FloatingBlessyBounds) {
  return (
    position.x >= bounds.left &&
    position.y >= bounds.top &&
    position.x + size.width <= bounds.right &&
    position.y + size.height <= bounds.bottom
  );
}

function clampBubblePosition(position: FloatingBlessyPosition, size: FloatingBlessySize, bounds: FloatingBlessyBounds) {
  return {
    left: Math.min(bounds.right - size.width, Math.max(bounds.left, position.x)),
    top: Math.min(bounds.bottom - size.height, Math.max(bounds.top, position.y)),
  };
}

function overlaps(
  position: FloatingBlessyPosition,
  size: FloatingBlessySize,
  exclusion: FloatingBlessyPosition & FloatingBlessySize,
) {
  return (
    position.x < exclusion.x + exclusion.width &&
    position.x + size.width > exclusion.x &&
    position.y < exclusion.y + exclusion.height &&
    position.y + size.height > exclusion.y
  );
}

function collisionArea(
  position: FloatingBlessyPosition,
  size: FloatingBlessySize,
  exclusion: FloatingBlessyPosition & FloatingBlessySize,
) {
  if (!overlaps(position, size, exclusion)) return 0;
  const width = Math.min(position.x + size.width, exclusion.x + exclusion.width) - Math.max(position.x, exclusion.x);
  const height = Math.min(position.y + size.height, exclusion.y + exclusion.height) - Math.max(position.y, exclusion.y);
  return width * height;
}

function moveOutsideExclusions(
  position: { left: number; top: number },
  bubble: FloatingBlessySize,
  bounds: FloatingBlessyBounds,
  exclusions: Array<FloatingBlessyPosition & FloatingBlessySize>,
) {
  if (!exclusions.some((exclusion) => overlaps({ x: position.left, y: position.top }, bubble, exclusion))) {
    return position;
  }

  const clampX = (value: number) => Math.min(bounds.right - bubble.width, Math.max(bounds.left, value));
  const clampY = (value: number) => Math.min(bounds.bottom - bubble.height, Math.max(bounds.top, value));
  const candidates = exclusions
    .flatMap((exclusion) => [
      { left: position.left, top: exclusion.y - bubble.height },
      { left: position.left, top: exclusion.y + exclusion.height },
      { left: exclusion.x - bubble.width, top: position.top },
      { left: exclusion.x + exclusion.width, top: position.top },
    ])
    .map(({ left, top }) => ({ left: clampX(left), top: clampY(top) }))
    .filter(
      (candidate) =>
        isInsideBounds({ x: candidate.left, y: candidate.top }, bubble, bounds) &&
        exclusions.every((exclusion) => !overlaps({ x: candidate.left, y: candidate.top }, bubble, exclusion)),
    )
    .sort(
      (a, b) =>
        Math.abs(a.left - position.left) +
        Math.abs(a.top - position.top) * 2 -
        (Math.abs(b.left - position.left) + Math.abs(b.top - position.top) * 2),
    );

  return candidates[0] || position;
}
