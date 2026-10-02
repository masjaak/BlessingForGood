import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPaymentsPage from "@/app/admin/payments/page";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

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

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

const confirmation = {
  confirmationId: "payment-1",
  invoiceId: "invoice-1",
  amount: 300000,
  paymentMethod: "Transfer bank",
  transferReference: "202610012031518870",
  paidAt: "2026-10-01T00:00:00.000Z",
  proofReference: null,
  proofUrl: "https://example.com/proof.jpg",
  customerNote: "DP inv 261001 0014",
  status: "under_review",
  submittedAt: "2026-10-01T13:35:14.000Z",
  reviewedAt: null,
  reviewedByUserId: null,
  reviewNote: null,
  rejectionReason: null,
  createdAt: "2026-10-01T13:35:14.000Z",
  updatedAt: "2026-10-01T13:35:14.000Z",
  invoice: {
    invoiceId: "invoice-1",
    invoiceNumber: "BFG-INV-261001-0014",
    orderId: "order-1",
    customerName: "Meilinda Suriany 8218",
    customerEmail: "hui2meil@gmail.com",
    status: "issued",
    paymentStatus: "payment_submitted",
    totalAmount: 895000,
    adjustedTotalAmount: 895000,
    depositRequiredAmount: 268500,
    allocatedDepositAmount: 0,
    verifiedPaymentAmount: 0,
    outstandingAmount: 895000,
    minimumPaymentAmount: 268500,
    overpaymentAmount: 0,
    refundObligationAmount: 0,
    refundObligationStatus: "none",
  },
};

describe("Admin payment review settlement preview", () => {
  const approvePaymentConfirmation = vi.fn();
  const startPaymentReview = vi.fn();
  const rejectPaymentConfirmation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    approvePaymentConfirmation.mockResolvedValue({});
    startPaymentReview.mockResolvedValue({});
    rejectPaymentConfirmation.mockResolvedValue({});
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useOperations).mockReturnValue({
      adminPaymentQueue: [confirmation],
      adminPaymentHistory: { page: [] },
      approvePaymentConfirmation,
      startPaymentReview,
      rejectPaymentConfirmation,
    } as never);
  });

  it("shows the exact remaining balance before Admin approves an above-DP payment", async () => {
    render(<AdminPaymentsPage />);

    expect(screen.getByText("Jika pembayaran disetujui")).toBeTruthy();
    expect(screen.getByText("Rp 595.000")).toBeTruthy();
    expect(
      screen.getByText(/Rp 300\.000 akan masuk sebagai pembayaran terverifikasi dan otomatis mengurangi sisa invoice/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Setujui pembayaran" }));

    await waitFor(() =>
      expect(approvePaymentConfirmation).toHaveBeenCalledWith("payment-1", undefined),
    );
  });

  it("blocks approval when a pending confirmation is larger than the current outstanding balance", () => {
    vi.mocked(useOperations).mockReturnValue({
      adminPaymentQueue: [
        {
          ...confirmation,
          amount: 900000,
        },
      ],
      adminPaymentHistory: { page: [] },
      approvePaymentConfirmation,
      startPaymentReview,
      rejectPaymentConfirmation,
    } as never);

    render(<AdminPaymentsPage />);

    expect(screen.getByText(/lebih besar dari sisa invoice saat ini/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Setujui pembayaran" })).toHaveProperty("disabled", true);
  });
});
