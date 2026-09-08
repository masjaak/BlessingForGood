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
  bounds: FloatingBlessyBounds;
};

export function resolveFloatingBlessyBubble({ anchor, bubble, bounds }: BubbleGeometryInput) {
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

  const fits = (candidate: (typeof candidates)[number]) =>
    candidate.left >= bounds.left &&
    candidate.top >= bounds.top &&
    candidate.left + bubble.width <= bounds.right &&
    candidate.top + bubble.height <= bounds.bottom;
  const selected = candidates.find(fits) || [...candidates].sort((a, b) => overflow(a) - overflow(b))[0];
  const left = Math.min(bounds.right - bubble.width, Math.max(bounds.left, selected.left));
  const top = Math.min(bounds.bottom - bubble.height, Math.max(bounds.top, selected.top));

  return { placement: selected.placement, left, top };

  function overflow(candidate: (typeof candidates)[number]) {
    return (
      Math.max(0, bounds.left - candidate.left) +
      Math.max(0, candidate.left + bubble.width - bounds.right) +
      Math.max(0, bounds.top - candidate.top) +
      Math.max(0, candidate.top + bubble.height - bounds.bottom)
    );
  }
}
