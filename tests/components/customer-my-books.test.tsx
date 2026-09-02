import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrdersPage from "@/app/account/orders/page";
import { useQuery } from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

beforeEach(() => {
  vi.mocked(useQuery).mockReturnValue({
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
  } as never);
});

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
    expect(document.querySelector(".my-books-batch-range")?.textContent).toMatch(/–/);
    expect(document.querySelector(".my-books-batch-footer .my-books-batch-cta")).toBeTruthy();
  });
});
