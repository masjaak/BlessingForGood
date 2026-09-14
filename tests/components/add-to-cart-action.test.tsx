import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation } from "convex/react";
import { AddToCartAction } from "@/features/customer-cart/add-to-cart-action";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

const addItem = vi.fn();

function renderAction(overrides: Partial<React.ComponentProps<typeof AddToCartAction>> = {}) {
  return render(
    <AddToCartAction
      catalogItemId="catalog-item-pb"
      quantity={2}
      authState="authenticated"
      sessionRole="customer"
      returnTo="/catalog/catalog-1/book-1"
      {...overrides}
    />,
  );
}

describe("AddToCartAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addItem.mockResolvedValue({});
    vi.mocked(useMutation).mockReturnValue(addItem as never);
  });

  it("sends only the selected Catalog Item and quantity, then exposes the Cart", async () => {
    renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Tambahkan ke keranjang" }));

    await waitFor(() =>
      expect(addItem).toHaveBeenCalledWith({
        catalogItemId: "catalog-item-pb",
        quantity: 2,
      }),
    );
    expect(addItem.mock.calls[0][0]).not.toHaveProperty("price");
    expect((await screen.findByRole("status")).textContent).toContain("Ditambahkan ke keranjang");
    expect(screen.getByRole("link", { name: "Lihat keranjang" }).getAttribute("href")).toBe("/account/cart");
  });

  it("locks repeated activation while the server mutation is pending", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    addItem.mockReturnValue(new Promise((result) => (resolve = result)));
    renderAction();

    const button = screen.getByRole("button", { name: "Tambahkan ke keranjang" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(addItem).toHaveBeenCalledOnce();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    resolve({});
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
  });

  it("keeps a cross-Catalog Cart untouched and links to Cart review", async () => {
    addItem.mockRejectedValue(new Error("CART_CATALOG_MISMATCH"));
    renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Tambahkan ke keranjang" }));

    expect((await screen.findByRole("alert")).textContent).toContain("katalog lain");
    expect(screen.getByRole("link", { name: "Lihat keranjang" }).getAttribute("href")).toBe("/account/cart");
    expect(screen.getByRole("alert").textContent).not.toContain("catalog-item-pb");
  });

  it("uses the existing sign-in continuation without mutating for a signed-out visitor", () => {
    renderAction({ authState: "signed-out", sessionRole: null, quantity: 1 });

    const link = screen.getByRole("link", { name: "Masuk untuk menambahkan buku ke keranjang" });
    expect(link.getAttribute("href")).toBe("/sign-in?redirect_url=%2Fcatalog%2Fcatalog-1%2Fbook-1");
    expect(addItem).not.toHaveBeenCalled();
  });
});
