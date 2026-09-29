import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import AdminRandomPoPage from "@/app/admin/random-po/page";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

const queue = {
  customers: [
    {
      customerUserId: "customer-1",
      customerName: "Mulia Kah",
      customerEmail: "mulia@example.com",
      memberCode: "BFG-0001",
      latestCreatedAt: Date.parse("2026-09-29T00:00:00Z"),
      itemCount: 2,
      totalAmount: 30000,
      unbilledCount: 1,
      awaitingPaymentCount: 1,
      paymentSubmittedCount: 0,
      paidCount: 0,
      entries: [
        {
          entryId: "manual-1",
          customerUserId: "customer-1",
          customerName: "Mulia Kah",
          customerEmail: "mulia@example.com",
          memberCode: "BFG-0001",
          title: "TEST BOOK 3",
          priceAmount: 20000,
          etaText: "Oktober 2026",
          queueStatus: "unbilled",
          invoiceId: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentStatus: null,
          outstandingAmount: 0,
          createdAt: Date.parse("2026-09-29T00:00:00Z"),
          updatedAt: Date.parse("2026-09-29T00:00:00Z"),
        },
        {
          entryId: "manual-2",
          customerUserId: "customer-1",
          customerName: "Mulia Kah",
          customerEmail: "mulia@example.com",
          memberCode: "BFG-0001",
          title: "TEST BOOK 2",
          priceAmount: 10000,
          etaText: "Oktober 2026",
          queueStatus: "awaiting_payment",
          invoiceId: "invoice-1",
          invoiceNumber: "BFG-INV-260929-0001",
          invoiceStatus: "issued",
          paymentStatus: "unpaid",
          outstandingAmount: 10000,
          createdAt: Date.parse("2026-09-28T00:00:00Z"),
          updatedAt: Date.parse("2026-09-28T00:00:00Z"),
        },
      ],
    },
  ],
  summary: {
    customerCount: 1,
    itemCount: 2,
    totalAmount: 30000,
    unbilledCount: 1,
    awaitingPaymentCount: 1,
    paymentSubmittedCount: 0,
    paidCount: 0,
    outstandingAmount: 10000,
  },
  truncated: false,
};

describe("Admin Random PO operational queue", () => {
  const issueManualPo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    issueManualPo.mockResolvedValue({ invoiceId: "invoice-new" });
    vi.mocked(useQuery).mockReturnValue(queue as never);
    vi.mocked(useMutation).mockReturnValue(issueManualPo as never);
  });

  it("lists customers, statuses, and the operational actions Admin needs", () => {
    render(<AdminRandomPoPage />);

    expect(screen.getByRole("heading", { name: "Antrian Pesanan Khusus" })).toBeTruthy();
    const summaryCards = Array.from(document.querySelectorAll<HTMLElement>(".random-po-summary-card"));
    expect(summaryCards).toHaveLength(5);
    expect(summaryCards.map((card) => Array.from(card.children).map((child) => child.className))).toEqual([
      ["card-kicker", "metric-money", "subtle"],
      ["card-kicker", "metric-money", "subtle"],
      ["card-kicker", "metric-money", "subtle"],
      ["card-kicker", "metric-money", "subtle"],
      ["card-kicker", "metric-money", "subtle"],
    ]);
    expect(screen.getByRole("heading", { name: "Mulia Kah" })).toBeTruthy();
    expect(screen.getByText("BFG-0001")).toBeTruthy();
    expect(screen.getByText("TEST BOOK 3")).toBeTruthy();
    expect(screen.getByText("TEST BOOK 2")).toBeTruthy();
    expect(screen.getAllByText("Belum ditagih")).toHaveLength(2);
    expect(screen.getByText("Menunggu pembayaran")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buat tagihan" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Buka tagihan" }).getAttribute("href")).toBe("/admin/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "Buka pelanggan" }).getAttribute("href")).toBe(
      "/admin/customers/customer-1#manual-po",
    );
  });

  it("can issue an invoice directly from the queue", async () => {
    render(<AdminRandomPoPage />);

    fireEvent.click(screen.getByRole("button", { name: "Buat tagihan" }));

    await waitFor(() => expect(issueManualPo).toHaveBeenCalledWith({ entryId: "manual-1" }));
    expect(screen.getByText("Tagihan Random PO berhasil diterbitkan.")).toBeTruthy();
  });

  it("passes search and status filter values to the queue query", () => {
    render(<AdminRandomPoPage />);

    fireEvent.change(screen.getByPlaceholderText("Nama, email, kode anggota, judul, atau ETA"), {
      target: { value: "Mulia" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Status operasional PO Random" }));
    fireEvent.click(screen.getByRole("option", { name: "Belum ditagih" }));

    expect(vi.mocked(useQuery).mock.calls.at(-1)?.[1]).toMatchObject({
      search: "Mulia",
      status: "unbilled",
    });
  });
});
