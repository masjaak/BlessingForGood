import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";
import AdminInvoiceDetailPage from "@/app/admin/invoices/[invoiceId]/page";
import CustomerInvoiceDetailPage from "@/app/account/invoices/[invoiceId]/page";

vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(), sessionClaims: null }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ invoiceId: "invoice-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/domain/prototype/operations-context", () => ({ useOperations: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav /> }));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));

const invoice = {
  invoiceId: "invoice-1",
  invoiceNumber: "BFG-INV-261013-0001",
  source: "order",
  orderCode: "BFG-ORD-1234",
  orderId: null,
  customerName: "Reminder Customer",
  customerMemberCode: "BF-001",
  currency: "IDR",
  status: "issued",
  totalAmount: 250000,
  depositRequiredAmount: 75000,
  allocatedDepositAmount: 0,
  verifiedPaymentAmount: 75000,
  outstandingAmount: 175000,
  minimumPaymentAmount: 1,
  paymentStatus: "partially_paid",
  items: [],
};

describe("BFG-TCK-003 settlement reminder UX", () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({ sent: true });
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex", sessionRole: "admin" } as never);
    vi.mocked(useMutation).mockImplementation((mutation) => {
      const name = getFunctionName(mutation as never);
      if (name.endsWith(":send")) return send as never;
      return vi.fn() as never;
    });
    vi.mocked(useQuery).mockImplementation((query) => {
      const name = getFunctionName(query as never);
      if (name.endsWith(":getStatus")) {
        return {
          canSend: true,
          reason: null,
          lastSentAt: null,
          nextAllowedAt: null,
          outstandingAmount: 175000,
        } as never;
      }
      return undefined as never;
    });
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  });

  it("shows a guarded admin reminder action and sends to the same invoice", async () => {
    vi.mocked(useOperations).mockReturnValue({
      currentAdminInvoice: invoice,
      adminAccount: { account: { availableAmount: 0, reservedAmount: 0 } },
      adminTransactions: { page: [] },
      adminAllocations: [],
      issueInvoice: vi.fn(),
      voidInvoice: vi.fn(),
      recordCredit: vi.fn(),
      allocateDeposit: vi.fn(),
      releaseAllocation: vi.fn(),
      reverseAllocation: vi.fn(),
      reverseTransaction: vi.fn(),
    } as never);
    render(<AdminInvoiceDetailPage />);
    fireEvent.click(screen.getByRole("button", { name: "Ingatkan pelunasan" }));
    expect(screen.getByText("Sisa tagihan saat ini")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kirim pengingat" }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ invoiceId: "invoice-1" }));
    expect(screen.getByText(/Pengingat pelunasan dikirim ke notifikasi customer/)).toBeTruthy();
  });

  it("explains a paid DP and pre-fills current settlement amount on customer's invoice", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex", sessionRole: "customer" } as never);
    vi.mocked(useOperations).mockReturnValue({
      currentCustomerInvoice: invoice,
      customerAccount: { account: { availableAmount: 0, reservedAmount: 0 } },
      customerTransactions: { page: [] },
      customerAllocations: [],
      customerPaymentConfirmations: [],
      submitPaymentConfirmation: vi.fn(),
    } as never);
    render(<CustomerInvoiceDetailPage />);
    expect(screen.getByRole("heading", { name: "Lanjutkan pelunasan" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bayar sisa tagihan" }).getAttribute("href")).toBe("#payment-confirmation");
    expect(screen.getByRole("heading", { name: "Konfirmasi pelunasan" })).toBeTruthy();
    const amount = screen.getByRole("spinbutton", { name: /Jumlah dibayar/ });
    expect(amount).toHaveProperty("value", "175000");
    fireEvent.change(amount, { target: { value: "100000" } });
    fireEvent.click(screen.getByRole("button", { name: "Gunakan nominal sisa tagihan" }));
    expect(amount).toHaveProperty("value", "175000");
  });

  it("does not request a duplicate payment when proof is under review", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex", sessionRole: "customer" } as never);
    vi.mocked(useOperations).mockReturnValue({
      currentCustomerInvoice: { ...invoice, paymentStatus: "payment_submitted" },
      customerAccount: { account: { availableAmount: 0, reservedAmount: 0 } },
      customerTransactions: { page: [] },
      customerAllocations: [],
      customerPaymentConfirmations: [
        {
          confirmationId: "confirm-1",
          status: "submitted",
          paymentMethod: "Bank transfer",
          submittedAt: Date.now(),
          amount: 175000,
        },
      ],
    } as never);
    render(<CustomerInvoiceDetailPage />);
    expect(screen.getByRole("heading", { name: "Pembayaran sedang ditinjau" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Konfirmasi pelunasan" })).toBeNull();
  });
});
