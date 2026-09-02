import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerInvoicesPage from "@/app/account/invoices/page";
import { useOperations } from "@/domain/prototype/operations-context";

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

describe("Customer invoice payment visibility", () => {
  beforeEach(() => {
    vi.mocked(useOperations).mockReturnValue({
      customerInvoiceList: {
        page: [
          {
            invoiceId: "invoice-unpaid",
            invoiceNumber: "BFG-INV-UNPAID",
            status: "issued",
            paymentStatus: "unpaid",
            totalAmount: 100000,
            customerName: "Invoice Customer",
            orderId: "order-unpaid",
            orderCode: "BFG-ORD-UNPAID",
            items: [],
            depositRequiredAmount: 0,
            allocatedDepositAmount: 0,
            outstandingAmount: 100000,
            verifiedPaymentAmount: 0,
          },
          {
            invoiceId: "invoice-partial",
            invoiceNumber: "BFG-INV-PARTIAL",
            status: "issued",
            paymentStatus: "partially_paid",
            totalAmount: 100000,
            customerName: "Invoice Customer",
            orderId: "order-partial",
            orderCode: "BFG-ORD-PARTIAL",
            items: [],
            depositRequiredAmount: 0,
            allocatedDepositAmount: 50000,
            outstandingAmount: 50000,
            verifiedPaymentAmount: 0,
          },
          {
            invoiceId: "invoice-paid",
            invoiceNumber: "BFG-INV-PAID",
            status: "issued",
            paymentStatus: "paid",
            totalAmount: 100000,
            customerName: "Invoice Customer",
            orderId: "order-paid",
            orderCode: "BFG-ORD-PAID",
            items: [],
            depositRequiredAmount: 0,
            allocatedDepositAmount: 100000,
            outstandingAmount: 0,
            verifiedPaymentAmount: 0,
          },
        ],
      },
    } as never);
  });

  it("shows unpaid, partial, and paid status labels on the customer invoice list", () => {
    render(<CustomerInvoicesPage />);

    expect(screen.getByText(/Perlu dibayar/)).toBeTruthy();
    expect(screen.getByText(/Dibayar sebagian/)).toBeTruthy();
    expect(screen.getByText(/Lunas terverifikasi/)).toBeTruthy();
    expect(screen.getAllByText("Deposit teralokasi")).toHaveLength(3);
    expect(screen.getAllByText("Sisa tagihan")).toHaveLength(3);
    expect(screen.getAllByText("Status pembayaran")).toHaveLength(3);
    expect(screen.getAllByText("Terverifikasi")).toHaveLength(3);
    expect(screen.queryByText("Deposit teralokasi · sisa tagihan")).toBeNull();
    expect(screen.queryByText("Status pembayaran · terverifikasi")).toBeNull();
  });
});
