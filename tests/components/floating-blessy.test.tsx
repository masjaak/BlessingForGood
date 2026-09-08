import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { customerBottomLinks, publicLinks, resolveSiteNavigationContext } from "@/components/customer-navigation";
import {
  FLOATING_BLESSY_CTA,
  FLOATING_BLESSY_POSES,
  FLOATING_BLESSY_TIMING,
  FLOATING_BLESSY_WHATSAPP_LABEL,
  FLOATING_BLESSY_WHATSAPP_URL,
} from "@/features/floating-blessy/floating-blessy.config";
import {
  findFloatingBlessyPose,
  resolveFloatingBlessyNavigation,
} from "@/features/floating-blessy/floating-blessy-context";
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

function showBlessy(path = "/") {
  pathname.mockReturnValue(path);
  render(<FloatingBlessyGuide />);
  advance(FLOATING_BLESSY_TIMING.initialDelayMs);
}

function expectAttribute(element: HTMLElement, name: string, value: string) {
  expect(element.getAttribute(name)).toBe(value);
}

describe("Floating Blessy nav-context extension", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname.mockReturnValue("/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps approved assets, copy, timing, and the canonical WhatsApp CTA in one config", () => {
    expect(FLOATING_BLESSY_POSES).toHaveLength(4);
    expect(FLOATING_BLESSY_POSES.map((pose) => pose.id)).toEqual(["greeting", "question", "apology", "sleeping"]);
    expect(FLOATING_BLESSY_POSES.map((pose) => pose.asset.src)).toEqual([
      "/brand/mascot/floating-blessy/Blessy 1.png",
      "/brand/mascot/floating-blessy/Blessy 2.png",
      "/brand/mascot/floating-blessy/Blessy 3.png",
      "/brand/mascot/floating-blessy/Blessy 4.png",
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
      bubbleTransitionMs: 200,
      poseExitMs: 160,
      poseEnterMs: 220,
      dragThresholdPx: 6,
    });
    expect(FLOATING_BLESSY_CTA).toBe("Klik aku kalau mau ngobrol langsung ya");
    expect(FLOATING_BLESSY_WHATSAPP_URL).toBe("https://wa.me/6288973465977");
  });

  it.each([
    ["/", "home", "greeting"],
    ["/ready-stock", "ready-stock", "question"],
    ["/ready-stock/the-public-book", "ready-stock", "question"],
    ["/community", "community", "greeting"],
    ["/how-to-order", "how-to-order", "apology"],
    ["/catalog", "catalog", "question"],
    ["/catalog/catalog-1/book-1", "catalog", "question"],
    ["/join", "join", "greeting"],
    ["/account/orders", "orders", "apology"],
    ["/account/orders/order-1", "orders", "apology"],
    ["/account/invoices", "invoices", "apology"],
    ["/account/invoices/invoice-1", "invoices", "apology"],
    ["/account", "account", "sleeping"],
    ["/account/profile", "account", "sleeping"],
  ])("maps %s to the %s context and %s pose", (path, context, poseId) => {
    const navigation = resolveFloatingBlessyNavigation(path);
    expect(navigation).toMatchObject({ navigationContext: context, poseId, isFallback: false });
    expect(findFloatingBlessyPose(navigation.poseId).message).toBe(
      FLOATING_BLESSY_POSES.find((pose) => pose.id === poseId)?.message,
    );
  });

  it("requires every primary public and customer nav entry to resolve without fallback", () => {
    for (const link of [...publicLinks, ...customerBottomLinks]) {
      expect(resolveSiteNavigationContext(link.href), link.href).toBe(link.context);
      expect(resolveFloatingBlessyNavigation(link.href), link.href).toMatchObject({ isFallback: false });
    }
  });

  it("updates copy when the context changes but the approved pose is reused", () => {
    pathname.mockReturnValue("/ready-stock");
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);
    const widget = screen.getByTestId("floating-blessy");
    expectAttribute(widget, "data-navigation-context", "ready-stock");
    expectAttribute(widget, "data-pose-id", "question");
    expect(screen.getByText("Mau cari buku yang bisa langsung dibawa pulang? Cek Ready Stock yuk!")).toBeTruthy();

    pathname.mockReturnValue("/catalog");
    rerender(<FloatingBlessyGuide />);

    expectAttribute(widget, "data-navigation-context", "ready-stock");
    expectAttribute(widget, "data-pose-id", "question");
    expectAttribute(widget, "data-stage", "bubble-exit");
    expect(widget.getAttribute("data-transition-phase")).toBeNull();
    const bubble = screen.getByTestId("floating-blessy-bubble");
    expectAttribute(bubble, "data-bubble-mode", "context");
    expectAttribute(bubble, "data-visible", "false");
    expect(screen.getByText("Mau cari buku yang bisa langsung dibawa pulang? Cek Ready Stock yuk!")).toBeTruthy();
    expect(screen.queryByText("Hari ini mau FIX buku apa?")).toBeNull();

    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);

    expectAttribute(widget, "data-stage", "visible-message");
    expectAttribute(widget, "data-navigation-context", "catalog");
    expectAttribute(bubble, "data-bubble-mode", "context");
    expectAttribute(bubble, "data-visible", "true");
    expect(screen.getByText("Hari ini mau FIX buku apa?")).toBeTruthy();
  });

  it("uses one shared bubble family with a dedicated centered CTA inner wrapper", () => {
    showBlessy();
    const bubble = screen.getByTestId("floating-blessy-bubble");
    expect(screen.getAllByTestId("floating-blessy-bubble")).toHaveLength(1);
    expect(screen.queryByTestId("floating-blessy-cta")).toBeNull();
    expect(bubble.className).toContain("floating-blessy__bubble--context");
    expect(bubble.querySelector(".floating-blessy__bubble-inner")).toBeTruthy();

    advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs);
    expectAttribute(bubble, "data-bubble-mode", "context");
    expectAttribute(bubble, "data-visible", "false");
    expect(screen.queryByText(FLOATING_BLESSY_CTA)).toBeNull();

    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);

    expect(bubble.className).toContain("floating-blessy__bubble--cta");
    expect(bubble.querySelector(".floating-blessy__bubble-inner")).toBeTruthy();
    expect(bubble.getAttribute("data-align")).toBe("center");
    expectAttribute(bubble, "data-bubble-mode", "cta");
    expectAttribute(bubble, "data-visible", "true");
    expect(screen.getByText(FLOATING_BLESSY_CTA)).toBeTruthy();
  });

  it("shows the current route context after the initial delay", () => {
    showBlessy("/catalog");

    const widget = screen.getByTestId("floating-blessy");
    expectAttribute(widget, "data-navigation-context", "catalog");
    expectAttribute(widget, "data-pose-id", "question");
    expect(poseImage()?.getAttribute("src")).toContain(encodeURIComponent(FLOATING_BLESSY_POSES[1].asset.src));
    expect(screen.getByText(FLOATING_BLESSY_POSES[1].message)).toBeTruthy();
    expectAttribute(screen.getByTestId("floating-blessy-bubble"), "data-visible", "true");
    expectAttribute(screen.getByTestId("floating-blessy-bubble"), "data-bubble-mode", "context");
  });

  it("transitions on a nav-family change, shows the new bubble, and preserves position", () => {
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);
    const widget = screen.getByTestId("floating-blessy");
    const initialStyle = widget.getAttribute("style");

    pathname.mockReturnValue("/catalog");
    rerender(<FloatingBlessyGuide />);
    expectAttribute(widget, "data-stage", "pose-transition");
    expectAttribute(widget, "data-transition-phase", "exit");
    expectAttribute(screen.getByTestId("floating-blessy-bubble"), "data-visible", "false");
    expect(screen.queryByText(FLOATING_BLESSY_CTA)).toBeNull();

    advance(Math.max(FLOATING_BLESSY_TIMING.poseExitMs, FLOATING_BLESSY_TIMING.bubbleTransitionMs));
    expectAttribute(widget, "data-pose-id", "question");
    expectAttribute(widget, "data-transition-phase", "enter");
    expectAttribute(screen.getByTestId("floating-blessy-bubble"), "data-visible", "false");
    expect(screen.getByText("Hari ini mau FIX buku apa?")).toBeTruthy();
    advance(FLOATING_BLESSY_TIMING.poseEnterMs);

    expectAttribute(widget, "data-stage", "visible-message");
    expectAttribute(widget, "data-navigation-context", "catalog");
    expectAttribute(screen.getByTestId("floating-blessy-bubble"), "data-visible", "true");
    expectAttribute(screen.getByTestId("floating-blessy-bubble"), "data-bubble-mode", "context");
    expect(screen.getByText("Hari ini mau FIX buku apa?")).toBeTruthy();
    expect(widget.getAttribute("style")).toBe(initialStyle);
  });

  it("does not replay a transition inside one nav family", () => {
    pathname.mockReturnValue("/catalog");
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);

    pathname.mockReturnValue("/catalog/catalog-1/book-1");
    rerender(<FloatingBlessyGuide />);

    const widget = screen.getByTestId("floating-blessy");
    expectAttribute(widget, "data-pose-id", "question");
    expectAttribute(widget, "data-stage", "visible-message");
    expect(widget.getAttribute("data-transition-phase")).toBeNull();
  });

  it("hides the contextual bubble, shows the compact WhatsApp hint, and never auto-rotates the pose", () => {
    showBlessy();
    advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs);

    const bubble = screen.getByTestId("floating-blessy-bubble");
    expectAttribute(bubble, "data-visible", "false");
    expectAttribute(bubble, "data-bubble-mode", "context");
    expect(screen.queryByText(FLOATING_BLESSY_CTA)).toBeNull();

    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);

    expectAttribute(bubble, "data-visible", "true");
    expectAttribute(bubble, "data-bubble-mode", "cta");
    expect(screen.getByText(FLOATING_BLESSY_CTA)).toBeTruthy();

    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs + 1_000_000);
    expectAttribute(screen.getByTestId("floating-blessy"), "data-stage", "idle");
    expectAttribute(screen.getByTestId("floating-blessy"), "data-pose-id", "greeting");
    expect(screen.getByTestId("floating-blessy").getAttribute("data-sequence-complete")).toBeNull();
  });

  it("exits CTA before entering a new context without a second bubble", () => {
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);
    advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs);
    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);

    const bubble = screen.getByTestId("floating-blessy-bubble");
    expectAttribute(bubble, "data-bubble-mode", "cta");
    expectAttribute(bubble, "data-visible", "true");
    expect(screen.getByText(FLOATING_BLESSY_CTA)).toBeTruthy();

    pathname.mockReturnValue("/catalog");
    rerender(<FloatingBlessyGuide />);

    expectAttribute(screen.getByTestId("floating-blessy"), "data-stage", "pose-transition");
    expectAttribute(bubble, "data-visible", "false");
    expectAttribute(bubble, "data-bubble-mode", "cta");
    expect(screen.getByText(FLOATING_BLESSY_CTA)).toBeTruthy();
    expect(screen.queryByText("Hari ini mau FIX buku apa?")).toBeNull();

    advance(Math.max(FLOATING_BLESSY_TIMING.poseExitMs, FLOATING_BLESSY_TIMING.bubbleTransitionMs));
    expectAttribute(bubble, "data-visible", "false");
    expectAttribute(bubble, "data-bubble-mode", "context");
    expect(screen.getByText("Hari ini mau FIX buku apa?")).toBeTruthy();
    expect(screen.queryByText(FLOATING_BLESSY_CTA)).toBeNull();

    advance(FLOATING_BLESSY_TIMING.poseEnterMs);
    expectAttribute(bubble, "data-visible", "true");
    expectAttribute(bubble, "data-bubble-mode", "context");
  });

  it("lets the latest rapid navigation win and ignores the old expiry timer", () => {
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);

    for (const path of ["/ready-stock", "/community", "/how-to-order", "/catalog", "/join"]) {
      pathname.mockReturnValue(path);
      rerender(<FloatingBlessyGuide />);
      advance(1);
    }

    const bubble = screen.getByTestId("floating-blessy-bubble");
    advance(FLOATING_BLESSY_TIMING.bubbleTransitionMs);
    expectAttribute(screen.getByTestId("floating-blessy"), "data-navigation-context", "join");
    expectAttribute(bubble, "data-bubble-mode", "context");
    expectAttribute(bubble, "data-visible", "true");
    expect(screen.getByText("Mau gabung jadi bagian dari Blessfriends? Yuk, sini!")).toBeTruthy();
    expect(screen.queryByText(FLOATING_BLESSY_CTA)).toBeNull();

    advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs - 1);
    expectAttribute(bubble, "data-visible", "true");
    advance(1);
    expectAttribute(bubble, "data-visible", "false");
    expectAttribute(bubble, "data-bubble-mode", "context");
  });

  it("does not let the CTA timer fire one millisecond before a context change", () => {
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);
    advance(FLOATING_BLESSY_TIMING.bubbleVisibleMs - 1);

    pathname.mockReturnValue("/catalog");
    rerender(<FloatingBlessyGuide />);
    advance(Math.max(FLOATING_BLESSY_TIMING.poseExitMs, FLOATING_BLESSY_TIMING.bubbleTransitionMs));
    advance(FLOATING_BLESSY_TIMING.poseEnterMs);

    const bubble = screen.getByTestId("floating-blessy-bubble");
    expectAttribute(bubble, "data-bubble-mode", "context");
    expectAttribute(bubble, "data-visible", "true");
    expect(screen.getByText("Hari ini mau FIX buku apa?")).toBeTruthy();
    expect(screen.queryByText(FLOATING_BLESSY_CTA)).toBeNull();
  });

  it("uses one keyboard-accessible WhatsApp action and tap does not change pose", () => {
    showBlessy("/catalog");
    const link = screen.getByRole("link", { name: FLOATING_BLESSY_WHATSAPP_LABEL });

    expectAttribute(link, "href", FLOATING_BLESSY_WHATSAPP_URL);
    expectAttribute(link, "target", "_blank");
    expectAttribute(link, "rel", "noopener noreferrer");
    fireEvent.click(link);
    expectAttribute(screen.getByTestId("floating-blessy"), "data-pose-id", "question");
  });

  it("treats micro movement as a tap and movement beyond the threshold as a drag without a click", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("data-testid") === "floating-blessy") {
        return {
          x: 100,
          y: 200,
          left: 100,
          top: 200,
          right: 220,
          bottom: 320,
          width: 120,
          height: 120,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });

    showBlessy();
    const widget = screen.getByTestId("floating-blessy");
    const link = screen.getByRole("link", { name: FLOATING_BLESSY_WHATSAPP_LABEL });

    fireEvent.pointerDown(link, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 120, clientY: 240 });
    fireEvent.pointerMove(link, { pointerId: 1, pointerType: "mouse", clientX: 123, clientY: 242 });
    fireEvent.pointerUp(link, { pointerId: 1, pointerType: "mouse", clientX: 123, clientY: 242 });
    const tapClick = createEvent.click(link);
    fireEvent(link, tapClick);
    expect(tapClick.defaultPrevented).toBe(false);

    fireEvent.pointerDown(link, { pointerId: 2, pointerType: "mouse", button: 0, clientX: 120, clientY: 240 });
    fireEvent.pointerMove(link, { pointerId: 2, pointerType: "mouse", clientX: 180, clientY: 300 });
    expectAttribute(widget, "data-dragging", "true");
    expect(widget.style.left).toBe("160px");
    fireEvent.pointerUp(link, { pointerId: 2, pointerType: "mouse", clientX: 180, clientY: 300 });
    expectAttribute(widget, "data-dragging", "false");

    const dragClick = createEvent.click(link);
    fireEvent(link, dragClick);
    expect(dragClick.defaultPrevented).toBe(true);
  });

  it("preserves dismissal across context changes and stays absent on Admin", () => {
    const { rerender } = render(<FloatingBlessyGuide />);
    advance(FLOATING_BLESSY_TIMING.initialDelayMs);
    fireEvent.click(screen.getByRole("button", { name: "Tutup Blessy" }));
    expect(screen.queryByTestId("floating-blessy")).toBeNull();

    pathname.mockReturnValue("/catalog");
    rerender(<FloatingBlessyGuide />);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();

    pathname.mockReturnValue("/admin/orders");
    rerender(<FloatingBlessyGuide />);
    expect(screen.queryByTestId("floating-blessy")).toBeNull();
  });
});
