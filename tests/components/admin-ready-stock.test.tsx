import type { ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { AdminReadyStock } from "@/components/admin-ready-stock";

vi.mock("convex/react", () => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav aria-label="Admin navigation" /> }));

const row = {
  bookId: "book-1",
  variantId: "variant-1",
  title: "Carry Me!",
  publisherName: "BFG House",
  isbn: "978000000001",
  author: null,
  format: "PB",
  publicationStatus: "published",
  isAvailable: true,
  masterPriceAmount: 175000,
  priceOverrideAmount: 195000,
  effectivePriceAmount: 195000,
  hasInventory: true,
  onHandQuantity: 3,
  reservedQuantity: 1,
  availableQuantity: 2,
};
const mutate = vi.fn();

describe("Admin Ready Stock price editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue([row] as never);
    vi.mocked(useMutation).mockReturnValue(mutate as never);
    mutate.mockResolvedValue(null);
  });

  it("distinguishes Master and Ready price while preserving semantic table rows", () => {
    const { container } = render(<AdminReadyStock />);
    const table = screen.getByRole("table", { name: "Daftar Ready Stock per format" });
    expect(within(table).getByRole("columnheader", { name: "Harga Master" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Harga Ready Stock" })).toBeTruthy();
    expect(table.textContent).toContain("175.000");
    expect(table.textContent).toContain("195.000");
    expect(within(table).getByText("Harga khusus Ready Stock")).toBeTruthy();
    expect(container.querySelectorAll("tbody > tr > td")).toHaveLength(9);
    expect(container.querySelector("tbody > :not(tr), tr > :not(td):not(th)")).toBeNull();
  });

  it("labels fallback and disables price editing until inventory exists", () => {
    vi.mocked(useQuery).mockReturnValue([
      { ...row, hasInventory: false, priceOverrideAmount: null, effectivePriceAmount: 175000 },
    ] as never);
    render(<AdminReadyStock />);
    expect(screen.getByText("Mengikuti harga Master")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Atur harga" })).toHaveProperty("disabled", true);
  });

  it("opens, saves the integer price, blocks duplicate submit, then reports success", async () => {
    let resolve!: () => void;
    mutate.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Atur harga" }));
    const input = screen.getByRole("spinbutton", { name: "Harga Ready Stock" });
    expect(input).toHaveProperty("value", "195000");
    fireEvent.change(input, { target: { value: "210000" } });
    const save = screen.getByRole("button", { name: "Simpan harga" });
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.submit(input.closest("form")!);
    expect(mutate).toHaveBeenCalledExactlyOnceWith({ bookVariantId: "variant-1", priceOverrideAmount: 210000 });
    expect(save).toHaveProperty("disabled", true);
    expect(input).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Batal" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Gunakan harga Master" })).toHaveProperty("disabled", true);
    await act(async () => resolve());
    expect(screen.getByRole("status").textContent).toBe("Harga Ready Stock berhasil diperbarui.");
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("clears with null and cancels without mutation", async () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Atur harga" }));
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Atur harga" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Gunakan harga Master" })));
    expect(mutate).toHaveBeenCalledExactlyOnceWith({ bookVariantId: "variant-1", priceOverrideAmount: null });
    expect(screen.getByRole("status").textContent).toBe("Harga Ready Stock kembali mengikuti harga Master.");
  });

  it("rejects invalid money locally and retains the editor on server failure", async () => {
    render(<AdminReadyStock />);
    fireEvent.click(screen.getByRole("button", { name: "Atur harga" }));
    const input = screen.getByRole("spinbutton", { name: "Harga Ready Stock" });
    for (const value of ["", "0", "-1", "1.5", "9007199254740992"]) {
      fireEvent.change(input, { target: { value } });
      await act(async () => fireEvent.submit(input.closest("form")!));
    }
    expect(mutate).not.toHaveBeenCalled();
    mutate.mockRejectedValue(new Error("unavailable"));
    fireEvent.change(input, { target: { value: "195000" } });
    await act(async () => fireEvent.submit(input.closest("form")!));
    expect(screen.getByRole("alert").textContent).toBe("Harga Ready Stock belum berhasil diperbarui. Coba lagi.");
    expect(input).toHaveProperty("disabled", false);
  });
});
