import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrdersPage from "@/app/account/orders/page";
import { useQuery } from "convex/react";
import { getFunctionName } from "convex/server";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

const overview = {
  totalSpending: 325000,
  pendingPayment: 125000,
  totalDeposit: 200000,
  batches: [
    {
      batchId: "batch-1",
      name: "September Series",
      referenceCode: "BFG-BAT-001",
      currentShipmentStage: "po_closed",
      bookCount: 2,
      orderCount: 1,
      totalAmount: 325000,
      items: [],
      poDeadlineAt: Date.parse("2030-09-20T00:00:00+07:00"),
      etaCargoMonth: "2030-11",
    },
  ],
};

const randomPo = [
  {
    entryId: "manual-1",
    customerUserId: "customer-1",
    title: "Random PO Book",
    priceAmount: 99000,
    etaText: "Maret 2027",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    cancelledAt: null,
    archivedAt: null,
  },
];

beforeEach(() => {
  vi.mocked(useQuery).mockReset();
  mockQueries(overview);
});

function mockQueries(bookOverview: typeof overview | undefined) {
  vi.mocked(useQuery).mockImplementation((...args: Parameters<typeof useQuery>) => {
    const name = getFunctionName(args[0]);
    if (name === "batchTracking:getBookOverview") return bookOverview;
    if (name === "manualPoEntries:listMine") return randomPo;
    if (name === "readyStockOrders:listMine") return { page: [], isDone: true, continueCursor: "" };
    throw new Error(`Unexpected query: ${name}`);
  });
}

describe("Customer Buku Saya layout contract", () => {
  it("keeps summary copy vertical and separates the readable batch range", () => {
    render(<CustomerOrdersPage />);

    const cards = [...document.querySelectorAll<HTMLElement>(".my-books-summary-card")];
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => [...card.children].map((child) => child.className))).toEqual([
      ["card-kicker my-books-summary-label", "metric-money my-books-summary-value", "subtle my-books-summary-help"],
      ["card-kicker my-books-summary-label", "metric-money my-books-summary-value", "subtle my-books-summary-help"],
      ["card-kicker my-books-summary-label", "metric-money my-books-summary-value", "subtle my-books-summary-help"],
    ]);
    expect(screen.getByText("TOTAL SPENDING")).toBeTruthy();
    expect(screen.getByText("Total tagihan buku yang sudah di-fix")).toBeTruthy();
    expect(screen.getByText("Sisa tagihan keseluruhan dari invoice terbit")).toBeTruthy();
    expect(screen.getByText("Top up credit")).toBeTruthy();
    expect(screen.getByText("Random PO Book")).toBeTruthy();
    expect(document.querySelector(".my-books-batch-range")?.textContent).toMatch(/–/);
    expect(document.querySelector(".my-books-batch-footer .my-books-batch-cta")).toBeTruthy();
  });

  it("keeps Buku Saya overview accessible when Random PO rendering fails", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      vi.mocked(useQuery).mockImplementation((...args: Parameters<typeof useQuery>) => {
        const name = getFunctionName(args[0]);
        if (name === "batchTracking:getBookOverview") return overview;
        if (name === "readyStockOrders:listMine") return { page: [], isDone: true, continueCursor: "" };
        if (name === "manualPoEntries:listMine") throw new Error("Simulated Random PO failure");
        throw new Error(`Unexpected query: ${name}`);
      });
      render(<CustomerOrdersPage />);
      expect(screen.getByText("TOTAL SPENDING")).toBeTruthy();
      expect(screen.getByRole("alert").textContent).toContain("Random PO");
      expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy();
    } finally {
      errorLog.mockRestore();
    }
  });

  it("keeps Random PO visible even while the regular order overview is still loading", () => {
    vi.mocked(useQuery).mockReset();
    mockQueries(undefined);

    render(<CustomerOrdersPage />);

    expect(screen.getByRole("heading", { name: "Pesanan Khusus" })).toBeTruthy();
    expect(screen.getByText("Random PO Book")).toBeTruthy();
    expect(screen.getByText("ETA: Maret 2027")).toBeTruthy();
    expect(screen.getByText("Rp 99.000")).toBeTruthy();
    expect(screen.getByLabelText("Memuat Buku Saya")).toBeTruthy();
  });
});
