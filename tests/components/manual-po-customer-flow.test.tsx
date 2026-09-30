import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { CustomerManualPoSection } from "@/features/manual-po/manual-po";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

describe("Customer Manual PO tracking", () => {
  it("shows Random PO through paid waiting-arrival and received states", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        entryId: "manual-1",
        customerUserId: "customer-1",
        title: "Waiting Arrival Book",
        priceAmount: 99000,
        etaText: "Maret 2027",
        status: "active",
        billingStatus: "billed",
        invoiceId: "invoice-manual-1",
        invoiceStatus: "issued",
        paymentStatus: "paid",
        outstandingAmount: 0,
        operationalStatus: "paid_waiting_arrival",
        billedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        cancelledAt: null,
        archivedAt: null,
      },
      {
        entryId: "manual-2",
        customerUserId: "customer-1",
        title: "Received Book",
        priceAmount: 125000,
        etaText: "Februari 2027",
        status: "arrived",
        billingStatus: "billed",
        invoiceId: "invoice-manual-2",
        invoiceStatus: "issued",
        paymentStatus: "paid",
        outstandingAmount: 0,
        operationalStatus: "received",
        billedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        cancelledAt: null,
        archivedAt: null,
      },
    ] as never);

    render(<CustomerManualPoSection />);

    expect(screen.getByText("Random PO", { exact: true })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pesanan Khusus" })).toBeTruthy();
    expect(screen.getByText("Waiting Arrival Book")).toBeTruthy();
    expect(screen.getByText("ETA: Maret 2027")).toBeTruthy();
    expect(screen.getByText("Sudah lunas · Menunggu datang")).toBeTruthy();
    expect(screen.getByText("Received Book")).toBeTruthy();
    expect(screen.getByText("Diterima")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Lihat tagihan" })).toHaveLength(2);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
