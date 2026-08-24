import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerBottomNav } from "@/components/site-shell";
import {
  calculateActivityPanelGeometry,
  WorkspaceActivityContext,
  WorkspaceActivityProvider,
  WorkspaceActions,
} from "@/components/workspace-actions";

vi.mock("convex/react", () => ({
  useQuery: vi.fn((_query, args) => (args === "skip" ? undefined : 4)),
}));

describe("authenticated workspace actions", () => {
  it("exposes one combined activity trigger for Admin", () => {
    render(
      <WorkspaceActivityProvider enabled workspace="admin">
        <WorkspaceActions workspace="admin" enabled />
      </WorkspaceActivityProvider>,
    );
    expect(screen.getByRole("button", { name: /Aktivitas.*4 belum dibaca/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak masuk/ })).toBeNull();
  });

  it("exposes one combined activity trigger for Customer", () => {
    render(
      <WorkspaceActivityProvider enabled workspace="customer">
        <WorkspaceActions workspace="customer" enabled />
      </WorkspaceActivityProvider>,
    );
    expect(screen.getByRole("button", { name: /Aktivitas.*4 belum dibaca/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak masuk/ })).toBeNull();
  });

  it("signals unread customer activity on the Akun bottom-nav item", () => {
    render(
      <WorkspaceActivityContext.Provider value={{ activity: 1 }}>
        <CustomerBottomNav pathname="/account" />
      </WorkspaceActivityContext.Provider>,
    );

    expect(screen.getByRole("link", { name: /Akun.*aktivitas baru/i })).toBeTruthy();
    expect(document.querySelector(".customer-nav-unread-dot")).toBeTruthy();
  });

  it("hides the Akun unread signal when both activity surfaces are clear", () => {
    render(
      <WorkspaceActivityContext.Provider value={{ activity: 0 }}>
        <CustomerBottomNav pathname="/account" />
      </WorkspaceActivityContext.Provider>,
    );

    expect(screen.getByRole("link", { name: "Akun" })).toBeTruthy();
    expect(document.querySelector(".customer-nav-unread-dot")).toBeNull();
  });
});

describe("Activity panel geometry", () => {
  it("keeps an anchored panel inside the viewport after a right-side collision", () => {
    const geometry = calculateActivityPanelGeometry(
      { width: 1024, height: 768 },
      { top: 64, bottom: 104, right: 1008 },
    );

    expect(geometry.mode).toBe("anchored");
    expect(geometry.left).toBeGreaterThanOrEqual(12);
    expect(geometry.left + geometry.width).toBeLessThanOrEqual(1012);
  });

  it("bounds narrow width and reserves mobile bottom space", () => {
    const geometry = calculateActivityPanelGeometry({ width: 390, height: 844 }, { top: 64, bottom: 104, right: 378 });

    expect(geometry.mode).toBe("mobile");
    expect(geometry.width).toBe(366);
    expect(geometry.left).toBe(12);
    expect(geometry.top + geometry.maxHeight).toBeLessThanOrEqual(760);
  });

  it("opens above a low trigger when below space is too small", () => {
    const geometry = calculateActivityPanelGeometry(
      { width: 1024, height: 400 },
      { top: 320, bottom: 360, right: 1008 },
    );

    expect(geometry.top).toBe(12);
    expect(geometry.top + geometry.maxHeight).toBeLessThanOrEqual(388);
  });
});
