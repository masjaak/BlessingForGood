import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersistentRequirementForm } from "@/app/admin/invoices/page";
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
});
