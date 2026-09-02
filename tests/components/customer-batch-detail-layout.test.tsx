import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerBatchDetailPage from "@/app/account/batches/[batchId]/page";
import { useQuery } from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ batchId: "batch-1" }),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

beforeEach(() => {
  vi.mocked(useQuery).mockReturnValue({
    batchId: "batch-1",
    name: "September Series",
    description: "Series batch",
    referenceCode: "BFG-BAT-001",
    currentShipmentStage: "po_closed",
    etaCargoMonth: "2030-11",
    items: [
      {
        assignmentId: "assignment-1",
        title: "Series One",
        publisher: "BFG Press",
        format: "PB",
        isbn: "9780000000001",
        quantity: 1,
        unitPriceAmount: 125000,
        coverUrl: null,
        batchStatus: "po_closed",
        orderStatus: "submitted",
      },
      {
        assignmentId: "assignment-2",
        title: "Series Two",
        publisher: "BFG Press",
        format: "PB",
        isbn: "9780000000002",
        quantity: 2,
        unitPriceAmount: 150000,
        coverUrl: null,
        batchStatus: "po_closed",
        orderStatus: "submitted",
      },
    ],
    availableItems: [],
    history: [],
  } as never);
});

describe("Customer Batch detail layout contract", () => {
  it("keeps search, book metadata, price, and status in explicit regions", () => {
    render(<CustomerBatchDetailPage />);

    expect(document.querySelector(".customer-batch-detail-page")).toBeTruthy();
    expect(document.querySelector(".customer-batch-detail-search")).toBeTruthy();
    expect(document.querySelector(".customer-batch-detail-book-list")).toBeTruthy();
    expect(document.querySelectorAll(".customer-batch-book-row")).toHaveLength(2);
    expect(document.querySelectorAll(".customer-batch-book-meta")).toHaveLength(2);
    expect(document.querySelectorAll(".customer-batch-book-price")).toHaveLength(2);
    expect(document.querySelectorAll(".customer-batch-book-status")).toHaveLength(2);
    expect(document.querySelectorAll(".customer-batch-book-price")[0]?.textContent).toMatch(/1 ×.*Rp 125\.000/);
    expect(document.querySelectorAll(".customer-batch-book-price")[1]?.textContent).toMatch(/2 ×.*Rp 150\.000/);
  });
});
