import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityCenter } from "@/components/activity-center";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => [
    {
      notificationId: "notice-1",
      createdAt: Date.parse("2026-08-15T00:00:00.000Z"),
      title: "Pesanan diperbarui",
      body: "Status pesananmu berubah.",
      destination: "/account/orders",
      readAt: null,
    },
  ]),
}));

describe("compact ActivityCenter", () => {
  it("keeps Notification and Inbox as separate tabs with owned destinations", () => {
    render(
      <ActivityCenter compact counts={{ notification: 3, inbox: 2 }} surface="notification" workspace="customer" />,
    );

    expect(screen.getByRole("tab", { name: /Notifikasi.*3/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Kotak masuk.*2/ }).getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("link", { name: "Lihat semua notifikasi" }).getAttribute("href")).toBe(
      "/account/notifications",
    );

    fireEvent.click(screen.getByRole("tab", { name: /Kotak masuk/ }));
    expect(screen.getByRole("tab", { name: /Kotak masuk.*2/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: "Buka Kotak Masuk" }).getAttribute("href")).toBe("/account/inbox");
  });
});
