import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceActions } from "@/components/workspace-actions";

vi.mock("convex/react", () => ({
  useQuery: vi.fn((_query, args) => (args === "skip" ? undefined : 2)),
}));

describe("authenticated workspace actions", () => {
  it("exposes one combined activity trigger for Admin", () => {
    render(<WorkspaceActions workspace="admin" enabled />);
    expect(screen.getByRole("button", { name: /Aktivitas.*4 belum dibaca/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak masuk/ })).toBeNull();
  });

  it("exposes one combined activity trigger for Customer", () => {
    render(<WorkspaceActions workspace="customer" enabled />);
    expect(screen.getByRole("button", { name: /Aktivitas.*4 belum dibaca/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak masuk/ })).toBeNull();
  });
});
