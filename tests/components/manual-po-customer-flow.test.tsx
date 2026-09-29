import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { CustomerManualPoSection } from "@/features/manual-po/manual-po";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

describe("Customer Manual PO final view", () => {
  it("shows only the running random PO summary with title, ETA, and price", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        entryId: "manual-1",
        customerUserId: "customer-1",
        title: "Random PO Book",
        priceAmount: 99000,
        etaText: "Maret 2027",
        status: "active",
        billingStatus: "billed",
        invoiceId: "invoice-manual-1",
        billedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        cancelledAt: null,
        archivedAt: null,
      },
    ] as never);

    render(<CustomerManualPoSection />);

    expect(screen.getByText("Random PO berjalan", { exact: true })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pesanan Khusus" })).toBeTruthy();
    expect(screen.getByText("Random PO Book")).toBeTruthy();
    expect(screen.getByText("ETA: Maret 2027")).toBeTruthy();
    expect(screen.getByText("Rp 99.000")).toBeTruthy();
    expect(screen.getByText("Tagihan tersedia")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat tagihan" }).getAttribute("href")).toBe(
      "/account/invoices/invoice-manual-1",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
