import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UatPurgeDialog, type UatImpact } from "@/components/uat-purge-dialog";

const impact: UatImpact = {
  entityType: "invoice",
  entityId: "invoice-1",
  entityName: "BFG-INV-UAT-001",
  status: "issued",
  safe: true,
  blocker: null,
  delete: [
    { key: "invoiceItems", label: "Invoice items", count: 2 },
    { key: "paymentConfirmations", label: "Payment", count: 1, amount: 50000 },
  ],
  detach: [],
  preserve: [{ key: "orders", label: "Order root", count: 1 }],
};

describe("UAT purge confirmation", () => {
  it("requires the UAT assertion and exact entity keyword", () => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    render(<UatPurgeDialog open impact={impact} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("BFG-INV-UAT-001")).toBeTruthy();
    expect(within(dialog).getByText("2 Invoice items")).toBeTruthy();
    expect(within(dialog).getByText("Rp50.000")).toBeTruthy();
    const confirm = within(dialog).getByRole("button", { name: "Hapus permanen" });
    expect(confirm).toHaveProperty("disabled", true);

    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: "Saya memastikan data ini adalah data dummy / UAT dan memang ingin menghapusnya permanen.",
      }),
    );
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Ketik HAPUS INVOICE" }), {
      target: { value: "HAPUS INVOICE" },
    });
    expect(confirm).toHaveProperty("disabled", false);
  });

  it("clears the destructive confirmation when reopened", () => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    const view = render(<UatPurgeDialog open impact={impact} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "HAPUS INVOICE" } });
    expect(within(dialog).getByRole("button", { name: "Hapus permanen" })).toHaveProperty("disabled", false);

    view.rerender(<UatPurgeDialog open={false} impact={impact} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    view.rerender(<UatPurgeDialog open impact={impact} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Hapus permanen" })).toHaveProperty("disabled", true);
  });

  it("uses the underlying Order wording for unissued invoice candidates", () => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    render(
      <UatPurgeDialog
        open
        impact={{
          ...impact,
          entityType: "order",
          entityName: "Customer · Batch",
          reference: "BFG-ORD-001",
        }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("PESANAN")).toBeTruthy();
    expect(within(dialog).getByText("Referensi: BFG-ORD-001")).toBeTruthy();
    expect(within(dialog).getByRole("textbox", { name: "Ketik HAPUS PESANAN" })).toBeTruthy();
  });
});
