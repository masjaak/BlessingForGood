import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import AdminRandomPoPage from "@/app/admin/random-po/page";

vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav /> }));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));

const entries = [
  { entryId: "a", title: "Book A", priceAmount: 600000, queueStatus: "unbilled", invoiceId: null },
  { entryId: "b", title: "Book B", priceAmount: 200000, queueStatus: "unbilled", invoiceId: null },
  { entryId: "c", title: "Book C", priceAmount: 100000, queueStatus: "awaiting_payment", invoiceId: "old" },
].map((entry) => ({ ...entry, etaText: "April 2027", outstandingAmount: 0, createdAt: Date.now() }));

const queue = {
  customers: [
    {
      customerUserId: "customer",
      customerName: "Customer",
      memberCode: "BF-001",
      customerEmail: "test@example.com",
      itemCount: 3,
      totalAmount: 900000,
      unbilledCount: 2,
      awaitingPaymentCount: 1,
      paymentSubmittedCount: 0,
      paidCount: 0,
      receivedCount: 0,
      entries,
    },
  ],
  summary: {
    customerCount: 1,
    itemCount: 3,
    totalAmount: 900000,
    unbilledCount: 2,
    awaitingPaymentCount: 1,
    paymentSubmittedCount: 0,
    paidCount: 0,
    receivedCount: 0,
    outstandingAmount: 100000,
  },
  truncated: false,
};

describe("BFG-TCK-002 Random PO bulk invoices", () => {
  const issue = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    issue.mockResolvedValue({ invoiceId: "new" });
    vi.mocked(useQuery).mockReturnValue(queue as never);
    vi.mocked(useMutation).mockImplementation((mutation) => {
      const name = getFunctionName(mutation as never);
      if (name.endsWith(":issueManualPo")) return issue as never;
      if (name.endsWith(":setStatus")) return vi.fn() as never;
      throw new Error(name);
    });
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  });

  it("only issues the eligible checked Random PO entries", async () => {
    render(<AdminRandomPoPage />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    fireEvent.click(screen.getByRole("checkbox", { name: "Pilih semua Random PO eligible" }));
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan Invoice Terpilih" }));
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan 2 invoice" }));
    await waitFor(() => expect(issue).toHaveBeenCalledTimes(2));
    expect(issue.mock.calls.map((call) => call[0])).toEqual([{ entryId: "a" }, { entryId: "b" }]);
  });
});
