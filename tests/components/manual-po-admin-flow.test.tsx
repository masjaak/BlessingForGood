import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { AdminManualPoPanel } from "@/features/manual-po/manual-po";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

describe("Admin Manual PO flow", () => {
  const createEntry = vi.fn();
  const updateEntry = vi.fn();
  const setStatus = vi.fn();
  const archive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createEntry.mockResolvedValue({});
    updateEntry.mockResolvedValue({});
    setStatus.mockResolvedValue({});
    archive.mockResolvedValue({});

    vi.mocked(useQuery).mockReturnValue([
      {
        entryId: "manual-1",
        customerUserId: "customer-1",
        title: "Test Book",
        priceAmount: 10000,
        etaText: "Januari 2027",
        status: "active",
        createdAt: 1,
        updatedAt: 1,
        cancelledAt: null,
        archivedAt: null,
      },
    ] as never);

    vi.mocked(useMutation).mockImplementation((mutation) => {
      const name = getFunctionName(mutation as never);
      if (name.endsWith(":create")) return createEntry as never;
      if (name.endsWith(":update")) return updateEntry as never;
      if (name.endsWith(":setStatus")) return setStatus as never;
      if (name.endsWith(":archive")) return archive as never;
      throw new Error(`Unexpected mutation: ${name}`);
    });
  });

  it("wires edit, lifecycle status, and archive actions to the Manual PO backend", async () => {
    render(<AdminManualPoPanel customerUserId={"customer-1" as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Test Book")).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("Test Book"), { target: { value: "Updated Test Book" } });
    fireEvent.change(screen.getByDisplayValue("10000"), { target: { value: "12500" } });
    fireEvent.change(screen.getByDisplayValue("Januari 2027"), { target: { value: "Februari 2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() =>
      expect(updateEntry).toHaveBeenCalledWith({
        entryId: "manual-1",
        title: "Updated Test Book",
        priceAmount: 12500,
        etaText: "Februari 2027",
      }),
    );
    expect(
      screen.getByText("Perubahan Pesanan Khusus tersimpan dan langsung diperbarui di Buku Saya customer."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tandai tiba" }));
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith({ entryId: "manual-1", status: "arrived" }));

    fireEvent.click(screen.getByRole("button", { name: "Batalkan" }));
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith({ entryId: "manual-1", status: "cancelled" }));

    fireEvent.click(screen.getByRole("button", { name: "Arsipkan" }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith({ entryId: "manual-1" }));
  });

  it("creates a no-upload Manual PO for the selected customer", async () => {
    vi.mocked(useQuery).mockReturnValue([] as never);
    render(<AdminManualPoPanel customerUserId={"customer-1" as never} />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: The Complete Brambly Hedge"), {
      target: { value: "Random PO Book" },
    });
    fireEvent.change(screen.getByPlaceholderText("175000"), { target: { value: "99000" } });
    fireEvent.change(screen.getByPlaceholderText("Contoh: Estimasi tiba Januari 2027"), {
      target: { value: "Maret 2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah Pesanan Khusus" }));

    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith({
        customerUserId: "customer-1",
        title: "Random PO Book",
        priceAmount: 99000,
        etaText: "Maret 2027",
      }),
    );
    expect(screen.getByText("Pesanan Khusus tersimpan dan langsung tampil di Buku Saya customer.")).toBeTruthy();
  });
});
