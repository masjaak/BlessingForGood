import { describe, expect, it } from "vitest";
import { isPreviewDemoMode, isPrototypeMode, shouldUseConvex } from "@/lib/environment";

describe("prototype environment guards", () => {
  it("keeps local prototype mode behind the development flag", () => {
    expect(isPrototypeMode({ NODE_ENV: "development", NEXT_PUBLIC_BFG_PROTOTYPE_MODE: "true" })).toBe(true);
    expect(isPrototypeMode({ NODE_ENV: "production", NEXT_PUBLIC_BFG_PROTOTYPE_MODE: "true" })).toBe(false);
  });

  it("enables Preview Demo Mode only with the explicit Preview boundary", () => {
    const preview = { NODE_ENV: "production", NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE: "true" };

    expect(isPreviewDemoMode(preview, true)).toBe(true);
    expect(isPrototypeMode(preview, true)).toBe(true);
    expect(isPrototypeMode(preview, false)).toBe(false);
  });

  it("rejects missing flags and Production activation", () => {
    expect(isPreviewDemoMode({}, true)).toBe(false);
    expect(isPrototypeMode({ NODE_ENV: "production", NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE: "true" }, false)).toBe(false);
    expect(isPrototypeMode({ NODE_ENV: "production", NEXT_PUBLIC_BFG_PROTOTYPE_MODE: "true" }, false)).toBe(false);
  });

  it("uses Convex for configured Preview and fails closed without its URL", () => {
    const preview = { NODE_ENV: "production" };

    expect(shouldUseConvex(preview, true, true)).toBe(true);
    expect(shouldUseConvex(preview, true, false)).toBe(false);
    expect(shouldUseConvex(preview, false, true)).toBe(false);
  });
});
