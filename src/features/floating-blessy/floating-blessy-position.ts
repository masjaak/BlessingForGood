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
  bubble: FloatingBlessySize;
  close?: FloatingBlessyPosition & FloatingBlessySize;
  bounds: FloatingBlessyBounds;
};

export function resolveFloatingBlessyBubble({ anchor, bubble, close, bounds }: BubbleGeometryInput) {
  const candidates: Array<{ placement: FloatingBlessyBubblePlacement; left: number; top: number }> = [
    {
      placement: "top-right",
      left: anchor.x + anchor.width - bubble.width,
      top: anchor.y - bubble.height - BUBBLE_GAP_PX,
    },
    {
      placement: "top-left",
      left: anchor.x,
      top: anchor.y - bubble.height - BUBBLE_GAP_PX,
    },
    {
      placement: "bottom-right",
      left: anchor.x + anchor.width - bubble.width,
      top: anchor.y + anchor.height + BUBBLE_GAP_PX,
    },
    {
      placement: "bottom-left",
      left: anchor.x,
      top: anchor.y + anchor.height + BUBBLE_GAP_PX,
    },
  ];

  const closeExclusion = close && {
    x: close.x - CLOSE_EXCLUSION_GAP_PX,
    y: close.y - CLOSE_EXCLUSION_GAP_PX,
    width: close.width + CLOSE_EXCLUSION_GAP_PX * 2,
    height: close.height + CLOSE_EXCLUSION_GAP_PX * 2,
  };

  const fits = (candidate: (typeof candidates)[number]) =>
    candidate.left >= bounds.left &&
    candidate.top >= bounds.top &&
    candidate.left + bubble.width <= bounds.right &&
    candidate.top + bubble.height <= bounds.bottom &&
    (!closeExclusion || !overlaps({ x: candidate.left, y: candidate.top }, bubble, closeExclusion));
  const selected = candidates.find(fits) || [...candidates].sort((a, b) => score(a) - score(b))[0];
  const clamped = {
    left: Math.min(bounds.right - bubble.width, Math.max(bounds.left, selected.left)),
    top: Math.min(bounds.bottom - bubble.height, Math.max(bounds.top, selected.top)),
  };
  const adjusted = closeExclusion ? moveOutsideClose(clamped, bubble, bounds, closeExclusion) : clamped;

  return { placement: selected.placement, left: adjusted.left, top: adjusted.top };

  function overflow(candidate: (typeof candidates)[number]) {
    return (
      Math.max(0, bounds.left - candidate.left) +
      Math.max(0, candidate.left + bubble.width - bounds.right) +
      Math.max(0, bounds.top - candidate.top) +
      Math.max(0, candidate.top + bubble.height - bounds.bottom)
    );
  }

  function score(candidate: (typeof candidates)[number]) {
    return (
      overflow(candidate) * 10 +
      (closeExclusion ? collisionArea({ x: candidate.left, y: candidate.top }, bubble, closeExclusion) * 100 : 0)
    );
  }
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

function moveOutsideClose(
  position: { left: number; top: number },
  bubble: FloatingBlessySize,
  bounds: FloatingBlessyBounds,
  close: FloatingBlessyPosition & FloatingBlessySize,
) {
  if (!overlaps({ x: position.left, y: position.top }, bubble, close)) return position;

  const clampX = (value: number) => Math.min(bounds.right - bubble.width, Math.max(bounds.left, value));
  const clampY = (value: number) => Math.min(bounds.bottom - bubble.height, Math.max(bounds.top, value));
  const candidates = [
    { left: position.left, top: close.y - bubble.height },
    { left: position.left, top: close.y + close.height },
    { left: close.x - bubble.width, top: position.top },
    { left: close.x + close.width, top: position.top },
  ]
    .map(({ left, top }) => ({ left: clampX(left), top: clampY(top) }))
    .filter((candidate) => !overlaps({ x: candidate.left, y: candidate.top }, bubble, close))
    .sort(
      (a, b) =>
        Math.abs(a.left - position.left) +
        Math.abs(a.top - position.top) -
        (Math.abs(b.left - position.left) + Math.abs(b.top - position.top)),
    );

  return candidates[0] || position;
}
