import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersistentRequirementForm } from "@/app/admin/invoices/page";
import { AllocationForm, invoiceVoidBlockReason } from "@/app/admin/invoices/[invoiceId]/page";
import { useOperations } from "@/domain/prototype/operations-context";

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
}));

describe("Admin invoice issue entry", () => {
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
});
