import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerBottomNav } from "@/components/site-shell";
import { WorkspaceActivityContext, WorkspaceActivityProvider, WorkspaceActions } from "@/components/workspace-actions";

vi.mock("convex/react", () => ({
  useQuery: vi.fn((_query, args) => (args === "skip" ? undefined : 4)),
}));

describe("authenticated workspace actions", () => {
  it("exposes one combined activity trigger for Admin", () => {
    render(
      <WorkspaceActivityProvider enabled>
        <WorkspaceActions workspace="admin" enabled />
      </WorkspaceActivityProvider>,
    );
    expect(screen.getByRole("button", { name: /Aktivitas.*4 belum dibaca/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak masuk/ })).toBeNull();
  });

  it("exposes one combined activity trigger for Customer", () => {
    render(
      <WorkspaceActivityProvider enabled>
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
