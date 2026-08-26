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
    expect(screen.getByText("1 belum dibaca")).toBeTruthy();
    expect(screen.getByText("Status pesananmu berubah.")).toBeTruthy();
    expect(screen.getByText("Baru · Belum dibaca")).toBeTruthy();
    expect(screen.getByLabelText("Belum dibaca")).toBeTruthy();
    const rows = container.querySelectorAll(".activity-preview-row");
    expect(rows).toHaveLength(3);
    expect(container.querySelectorAll(".activity-card")).toHaveLength(0);
    expect(rows[0]?.querySelector(".activity-preview-unread")).toBeTruthy();
    expect(rows[1]?.querySelector(".activity-preview-unread")).toBeNull();
    expect(rows[0]?.getAttribute("data-read-state")).toBe("unread");
    expect(rows[1]?.getAttribute("data-read-state")).toBe("read");
    expect(rows[0]?.getAttribute("href")).toBe("/account/orders");
    expect(screen.getByText("Baru · Belum dibaca")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat semua aktivitas" }).getAttribute("href")).toBe(
      "/account/notifications",
    );
    expect(screen.queryByRole("link", { name: "Buka detail" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Buka Kotak Masuk" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tutup Aktivitas" })).toBeTruthy();
    expect(screen.queryByText("Sistem dan pesan BFG tampil dalam satu urutan waktu.")).toBeNull();
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

  it("keeps complete notification copy in the compact preview", () => {
    vi.mocked(useQuery).mockReturnValueOnce([
      {
        sourceId: "long-notice",
        timestamp: Date.parse("2026-08-17T00:00:00.000Z"),
        type: "system",
        title: "Pesanan siap diproses",
        description: "Angelina Cynthia mengirim permintaan bergabung dengan catatan operasional yang lengkap.",
        destination: "/admin/join-requests",
        readAt: null,
      },
    ]);

    render(<ActivityCenter compact workspace="admin" />);

    expect(
      screen.getByText("Angelina Cynthia mengirim permintaan bergabung dengan catatan operasional yang lengkap."),
    ).toBeTruthy();
    expect(screen.getByText("1 belum dibaca")).toBeTruthy();
  });
});
