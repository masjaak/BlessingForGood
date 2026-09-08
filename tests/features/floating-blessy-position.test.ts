import { describe, expect, it } from "vitest";
import {
  clampFloatingBlessyPosition,
  getFloatingBlessyMascotGap,
  resolveFloatingBlessyBubble,
  type FloatingBlessyBounds,
} from "@/features/floating-blessy/floating-blessy-position";

const bounds: FloatingBlessyBounds = { left: 8, top: 8, right: 392, bottom: 760 };
const mascot = { width: 120, height: 120 };

describe("Floating Blessy geometry", () => {
  it("clamps the mascot inside the safe viewport", () => {
    expect(clampFloatingBlessyPosition({ x: -40, y: -40 }, mascot, bounds)).toEqual({ x: 8, y: 44 });
    expect(clampFloatingBlessyPosition({ x: 999, y: 999 }, mascot, bounds)).toEqual({ x: 272, y: 640 });
  });

  it("tries the preferred placements and keeps long bubbles contained", () => {
    const topRight = resolveFloatingBlessyBubble({
      anchor: { x: 260, y: 300, ...mascot },
      bubble: { width: 300, height: 92 },
      bounds,
    });
    expect(topRight.placement).toBe("top-right");
    expect(topRight.left).toBeGreaterThanOrEqual(bounds.left);
    expect(topRight.top).toBeGreaterThanOrEqual(bounds.top);
    expect(topRight.left + 300).toBeLessThanOrEqual(bounds.right);
    expect(topRight.top + 92).toBeLessThanOrEqual(bounds.bottom);

    const bottomLeft = resolveFloatingBlessyBubble({
      anchor: { x: 8, y: 50, ...mascot },
      bubble: { width: 220, height: 60 },
      bounds,
    });
    expect(bottomLeft.placement).toBe("bottom-left");
    expect(bottomLeft.left).toBeGreaterThanOrEqual(bounds.left);
    expect(bottomLeft.top).toBeGreaterThanOrEqual(bounds.top);
  });

  it("rejects bubble placements that overlap the close exclusion zone", () => {
    const result = resolveFloatingBlessyBubble({
      anchor: { x: 260, y: 300, ...mascot },
      bubble: { width: 300, height: 92 },
      close: { x: 350, y: 268, width: 30, height: 30 },
      bounds,
    });

    expect(result.placement).toBe("bottom-right");
    expect(result.top).toBeGreaterThanOrEqual(300 + mascot.height);
    expect(result.left + 300).toBeLessThanOrEqual(bounds.right);
  });

  it("keeps the bubble outside the mascot exclusion with the responsive visual gap", () => {
    const result = resolveFloatingBlessyBubble({
      anchor: { x: 260, y: 300, ...mascot },
      mascot: { x: 260, y: 300, ...mascot },
      bubble: { width: 300, height: 92 },
      mascotGap: getFloatingBlessyMascotGap(390),
      bounds,
    });

    expect(result.placement).toBe("top-right");
    expect(result.top + 92).toBeLessThanOrEqual(300 - 12);
    expect(result.left + 300).toBeLessThanOrEqual(bounds.right);
  });

  it("clears Close sideways when it sits between the bubble and mascot", () => {
    const result = resolveFloatingBlessyBubble({
      anchor: { x: 261, y: 645, width: 117, height: 117 },
      mascot: { x: 261, y: 645, width: 117, height: 117 },
      bubble: { width: 300, height: 64 },
      mascotGap: 16,
      close: { x: 348, y: 615, width: 30, height: 30 },
      bounds: { left: 8, top: 8, right: 382, bottom: 768 },
    });

    expect(result.placement).toBe("top-right");
    expect(result.top + 64).toBeLessThanOrEqual(645 - 16);
    expect(result.left + 300).toBeLessThanOrEqual(348 - 6);
  });
});
