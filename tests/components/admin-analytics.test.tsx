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
  periodDays: 30 as const,
  trackingStartedAt: Date.UTC(2026, 8, 22),
  metrics: { addActions: 3, interestedCustomers: 2, unconvertedIntents: 2, convertedIntents: 1 },
  trends: {
    buckets: [{ startAt: Date.UTC(2026, 8, 22), endAt: Date.UTC(2026, 8, 23) }],
    addActions: [3],
    interestedCustomers: [2],
    unconvertedIntents: [2],
    convertedIntents: [1],
  },
  books: [
    {
      intentCount: 2,
      distinctCustomerCount: 2,
      unconvertedCount: 1,
      convertedCount: 1,
      bookTitle: "The Useful Book",
      format: "PB",
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
      statusCounts: { in_cart: 1, converted: 0, removed: 0, unconverted: 0 },
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
    expect(document.querySelectorAll(".analytics-skeleton-trend")).toHaveLength(4);
    expect(document.querySelectorAll(".workspace-skeleton-table-card")).toHaveLength(2);
  });

  it("renders metrics, BFGSelect, interest, and customer activity", () => {
    analyticsState = { status: "success", data };
    render(<AdminAnalyticsContent />);

    expect(screen.getByRole("heading", { name: "Analytics" })).toBeTruthy();
    expect(screen.getByText("Lihat minat Customer dari aktivitas keranjang sebelum menjadi pesanan.")).toBeTruthy();
    expect(screen.getByText(/Cohort memakai bukti pertama nyata/)).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Periode analytics" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Tren Add ke keranjang 30 hari terakhir" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Tren Customer berminat 30 hari terakhir" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Tren Belum checkout 30 hari terakhir" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Tren Menjadi pesanan 30 hari terakhir" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Buku paling diminati" })).toBeTruthy();
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

  it("keeps current-cart activity visible when no tracked add exists", () => {
    analyticsState = {
      status: "success",
      data: {
        ...data,
        trackingStartedAt: null,
        metrics: { addActions: 0, interestedCustomers: 0, unconvertedIntents: 0, convertedIntents: 0 },
        books: [],
      },
    };
    render(<AdminAnalyticsContent />);

    expect(screen.getByRole("heading", { name: "Aktivitas Customer" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Undo" })).toBeTruthy();
    expect(screen.getByText(/Cohort memakai bukti pertama nyata/)).toBeTruthy();
    expect(screen.queryByText("Belum ada aktivitas keranjang")).toBeNull();
  });
});
