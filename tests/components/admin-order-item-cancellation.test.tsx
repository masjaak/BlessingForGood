import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { AdminOrderItemCancellation } from "@/features/admin-orders/cancellation/admin-order-item-cancellation";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

describe("Admin Order Item cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("confirms a simple item cancellation with the existing exception mutation", async () => {
    const cancelItem = vi.fn().mockResolvedValue({
      outcome: "resolved",
      reasonCode: null,
      exception: { exceptionId: "exception-1" },
    });
    vi.mocked(useMutation).mockReturnValue(cancelItem as never);
    vi.mocked(useQuery).mockReturnValue({
      decision: "eligible",
      reasonCode: null,
      cancellableQuantity: 2,
      requestedQuantity: 1,
      assignedQuantity: 0,
      hasLockedBatch: false,
      hasActiveInvoice: false,
    } as never);

    render(
      <AdminOrderItemCancellation
        orderItemId="order-item-1"
        orderStatus="submitted"
        bookTitle="A Book"
        format="PB"
        quantity={2}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Batalkan item" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText(/Publisher tidak dapat/), {
      target: { value: "Publisher tidak dapat menyediakan format ini." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Batalkan item" }));

    await waitFor(() =>
      expect(cancelItem).toHaveBeenCalledWith({
        orderItemId: "order-item-1",
        affectedQuantity: 1,
        reason: "Publisher tidak dapat menyediakan format ini.",
        customerNote: undefined,
      }),
    );
    expect(await screen.findByText(/Item berhasil dibatalkan/)).toBeTruthy();
  });

  it("labels locked Batch cancellation as review instead of promising immediate completion", () => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useQuery).mockReturnValue({
      decision: "requires_admin_review",
      reasonCode: "BATCH_LOCKED",
      cancellableQuantity: 1,
      requestedQuantity: 1,
      assignedQuantity: 1,
      hasLockedBatch: true,
      hasActiveInvoice: false,
    } as never);

    render(
      <AdminOrderItemCancellation
        orderItemId="order-item-1"
        orderStatus="submitted"
        bookTitle="A Book"
        format="PB"
        quantity={1}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Batalkan item" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/sudah masuk Batch PO/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Kirim untuk ditinjau" })).toBeTruthy();
  });
});
