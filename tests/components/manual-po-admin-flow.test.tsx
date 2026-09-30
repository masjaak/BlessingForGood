import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { AdminManualPoPanel } from "@/features/manual-po/manual-po";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

describe("Admin Manual PO flow", () => {
  const createEntry = vi.fn();
  const issueManualPo = vi.fn();
  const setStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createEntry.mockResolvedValue({});
    issueManualPo.mockResolvedValue({ invoiceId: "invoice-manual-1" });
    setStatus.mockResolvedValue({ status: "arrived" });

    vi.mocked(useQuery).mockReturnValue([
      {
        entryId: "manual-1",
        customerUserId: "customer-1",
        title: "Test Book",
        priceAmount: 10000,
        etaText: "Januari 2027",
        status: "active",
        billingStatus: "unbilled",
        invoiceId: null,
        invoiceStatus: null,
        paymentStatus: null,
        outstandingAmount: 0,
        operationalStatus: "unbilled",
        billedAt: null,
        createdAt: 1,
        updatedAt: 1,
        cancelledAt: null,
        archivedAt: null,
      },
    ] as never);

    vi.mocked(useMutation).mockImplementation((mutation) => {
      const name = getFunctionName(mutation as never);
      if (name.endsWith(":create")) return createEntry as never;
      if (name.endsWith(":issueManualPo")) return issueManualPo as never;
      if (name.endsWith(":setStatus")) return setStatus as never;
      throw new Error(`Unexpected Manual PO mutation: ${name}`);
    });
  });

  it("creates Random PO and exposes a real invoice action per item", async () => {
    render(<AdminManualPoPanel customerUserId={"customer-1" as never} />);

    expect(screen.getByLabelText("Judul buku")).toBeTruthy();
    expect(screen.getByLabelText("Harga")).toBeTruthy();
    expect(screen.getByLabelText("ETA")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambahkan Pesanan Khusus" })).toBeTruthy();
    expect(screen.getByText("Menunggu tagihan")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buat tagihan" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Buat tagihan" }));

    await waitFor(() =>
      expect(issueManualPo).toHaveBeenCalledWith({
        entryId: "manual-1",
      }),
    );

    fireEvent.change(screen.getByLabelText("Judul buku"), { target: { value: "Random PO Book" } });
    fireEvent.change(screen.getByLabelText("Harga"), { target: { value: "99000" } });
    fireEvent.change(screen.getByLabelText("ETA"), { target: { value: "Maret 2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan Pesanan Khusus" }));

    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith({
        customerUserId: "customer-1",
        title: "Random PO Book",
        priceAmount: 99000,
        etaText: "Maret 2027",
      }),
    );
  });

  it("lets Admin mark a paid Random PO as received from customer detail", async () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        entryId: "manual-paid",
        customerUserId: "customer-1",
        title: "Paid Book",
        priceAmount: 125000,
        etaText: "April 2027",
        status: "active",
        billingStatus: "billed",
        invoiceId: "invoice-1",
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
    ] as never);

    render(<AdminManualPoPanel customerUserId={"customer-1" as never} />);
    expect(screen.getByText("Sudah lunas · Menunggu datang")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tandai diterima" }));

    await waitFor(() =>
      expect(setStatus).toHaveBeenCalledWith({
        entryId: "manual-paid",
        status: "arrived",
      }),
    );
    expect(screen.getByText("Random PO ditandai diterima. Status customer ikut diperbarui.")).toBeTruthy();
  });
});
