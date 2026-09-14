import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { CustomerCart } from "@/features/customer-cart/customer-cart";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

const reconcile = vi.fn();
const updateQuantity = vi.fn();
const removeItem = vi.fn();
const clear = vi.fn();
const acknowledge = vi.fn();

function emptyCart() {
  return {
    id: null,
    catalogId: null,
    catalog: null,
    lines: [],
    retainedLineCount: 0,
    retainedQuantity: 0,
    activeLineCount: 0,
    activeQuantity: 0,
    estimatedSubtotalAmount: 0,
  };
}

function cartWithLines() {
  return {
    id: "cart-1",
    catalogId: "catalog-1",
    catalog: { id: "catalog-1", name: "September Picks", status: "open", closingAt: null, estimatedArrivalMonth: null },
    lines: [
      {
        id: "line-active",
        catalogItemId: "item-active",
        bookId: "book-active",
        variantId: "variant-active",
        title: "Buku Aktif",
        publisherName: "BFG Press",
        format: "PB",
        isbn: "9780000000001",
        coverImageUrl: null,
        quantity: 2,
        observedUnitPriceAmount: 125000,
        currentUnitPriceAmount: 125000,
        priceChanged: false,
        availability: "active",
        reconciliationState: "active",
        requiresAcknowledgement: false,
        checkoutEligible: true,
        subtotalAmount: 250000,
      },
      {
        id: "line-price",
        catalogItemId: "item-price",
        bookId: "book-price",
        variantId: "variant-price",
        title: "Buku Harga Baru",
        publisherName: "BFG Press",
        format: "HB",
        isbn: "9780000000002",
        coverImageUrl: null,
        quantity: 1,
        observedUnitPriceAmount: 150000,
        currentUnitPriceAmount: 175000,
        priceChanged: true,
        availability: "active",
        reconciliationState: "active",
        requiresAcknowledgement: true,
        checkoutEligible: false,
        subtotalAmount: 0,
      },
      {
        id: "line-unavailable",
        catalogItemId: "item-unavailable",
        bookId: null,
        variantId: null,
        title: null,
        publisherName: null,
        format: null,
        isbn: null,
        coverImageUrl: null,
        quantity: 1,
        observedUnitPriceAmount: 90000,
        currentUnitPriceAmount: null,
        priceChanged: false,
        availability: "removed",
        reconciliationState: "unavailable",
        requiresAcknowledgement: true,
        checkoutEligible: false,
        subtotalAmount: 0,
      },
    ],
    retainedLineCount: 3,
    retainedQuantity: 4,
    activeLineCount: 1,
    activeQuantity: 2,
    estimatedSubtotalAmount: 250000,
  };
}

function mockMutations() {
  const mutations = [reconcile, updateQuantity, removeItem, clear, acknowledge];
  let callIndex = 0;
  vi.mocked(useMutation).mockImplementation(() => mutations[callIndex++ % mutations.length] as never);
}

describe("Customer Cart page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconcile.mockResolvedValue(emptyCart());
    updateQuantity.mockResolvedValue(emptyCart());
    removeItem.mockResolvedValue(emptyCart());
    clear.mockResolvedValue(emptyCart());
    acknowledge.mockResolvedValue(emptyCart());
    mockMutations();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("renders a clear empty state without an order action", () => {
    vi.mocked(useQuery).mockReturnValue(emptyCart() as never);

    render(<CustomerCart />);

    expect(screen.getByRole("heading", { name: "Keranjangmu masih kosong" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat Katalog" }).getAttribute("href")).toBe("/catalog");
    expect(screen.queryByRole("button", { name: /checkout|pesan sekarang|buat pesanan/i })).toBeNull();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("reconciles once, separates retained lines, and exposes canonical actions", async () => {
    const cart = cartWithLines();
    vi.mocked(useQuery).mockReturnValue(cart as never);

    render(<CustomerCart />);

    await waitFor(() => expect(reconcile).toHaveBeenCalledOnce());
    expect(await screen.findByRole("heading", { name: "Buku yang bisa dipesan" })).toBeTruthy();
    expect(screen.getByText("September Picks")).toBeTruthy();
    expect(screen.getByText("Harga sebelumnya")).toBeTruthy();
    expect(screen.getByText("Harga sekarang")).toBeTruthy();
    expect(screen.getByText("Harga berubah")).toBeTruthy();
    expect(screen.getByText("Buku ini sudah tidak tersedia di katalog")).toBeTruthy();
    expect(screen.queryByText("Checkout")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tambah jumlah Buku Aktif" }));
    await waitFor(() => expect(updateQuantity).toHaveBeenCalledWith({ cartItemId: "line-active", quantity: 3 }));

    fireEvent.click(screen.getByRole("button", { name: "Gunakan harga terbaru" }));
    await waitFor(() => expect(acknowledge).toHaveBeenCalledWith({ cartItemId: "line-price" }));

    fireEvent.click(screen.getByRole("button", { name: /Hapus Buku ini sudah tidak tersedia/ }));
    await waitFor(() => expect(removeItem).toHaveBeenCalledWith({ cartItemId: "line-unavailable" }));
  });

  it("requires explicit clear confirmation and keeps cancellation reversible", async () => {
    vi.mocked(useQuery).mockReturnValue(cartWithLines() as never);

    render(<CustomerCart />);
    await screen.findByRole("heading", { name: "Buku yang bisa dipesan" });

    fireEvent.click(screen.getByRole("button", { name: "Kosongkan keranjang" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(clear).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Kosongkan keranjang" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kosongkan keranjang" }));
    await waitFor(() => expect(clear).toHaveBeenCalledWith({}));
  });

  it("renders a safe mutation error without exposing the server error", async () => {
    const cart = cartWithLines();
    vi.mocked(useQuery).mockReturnValue(cart as never);
    updateQuantity.mockRejectedValue(new Error("INVALID_QUANTITY internal detail"));

    render(<CustomerCart />);
    await screen.findByRole("heading", { name: "Buku yang bisa dipesan" });
    fireEvent.click(screen.getByRole("button", { name: "Tambah jumlah Buku Aktif" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Jumlah buku belum dapat diperbarui. Coba lagi.");
    expect(screen.queryByText("INVALID_QUANTITY internal detail")).toBeNull();
  });

  it("retries a failed page-entry reconciliation", async () => {
    const cart = cartWithLines();
    vi.mocked(useQuery).mockReturnValue(cart as never);
    reconcile.mockRejectedValueOnce(new Error("reconcile failed")).mockResolvedValueOnce(cart);

    render(<CustomerCart />);

    expect(await screen.findByRole("heading", { name: "Status keranjang belum siap." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    await waitFor(() => expect(reconcile).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "Buku yang bisa dipesan" })).toBeTruthy();
  });
});
