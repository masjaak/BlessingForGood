import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
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
    ...Array.from({ length: 3 }, (_, index) => ({
      sourceId: `notice-${index + 2}`,
      timestamp: Date.parse(`2026-08-${10 + index}T00:00:00.000Z`),
      type: "system" as const,
      title: `Aktivitas ${index + 3}`,
      description: "Pembaruan tambahan.",
      destination: "/account/orders",
      readAt: 1,
    })),
  ]),
}));

describe("compact ActivityCenter", () => {
  it("renders system and message records in one chronological feed", () => {
    const { container } = render(<ActivityCenter compact onClose={vi.fn()} workspace="customer" />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getAllByText("Sistem").length).toBeGreaterThan(0);
    expect(screen.getByText("Pesan BFG")).toBeTruthy();
    expect(screen.getByText("Baru · Belum dibaca")).toBeTruthy();
    expect(screen.getByLabelText("Belum dibaca")).toBeTruthy();
    const cards = container.querySelectorAll(".activity-card");
    expect(cards).toHaveLength(3);
    expect(cards[0]?.querySelector(".activity-unread-marker")).toBeTruthy();
    expect(cards[1]?.querySelector(".activity-unread-marker")).toBeNull();
    expect(cards[0]?.getAttribute("data-read-state")).toBe("unread");
    expect(cards[1]?.getAttribute("data-read-state")).toBe("read");
    expect(screen.getByText("Baru · Belum dibaca")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat semua aktivitas" }).getAttribute("href")).toBe(
      "/account/notifications",
    );
    expect(screen.queryByRole("link", { name: "Buka Kotak Masuk" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tutup Aktivitas" })).toBeTruthy();
  });

  it("keeps the full Activity page history and detail actions", () => {
    const { container } = render(<ActivityCenter workspace="customer" />);

    expect(container.querySelectorAll(".activity-card")).toHaveLength(5);
    expect(screen.getAllByRole("link", { name: "Buka detail" })).toHaveLength(5);
    expect(screen.getAllByText("Pembaruan tambahan.")).toHaveLength(3);
  });

  it("keeps the empty preview inside the same panel contract", () => {
    vi.mocked(useQuery).mockReturnValueOnce([]);
    const { container } = render(<ActivityCenter compact workspace="customer" />);

    expect(screen.getByText("Belum ada aktivitas")).toBeTruthy();
    expect(container.querySelectorAll(".activity-card")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Lihat semua aktivitas" })).toBeTruthy();
  });
});
