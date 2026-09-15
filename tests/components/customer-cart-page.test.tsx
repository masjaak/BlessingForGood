import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { CustomerCart } from "@/features/customer-cart/customer-cart";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
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
const submitCart = vi.fn();
let routerPush: ReturnType<typeof vi.fn>;

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
    groups: [],
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
    get groups() {
      return [
        {
          id: this.catalogId,
          catalog: this.catalog,
          lines: this.lines,
          retainedQuantity: this.retainedQuantity,
          activeQuantity: this.activeQuantity,
          activeLineCount: this.activeLineCount,
          activeSubtotalAmount: this.estimatedSubtotalAmount,
          checkoutEligible: false,
          accessState: "granted",
          blockedReason: "price_changed",
        },
      ];
    },
  };
}

function readyCart() {
  const cart = cartWithLines();
  const line = cart.lines[0];
  return {
    ...cart,
    lines: [line],
    retainedLineCount: 1,
    retainedQuantity: line.quantity,
    activeLineCount: 1,
    activeQuantity: line.quantity,
    estimatedSubtotalAmount: line.subtotalAmount,
    groups: [
      {
        ...cart.groups[0],
        lines: [line],
        retainedQuantity: line.quantity,
        activeQuantity: line.quantity,
        activeSubtotalAmount: line.subtotalAmount,
        checkoutEligible: true,
      },
    ],
  };
}

function mockMutations() {
  const mutations = [reconcile, updateQuantity, removeItem, clear, acknowledge, submitCart];
  let callIndex = 0;
  vi.mocked(useMutation).mockImplementation(() => mutations[callIndex++ % mutations.length] as never);
}

describe("Customer Cart page", () => {
  it("renders three independent Catalog groups from the server projection", async () => {
    const cart = readyCart();
    const groups = ["CARGO 1", "CARGO 2", "CARGO 3"].map((name, index) => ({
      ...cart.groups[0],
      id: `catalog-${index + 1}`,
      catalog: { ...cart.catalog, id: `catalog-${index + 1}`, name },
      lines: [{ ...cart.lines[0], id: `line-${index}`, title: `Book ${index}` }],
      checkoutEligible: index !== 0,
    }));
    vi.mocked(useQuery).mockReturnValue({ ...cart, groups, lines: groups.flatMap((group) => group.lines) } as never);
    const { rerender } = render(<CustomerCart />);
    for (const group of groups) expect(await screen.findByRole("heading", { name: group.catalog.name })).toBeTruthy();
    expect(screen.queryByText(/Satu keranjang hanya/)).toBeNull();
    fireEvent.click(
      within(screen.getByRole("region", { name: "CARGO 2" })).getByRole("button", {
        name: "Hapus Book 1 dari keranjang",
      }),
    );
    await waitFor(() => expect(removeItem).toHaveBeenCalledWith({ cartItemId: "line-1" }));
    expect(
      within(screen.getByRole("region", { name: "CARGO 2" })).getByRole("button", { name: "Buat pesanan" }),
    ).toHaveProperty("disabled", true);
    for (const remaining of [[groups[0], groups[2]], [groups[2]], []]) {
      vi.mocked(useQuery).mockReturnValue({
        ...cart,
        groups: remaining,
        lines: remaining.flatMap((group) => group.lines),
      } as never);
      rerender(<CustomerCart />);
      for (const group of remaining) expect(screen.getByRole("region", { name: group.catalog.name })).toBeTruthy();
      expect(screen.queryByRole("region", { name: "CARGO 2" })).toBeNull();
    }
    expect(screen.getByText("Keranjangmu masih kosong")).toBeTruthy();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    reconcile.mockResolvedValue(emptyCart());
    updateQuantity.mockResolvedValue(emptyCart());
    removeItem.mockResolvedValue(emptyCart());
    clear.mockResolvedValue(emptyCart());
    acknowledge.mockResolvedValue(emptyCart());
    submitCart.mockResolvedValue({ orderId: "order-1" });
    routerPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: routerPush } as never);
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
    expect(screen.queryByRole("button", { name: "Buat pesanan" })).toBeNull();

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

  it("shows a deliberate checkout confirmation and navigates to the created Order", async () => {
    vi.mocked(useQuery).mockReturnValue(readyCart() as never);

    render(<CustomerCart />);
    await screen.findByRole("heading", { name: "Buku yang bisa dipesan" });

    fireEvent.click(screen.getByRole("button", { name: "Buat pesanan" }));
    const dialog = await screen.findByRole("dialog", { name: "Buat pesanan dari keranjang?" });
    expect(
      within(dialog).getByText(
        "Semua 2 buku aktif akan dibuat menjadi satu pesanan dengan harga terbaru dari katalog.",
      ),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Buat pesanan" }));
    await waitFor(() => expect(submitCart).toHaveBeenCalledWith({ requestKey: expect.any(String) }));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/account/orders/order-1"));
    expect(submitCart).toHaveBeenCalledOnce();
  });

  it("keeps the Customer on Cart with a safe checkout error", async () => {
    vi.mocked(useQuery).mockReturnValue(readyCart() as never);
    submitCart.mockRejectedValueOnce(new Error("PRICE_CHANGED internal detail"));

    render(<CustomerCart />);
    await screen.findByRole("heading", { name: "Buku yang bisa dipesan" });
    fireEvent.click(screen.getByRole("button", { name: "Buat pesanan" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Buat pesanan" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Harga buku berubah. Periksa harga terbaru, lalu kirim ulang pesanan.",
    );
    expect(screen.queryByText("PRICE_CHANGED internal detail")).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
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
