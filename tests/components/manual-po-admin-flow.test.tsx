import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { AdminManualPoPanel } from "@/features/manual-po/manual-po";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

describe("Admin Manual PO final simple flow", () => {
  const createEntry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createEntry.mockResolvedValue({});

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
      throw new Error(`Unexpected mutation in final simple Manual PO UI: ${name}`);
    });
  });

  it("only exposes title, price, ETA, and add Pesanan Khusus", async () => {
    render(<AdminManualPoPanel customerUserId={"customer-1" as never} />);

    expect(screen.getByLabelText("Judul buku")).toBeTruthy();
    expect(screen.getByLabelText("Harga")).toBeTruthy();
    expect(screen.getByLabelText("ETA")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambahkan Pesanan Khusus" })).toBeTruthy();

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tandai tiba" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Batalkan" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Arsipkan" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Judul buku"), { target: { value: "Random PO Book" } });
    fireEvent.change(screen.getByLabelText("Harga"), { target: { value: "99000" } });
    fireEvent.change(screen.getByLabelText("ETA"), { target: { value: "Maret 2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan Pesanan Khusus" }));

    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith({
        customerUserId: "customer-1",
        title: "Random PO Book",
        priceAmount: 99000,
        etaText: "Maret 2027",
      }),
    );

    expect(
      screen.getByText(
        "Pesanan Khusus ditambahkan. Customer melihatnya di Buku Saya → Random PO berjalan, bukan di Tagihan.",
      ),
    ).toBeTruthy();
  });
});
