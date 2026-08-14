import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceActions } from "@/components/workspace-actions";

vi.mock("convex/react", () => ({
  useQuery: vi.fn((_query, args) => (args === "skip" ? undefined : 2)),
}));

describe("authenticated workspace actions", () => {
  it("exposes reachable Notification and Inbox destinations for Admin", () => {
    render(<WorkspaceActions workspace="admin" enabled />);
    expect(screen.getByRole("link", { name: /Notifikasi/ }).getAttribute("href")).toBe("/admin/notifications");
    expect(screen.getByRole("link", { name: /Inbox/ }).getAttribute("href")).toBe("/admin/inbox");
  });

  it("exposes reachable owned Notification and Inbox destinations for Customer", () => {
    render(<WorkspaceActions workspace="customer" enabled />);
    expect(screen.getByRole("link", { name: /Notifikasi/ }).getAttribute("href")).toBe("/account/notifications");
    expect(screen.getByRole("link", { name: /Inbox/ }).getAttribute("href")).toBe("/account/inbox");
  });
});
