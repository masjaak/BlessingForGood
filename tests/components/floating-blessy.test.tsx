import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { FLOATING_BLESSY_POSES, FLOATING_BLESSY_TIMING } from "@/features/floating-blessy/floating-blessy.config";
import { FloatingBlessyGuide } from "@/features/floating-blessy/floating-blessy-guide";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const pathname = vi.mocked(usePathname);

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function poseImage() {
  return screen.getByTestId("floating-blessy").querySelector("img");
}

function showGreeting() {
  pathname.mockReturnValue("/");
  render(<FloatingBlessyGuide />);
  advance(FLOATING_BLESSY_TIMING.initialDelayMs);
}

function advanceToNextPose() {
  advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs);
  advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);
  advance(FLOATING_BLESSY_TIMING.betweenMessagesMs);
  advance(FLOATING_BLESSY_TIMING.poseExitMs);
  advance(FLOATING_BLESSY_TIMING.poseEnterMs);
}

describe("Floating Blessy Phase 1", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname.mockReturnValue("/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the four local assets, messages, and production timing in one config", () => {
    expect(FLOATING_BLESSY_POSES).toHaveLength(4);
    expect(FLOATING_BLESSY_POSES.map((pose) => pose.id)).toEqual(["greeting", "question", "apology", "sleeping"]);
    expect(FLOATING_BLESSY_POSES.map((pose) => pose.asset.src)).toEqual([
      "/brand/mascot/Mascott-1.png",
      "/brand/mascot/Mascott-2.png",
      "/brand/mascot/Mascott-3.png",
      "/brand/mascot/Mascott-4.png",
    ]);
    expect(FLOATING_BLESSY_POSES.map((pose) => pose.message)).toEqual([
      "Hallo, Selamat datang di Website Official BFG! Namaku Blessy!",
      "Hari ini mau FIX buku apa?",
      "Kalau Admin telat bales, sabar ya. Mungkin lagi dinas ke nyuapin anaknya.",
      "Ssstt jangan bilang ka Madin, aku mau tidur dulu!",
    ]);
    expect(FLOATING_BLESSY_TIMING).toMatchObject({
      initialDelayMs: 1500,
      bubbleVisibleMs: 7000,
      betweenMessagesMs: 150000,
      poseExitMs: 160,
      poseEnterMs: 220,
      bubbleTransitionMs: 200,
    });
  });

  it("stays hidden until the initial delay, then shows pose 1 with its matching bubble", () => {
    pathname.mockReturnValue("/");
    render(<FloatingBlessyGuide />);

    expect(screen.queryByTestId("floating-blessy")).toBeNull();
    advance(FLOATING_BLESSY_TIMING.initialDelayMs - 1);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();

    advance(1);
    expect(screen.getByTestId("floating-blessy").getAttribute("data-stage")).toBe("visible-message");
    expect(poseImage()?.getAttribute("src")).toContain("Mascott-1.png");
    expect(screen.getByText(FLOATING_BLESSY_POSES[0].message)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tutup Blessy" })).toBeTruthy();
  });

  it("hides bubbles on expiry, advances sequentially, and stops after pose 4", () => {
    showGreeting();

    FLOATING_BLESSY_POSES.forEach((pose, index) => {
      expect(poseImage()?.getAttribute("src")).toContain("Mascott-" + (index + 1) + ".png");
      expect(screen.getByText(pose.message)).toBeTruthy();

      advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs);
      expect(screen.getByTestId("floating-blessy-bubble").getAttribute("data-visible")).toBe("false");

      if (index < FLOATING_BLESSY_POSES.length - 1) {
        advanceToNextPoseAfterBubbleExpiry();
      } else {
        advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);
        expect(screen.getByTestId("floating-blessy").getAttribute("data-stage")).toBe("complete-idle");
        expect(screen.getByTestId("floating-blessy").getAttribute("data-sequence-complete")).toBe("true");
        advance(1_000_000);
        expect(poseImage()?.getAttribute("src")).toContain("Mascott-4.png");
        expect(screen.getByTestId("floating-blessy-bubble").getAttribute("data-visible")).toBe("false");
      }
    });
  });

  it("keeps dismissal final for the current client session and clears timers", () => {
    showGreeting();
    fireEvent.click(screen.getByRole("button", { name: "Tutup Blessy" }));
    expect(screen.queryByTestId("floating-blessy")).toBeNull();

    advance(1_000_000);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();
  });

  it.each(["idle-wait", "pose-transition"])("does not resurrect after close during %s", (stage) => {
    showGreeting();
    advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs);
    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);
    if (stage === "pose-transition") advance(FLOATING_BLESSY_TIMING.betweenMessagesMs);

    expect(screen.getByTestId("floating-blessy").getAttribute("data-stage")).toBe(stage);
    fireEvent.click(screen.getByRole("button", { name: "Tutup Blessy" }));
    advance(1_000_000);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();
  });

  it("preserves active state across customer navigation and renders nothing on Admin", () => {
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);
    advanceToNextPose();
    expect(poseImage()?.getAttribute("src")).toContain("Mascott-2.png");

    pathname.mockReturnValue("/account/orders");
    rerender(<FloatingBlessyGuide />);
    expect(poseImage()?.getAttribute("src")).toContain("Mascott-2.png");

    pathname.mockReturnValue("/admin/orders");
    rerender(<FloatingBlessyGuide />);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();
    advance(1_000_000);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();
  });
});

function advanceToNextPoseAfterBubbleExpiry() {
  advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);
  advance(FLOATING_BLESSY_TIMING.betweenMessagesMs);
  advance(FLOATING_BLESSY_TIMING.poseExitMs);
  advance(FLOATING_BLESSY_TIMING.poseEnterMs);
}
