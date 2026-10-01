import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { CustomerReadyStockOrdersSection } from "@/features/ready-stock/customer-ready-stock-orders";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

describe("Customer Ready Stock timeline", () => {
  it("shows the complete Blessy fulfillment timeline and current state", () => {
    vi.mocked(useQuery).mockReturnValue({
      page: [
        {
          orderId: "ready-order-1",
          listingId: "listing-1",
          invoiceId: "invoice-1",
          customerUserId: "customer-1",
          customerName: "Mulia Kah",
          customerEmail: "mulia@example.com",
          customerMemberCode: "BFG-0001",
          title: "Are We Ready For A Pet?",
          format: "HB",
          unitPriceAmount: 195000,
          quantity: 1,
          totalAmount: 195000,
          operationalStatus: "packing",
          timeline: [
            { key: "waiting_payment", label: "Blessy menunggu pembayaran", state: "complete" },
            { key: "verifying_payment", label: "Blessy memverifikasi pembayaran", state: "complete" },
            { key: "paid", label: "Pembayaran berhasil", state: "complete" },
            { key: "packing", label: "Paket sedang dikemas Blessy", state: "current" },
            { key: "shipping", label: "Paket sedang diantar Blessy", state: "upcoming" },
            { key: "delivered", label: "Paket sampai", state: "upcoming" },
          ],
          invoiceNumber: "BFG-INV-260930-0001",
          invoiceStatus: "issued",
          paymentStatus: "paid",
          outstandingAmount: 0,
          shippingAddress: {
            recipientName: "Mulia Kah",
            recipientPhone: "0812",
            addressLine1: "Jl. Blessy No. 1",
            addressLine2: null,
            city: "Semarang",
            province: "Jawa Tengah",
            postalCode: "50100",
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      isDone: true,
      continueCursor: "",
    } as never);

    render(<CustomerReadyStockOrdersSection />);

    expect(screen.getByRole("heading", { name: "Pesanan Ready Stock kamu" })).toBeTruthy();
    expect(screen.getByText("Are We Ready For A Pet?")).toBeTruthy();
    expect(screen.getByText("Blessy menunggu pembayaran")).toBeTruthy();
    expect(screen.getByText("Blessy memverifikasi pembayaran")).toBeTruthy();
    expect(screen.getByText("Pembayaran berhasil")).toBeTruthy();
    expect(screen.getByText("Paket sedang dikemas Blessy")).toBeTruthy();
    expect(screen.getByText("Paket sedang diantar Blessy")).toBeTruthy();
    expect(screen.getByText("Paket sampai")).toBeTruthy();
    expect(screen.getByText("Sekarang")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat tagihan" }).getAttribute("href")).toBe(
      "/account/invoices/invoice-1",
    );
  });
});
