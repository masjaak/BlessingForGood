import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery_experimental as useQueryState } from "convex/react";
import { AdminAnalyticsContent } from "@/features/admin-analytics/admin-analytics";

let analyticsState: { status: "pending" } | { status: "error"; error: Error } | { status: "success"; data: unknown } = {
  status: "pending",
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics",
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery_experimental: vi.fn(({ args }: { args: unknown }) => {
    if (args && typeof args === "object" && "days" in args) return analyticsState;
    return { status: "success", data: 0 };
  }),
}));

const data = {
  metrics: { addActions: 3, interestedCustomers: 2, unconvertedIntents: 2, convertedIntents: 1 },
  books: [
    {
      bookTitle: "The Useful Book",
      format: "PB",
      addActions: 2,
      customers: 2,
      convertedIntents: 1,
      conversionRate: 0.5,
    },
  ],
  customers: [
    {
      customerId: "customer-1",
      name: "Undo",
      memberCode: "undo-0001",
      itemCount: 1,
      quantity: 2,
      lastActivityAt: Date.now(),
      status: "in_cart" as const,
      items: [{ title: "The Useful Book", quantity: 2 }],
    },
  ],
  customerActivityTruncated: false,
};

describe("Admin Analytics V1", () => {
  beforeEach(() => {
    analyticsState = { status: "pending" };
    vi.mocked(useQueryState).mockClear();
  });

  it("renders the route-aware loading anatomy", () => {
    render(<AdminAnalyticsContent />);

    expect(screen.getByLabelText("Memuat analytics")).toBeTruthy();
    expect(document.querySelector(".page-header[aria-busy='true']")).toBeTruthy();
    expect(document.querySelectorAll(".workspace-skeleton-metric")).toHaveLength(4);
    expect(document.querySelectorAll(".workspace-skeleton-table-card")).toHaveLength(2);
  });

  it("renders metrics, BFGSelect, interest, and customer activity", () => {
    analyticsState = { status: "success", data };
    render(<AdminAnalyticsContent />);

    expect(screen.getByRole("heading", { name: "Analytics" })).toBeTruthy();
    expect(screen.getByText("Lihat minat Customer dari aktivitas keranjang sebelum menjadi pesanan.")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Periode analytics" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Buku paling sering masuk keranjang" })).toBeTruthy();
    expect(screen.getByText("The Useful Book")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Aktivitas Customer" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Undo" }).getAttribute("href")).toBe("/admin/customers/customer-1");

    fireEvent.click(screen.getByRole("combobox", { name: "Periode analytics" }));
    expect(screen.getByRole("option", { name: "7 hari terakhir" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "7 hari terakhir" }));
    expect(vi.mocked(useQueryState).mock.calls.some(([call]) => JSON.stringify(call).includes('"days":7'))).toBe(true);
  });

  it("uses the safe error and empty states", () => {
    analyticsState = { status: "error", error: new Error("raw Convex details") };
    const { rerender } = render(<AdminAnalyticsContent />);
    expect(screen.getByRole("alert").textContent).toContain("Data analytics belum berhasil dimuat.");
    expect(screen.getByRole("alert").textContent).not.toContain("raw Convex details");

    analyticsState = {
      status: "success",
      data: {
        ...data,
        metrics: { addActions: 0, interestedCustomers: 0, unconvertedIntents: 0, convertedIntents: 0 },
        books: [],
        customers: [],
      },
    };
    rerender(<AdminAnalyticsContent />);
    expect(screen.getByText("Belum ada aktivitas keranjang")).toBeTruthy();
  });
});
