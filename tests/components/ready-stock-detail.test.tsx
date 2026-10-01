import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { ReadyStockCheckoutAction, ReadyStockDetail } from "@/components/ready-stock-detail";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

const book = {
  listingId: "listing-1",
  slug: "ready-book",
  title: "Ready Book",
  description: "Deskripsi produk Ready Stock untuk customer.",
  priceAmount: 195000,
  format: "PB" as const,
  quantity: 3,
  reservedQuantity: 0,
  availableQuantity: 3,
  status: "published" as const,
  coverImageUrl: null,
  gallery: [],
  createdAt: 1,
  updatedAt: 1,
} as never;

describe("Standalone Ready Stock checkout", () => {
  it("renders manual price and checks out directly without a cart payload", async () => {
    const checkout = vi.fn().mockResolvedValue({ invoiceId: "invoice-1" });
    vi.mocked(useQuery).mockReturnValue(book);
    vi.mocked(useMutation).mockReturnValue(checkout as never);
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      authState: "authenticated",
      sessionRole: "customer",
    } as never);

    render(<ReadyStockDetail slug="ready-book" />);

    expect(screen.getAllByText(/195\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText("PB · 3 tersedia")).toBeTruthy();
    expect(screen.getByText("Deskripsi produk Ready Stock untuk customer.")).toBeTruthy();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Checkout sekarang" })));

    expect(checkout).toHaveBeenCalledExactlyOnceWith({
      listingId: "listing-1",
      quantity: 2,
      requestKey: expect.any(String),
    });
    expect(screen.getByRole("link", { name: "Buka tagihan" }).getAttribute("href")).toBe("/account/invoices/invoice-1");
    expect(screen.getByRole("link", { name: "Pantau pesanan" }).getAttribute("href")).toBe("/account/orders");
  });

  it("requires sign-in for signed-out checkout", () => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "signed-out", sessionRole: null } as never);
    render(<ReadyStockCheckoutAction book={book} />);
    expect(screen.getByRole("link", { name: "Masuk untuk checkout" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Checkout sekarang" })).toBeNull();
  });

  it("keeps the invoice destination when checkout reserves the final stock", async () => {
    let resolve!: (value: { invoiceId: string }) => void;
    const checkout = vi.fn(
      () =>
        new Promise<{ invoiceId: string }>((done) => {
          resolve = done;
        }),
    );
    vi.mocked(useMutation).mockReturnValue(checkout as never);
    vi.mocked(useQuery).mockReturnValue(book);
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      authState: "authenticated",
      sessionRole: "customer",
    } as never);
    const view = render(<ReadyStockDetail slug="ready-book" />);
    fireEvent.click(screen.getByRole("button", { name: "Checkout sekarang" }));
    vi.mocked(useQuery).mockReturnValue(null);
    view.rerender(<ReadyStockDetail slug="ready-book" />);
    await act(async () => resolve({ invoiceId: "last-unit-invoice" }));
    expect(screen.getByRole("link", { name: "Buka tagihan" }).getAttribute("href")).toBe(
      "/account/invoices/last-unit-invoice",
    );
  });

  it.each(["admin", "owner"] as const)("does not offer Customer checkout to %s", (role) => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "authenticated", sessionRole: role } as never);

    render(<ReadyStockCheckoutAction book={book} />);

    expect(screen.queryByRole("button", { name: "Checkout sekarang" })).toBeNull();
    expect(screen.getByRole("link", { name: "Buka Ready Stock Admin" })).toBeTruthy();
  });

  it("offers direct checkout to an active Customer identity", () => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "authenticated", sessionRole: "customer" } as never);

    render(<ReadyStockCheckoutAction book={book} />);

    expect(screen.getByRole("button", { name: "Checkout sekarang" })).toBeTruthy();
  });

  it.each(["loading", "convex-loading", "provisioning"] as const)(
    "does not classify %s as signed out while the session resolves",
    (authState) => {
      vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
      vi.mocked(useProduct).mockReturnValue({ authState, sessionRole: null } as never);

      render(<ReadyStockCheckoutAction book={book} />);

      expect(screen.getByText("Menyiapkan akun BFG…")).toBeTruthy();
    },
  );

  it("directs a resolved signed-in non-member to Join instead of sign-in", () => {
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "admission-required", sessionRole: null } as never);

    render(<ReadyStockCheckoutAction book={book} />);

    expect(screen.getByRole("link", { name: "Gabung Blessfriends" }).getAttribute("href")).toBe("/join");
  });

  it("offers auth retry for a terminal session error", () => {
    const retryAuth = vi.fn();
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
    vi.mocked(useProduct).mockReturnValue({ authState: "convex-error", sessionRole: null, retryAuth } as never);

    render(<ReadyStockCheckoutAction book={book} />);

    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(retryAuth).toHaveBeenCalledOnce();
  });
});
