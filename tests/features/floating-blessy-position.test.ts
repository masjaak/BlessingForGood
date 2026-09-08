import { describe, expect, it } from "vitest";
import {
  clampFloatingBlessyPosition,
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
});
