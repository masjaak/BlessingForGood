import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityCenter } from "@/components/activity-center";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => [
    {
      sourceId: "notice-1",
      timestamp: Date.parse("2026-08-15T00:00:00.000Z"),
      type: "system",
      title: "Pesanan diperbarui",
      description: "Status pesananmu berubah.",
      destination: "/account/orders",
      readAt: null,
    },
    {
      sourceId: "message-1",
      timestamp: Date.parse("2026-08-16T00:00:00.000Z"),
      type: "message",
      title: "Akses katalog diberikan",
      description: "Katalog baru tersedia.",
      destination: "/catalog",
      readAt: 1,
    },
  ]),
}));

describe("compact ActivityCenter", () => {
  it("renders system and message records in one chronological feed", () => {
    const { container } = render(<ActivityCenter compact onClose={vi.fn()} workspace="customer" />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("Sistem")).toBeTruthy();
    expect(screen.getByText("Pesan BFG")).toBeTruthy();
    expect(screen.getByText("Baru")).toBeTruthy();
    expect(screen.getByLabelText("Belum dibaca")).toBeTruthy();
    const cards = container.querySelectorAll(".activity-card");
    expect(cards[0]?.querySelector(".activity-unread-marker")).toBeTruthy();
    expect(cards[1]?.querySelector(".activity-unread-marker")).toBeNull();
    expect(screen.getByRole("link", { name: "Lihat semua aktivitas" }).getAttribute("href")).toBe(
      "/account/notifications",
    );
    expect(screen.queryByRole("link", { name: "Buka Kotak Masuk" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tutup Aktivitas" })).toBeTruthy();
  });
});
