import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import CustomerInvoiceDetailPage from "@/app/account/invoices/[invoiceId]/page";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/back-button", () => ({
  BackButton: () => null,
}));

const invoice = {
  invoiceId: "invoice-1",
  invoiceNumber: "BFG-INV-261001-0014",
  source: "order",
  customerName: "Meilinda Suriany 8218",
  currency: "IDR",
  totalAmount: 895000,
  status: "issued",
  paymentStatus: "unpaid",
  items: [
    {
      invoiceItemId: "item-1",
      quantity: 1,
      description: "Test Book",
      subtotalAmount: 895000,
    },
  ],
  depositRequiredAmount: 268500,
  minimumPaymentAmount: 268500,
  allocatedDepositAmount: 0,
  verifiedPaymentAmount: 0,
  outstandingAmount: 895000,
  orderId: "order-1",
  orderCode: "BFG-ORD-1",
};

describe("Customer payment amount guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useQuery).mockReturnValue(null as never);
    vi.mocked(useAuth).mockReturnValue({
      getToken: vi.fn(),
      sessionClaims: {},
    } as never);
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useOperations).mockReturnValue({
      currentCustomerInvoice: invoice,
      customerAccount: { account: { availableAmount: 0, reservedAmount: 0 } },
      customerTransactions: { page: [] },
      customerAllocations: [],
      customerPaymentConfirmations: [],
      submitPaymentConfirmation: vi.fn(),
    } as never);
  });

  it("keeps submit disabled below DP and enables it for a valid above-DP amount", () => {
    render(<CustomerInvoiceDetailPage />);

    const amountInput = screen.getByLabelText(/Jumlah dibayar/i);
    const submit = screen.getByRole("button", { name: "Kirim konfirmasi" });

    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(amountInput, { target: { value: "200000" } });
    expect(screen.getByText(/belum memenuhi minimal pembayaran Rp 268\.500/i)).toBeTruthy();
    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(amountInput, { target: { value: "300000" } });
    expect(screen.getByText(/Rp 300\.000 otomatis mengurangi sisa tagihan/i)).toBeTruthy();
    expect(submit).toHaveProperty("disabled", false);
  });

  it("blocks amounts above the current outstanding invoice", () => {
    render(<CustomerInvoiceDetailPage />);

    const amountInput = screen.getByLabelText(/Jumlah dibayar/i);
    fireEvent.change(amountInput, { target: { value: "900000" } });

    expect(screen.getByText(/tidak boleh melebihi sisa tagihan Rp 895\.000/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kirim konfirmasi" })).toHaveProperty("disabled", true);
  });
});
