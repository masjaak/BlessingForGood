import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { PersistentRequirementForm } from "@/app/admin/invoices/page";
import AdminInvoiceDetailPage, { AllocationForm, invoiceVoidBlockReason } from "@/app/admin/invoices/[invoiceId]/page";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ invoiceId: "invoice-1" })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: import("react").ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: import("react").ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

const invoice = {
  invoiceId: "invoice-1",
  invoiceNumber: "INV-2026-001",
  customerName: "A Customer",
  customerMemberCode: "BFG-1234",
  orderId: "order-1",
  orderCode: "BFG-ORD-001",
  currency: "IDR",
  totalAmount: 100000,
  status: "issued",
  items: [{ invoiceItemId: "invoice-item-1", quantity: 1, description: "A Book", subtotalAmount: 100000 }],
  depositRequiredAmount: 0,
  allocatedDepositAmount: 0,
  outstandingAmount: 100000,
  paymentStatus: "unpaid",
  verifiedPaymentAmount: 0,
};

function setup(currentInvoice = invoice) {
  vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
  const voidInvoice = vi.fn().mockResolvedValue({ ...currentInvoice, status: "void" });
  vi.mocked(useOperations).mockReturnValue({
    currentAdminInvoice: currentInvoice,
    adminAccount: { account: { availableAmount: 0, reservedAmount: 0 } },
    adminTransactions: { page: [] },
    adminAllocations: [],
    issueInvoice: vi.fn().mockResolvedValue({}),
    voidInvoice,
    recordCredit: vi.fn().mockResolvedValue({}),
    allocateDeposit: vi.fn().mockResolvedValue({}),
    releaseAllocation: vi.fn().mockResolvedValue({}),
    reverseAllocation: vi.fn().mockResolvedValue({}),
    reverseTransaction: vi.fn().mockResolvedValue({}),
  } as never);
  return { voidInvoice };
}

describe("Admin invoice issue entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useQuery).mockReturnValue(undefined as never);
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("creates the canonical draft and issues it from the same operator flow", async () => {
    const createInvoice = vi.fn().mockResolvedValue({ invoiceId: "invoice-1" });
    const issueInvoice = vi.fn().mockResolvedValue({ invoiceId: "invoice-1", status: "issued" });
    vi.mocked(useOperations).mockReturnValue({ createInvoice, issueInvoice } as never);

    render(<PersistentRequirementForm orderId="order-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan invoice" }));

    await waitFor(() => expect(issueInvoice).toHaveBeenCalledWith("invoice-1"));
    expect(createInvoice).toHaveBeenCalledWith("order-1", "none", undefined);
    expect(screen.getByRole("status").textContent).toContain("Invoice diterbitkan.");
  });

  it("keeps percentage entry human-scaled while passing the value to operations", async () => {
    const createInvoice = vi.fn().mockResolvedValue({ invoiceId: "invoice-1" });
    const issueInvoice = vi.fn().mockResolvedValue({ invoiceId: "invoice-1", status: "issued" });
    vi.mocked(useOperations).mockReturnValue({ createInvoice, issueInvoice } as never);

    render(<PersistentRequirementForm orderId="order-1" />);
    const requirementSelect = screen.getByRole("combobox");
    fireEvent.keyDown(requirementSelect, { key: "ArrowDown" });
    fireEvent.keyDown(requirementSelect, { key: "ArrowDown" });
    fireEvent.keyDown(requirementSelect, { key: "ArrowDown" });
    fireEvent.keyDown(requirementSelect, { key: "Enter" });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan draf" }));

    await waitFor(() => expect(createInvoice).toHaveBeenCalledWith("order-1", "percentage", 25));
  });

  it("fills the remaining allocation when deposit availability arrives after the form mounts", async () => {
    const allocateDeposit = vi.fn().mockResolvedValue({});
    const { rerender } = render(
      <AllocationForm
        invoiceId="invoice-1"
        outstanding={250000}
        available={0}
        allocateDeposit={allocateDeposit}
        disabled={false}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Alokasikan sisa deposit" })).toHaveProperty("disabled", true);
    rerender(
      <AllocationForm
        invoiceId="invoice-1"
        outstanding={250000}
        available={100000}
        allocateDeposit={allocateDeposit}
        disabled={false}
        onDone={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveProperty("value", "100000"));
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan sisa deposit" }));
    await waitFor(() => expect(allocateDeposit).toHaveBeenCalledWith("invoice-1", 100000));
  });

  it("explains why an invoice cannot be voided before the mutation is attempted", () => {
    expect(
      invoiceVoidBlockReason({
        allocatedDepositAmount: 0,
        verifiedPaymentAmount: 0,
        paymentStatus: "payment_submitted",
      }),
    ).toContain("Selesaikan tinjauan");
    expect(
      invoiceVoidBlockReason({
        allocatedDepositAmount: 50000,
        verifiedPaymentAmount: 0,
        paymentStatus: "partially_paid",
      }),
    ).toContain("Lepaskan atau balikkan");
    expect(
      invoiceVoidBlockReason({
        allocatedDepositAmount: 0,
        verifiedPaymentAmount: 0,
        paymentStatus: "unpaid",
      }),
    ).toBeNull();
  });

  it("exposes the canonical void action and preserves the financial-history explanation", async () => {
    const { voidInvoice } = setup();

    render(<AdminInvoiceDetailPage />);
    fireEvent.click(screen.getByRole("button", { name: "Batalkan invoice" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Batalkan invoice ini?" })).toBeTruthy();
    expect(within(dialog).getByText(/Riwayat pembayaran dan ledger tetap tersimpan/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Batalkan invoice" }));

    await waitFor(() => expect(voidInvoice).toHaveBeenCalledWith("invoice-1"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Invoice dibatalkan."));
  });

  it.each([
    ["draft", { ...invoice, status: "draft" }],
    ["issued", invoice],
    [
      "partially paid",
      { ...invoice, allocatedDepositAmount: 50000, outstandingAmount: 50000, paymentStatus: "partially_paid" },
    ],
    ["cancelled", { ...invoice, status: "void" }],
  ] as const)(
    "exposes protected permanent deletion on the canonical detail surface for %s invoices",
    (_label, current) => {
      const { voidInvoice } = setup(current);

      render(<AdminInvoiceDetailPage />);

      fireEvent.click(screen.getByRole("button", { name: "Hapus permanen" }));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: "Invoice tidak dapat dihapus permanen" })).toBeTruthy();
      expect(within(dialog).getByText(/riwayat pesanan atau keuangan/i)).toBeTruthy();
      expect(within(dialog).getByText(/pembayaran, deposit, pengembalian, dan audit/i)).toBeTruthy();
      expect(within(dialog).queryByRole("textbox")).toBeNull();
      expect(within(dialog).getByRole("button", { name: "Tutup" })).toBeTruthy();
      expect(voidInvoice).not.toHaveBeenCalled();
    },
  );

  it("keeps void unavailable while settlement history still requires resolution", () => {
    setup({ ...invoice, allocatedDepositAmount: 50000, paymentStatus: "partially_paid" });

    render(<AdminInvoiceDetailPage />);

    expect(screen.getByRole("button", { name: "Batalkan invoice" })).toHaveProperty("disabled", true);
    expect(screen.getByText(/Lepaskan atau balikkan pembayaran/i)).toBeTruthy();
  });
});
