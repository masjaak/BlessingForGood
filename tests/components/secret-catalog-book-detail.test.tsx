import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { SecretCatalogBookDetail } from "@/components/secret-catalog-book-detail";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/book-cover", () => ({
  BookCover: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/product-gallery", () => ({
  ProductGallery: () => null,
}));

vi.mock("@/components/bfg-select", () => ({
  BFGSelect: (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} />,
}));

vi.mock("@/features/customer-cart/add-to-cart-action", () => ({
  AddToCartAction: ({
    catalogItemId,
    quantity,
    returnTo,
  }: {
    catalogItemId: string;
    quantity: number;
    returnTo: string;
  }) => (
    <span
      data-testid="add-to-cart-action"
      data-catalog-item-id={catalogItemId}
      data-quantity={quantity}
      data-return-to={returnTo}
    />
  ),
}));

function setup(
  profileDisplayName: string | null | undefined = "MULIA KAH",
  description = "Paragraph one.\n\nParagraph two.",
  format = "PB",
) {
  vi.mocked(useParams).mockReturnValue({ catalogId: "catalog-1", bookId: "book-1" } as never);
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    user: { fullName: "Mulia Raya", username: "muliaraya" },
  } as never);
  const product = {
    dataSource: "convex",
    catalogLoading: false,
    unlockedCatalog: {
      id: "catalog-1",
      name: "Mulia Catalog",
      status: "open",
      books: [
        {
          id: "book-1",
          title: "A Book",
          publisher: "BFG Press",
          description,
          variants: [
            {
              id: "variant-1",
              catalogItemId: "catalog-item-1",
              format,
              isbn: "9780000000001",
              price: 125000,
            },
          ],
        },
      ],
    },
    authState: "authenticated",
    sessionRole: "customer",
    customerProfileDisplayName: profileDisplayName,
    submitOrder: vi.fn(),
  };
  vi.mocked(useProduct).mockReturnValue(product as never);
  return product;
}

describe("Secret Catalog book detail preorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the canonical FLEXIBOUND label", () => {
    setup("MULIA KAH", undefined, "FLEXIBOUND");
    render(<SecretCatalogBookDetail />);

    expect(screen.getByText(/FLEXIBOUND/)).toBeTruthy();
  });

  it("prefills the editable detail preorder name from the BFG Profile", async () => {
    setup();
    render(<SecretCatalogBookDetail />);

    const name = screen.getByLabelText("Nama");
    await waitFor(() => expect((name as HTMLInputElement).value).toBe("MULIA KAH"));
    fireEvent.change(name, { target: { value: "Mulia Gift Order" } });
    expect((name as HTMLInputElement).value).toBe("Mulia Gift Order");
  });

  it("waits for the BFG profile instead of prematurely using Clerk fallback", async () => {
    const product = setup() as { customerProfileDisplayName: string | null | undefined };
    product.customerProfileDisplayName = undefined;
    const rendered = render(<SecretCatalogBookDetail />);
    const name = screen.getByLabelText("Nama") as HTMLInputElement;

    expect(name.value).toBe("");
    product.customerProfileDisplayName = "MULIA KAH";
    rendered.rerender(<SecretCatalogBookDetail />);
    await waitFor(() => expect(name.value).toBe("MULIA KAH"));
  });

  it("does not overwrite an edited form and uses a changed profile for a new form", async () => {
    const product = setup();
    const rendered = render(<SecretCatalogBookDetail />);
    const name = screen.getByLabelText("Nama") as HTMLInputElement;

    await waitFor(() => expect(name.value).toBe("MULIA KAH"));
    fireEvent.change(name, { target: { value: "Mulia Gift Order" } });
    product.customerProfileDisplayName = "Mulia Raya Updated";
    rendered.rerender(<SecretCatalogBookDetail />);
    expect(name.value).toBe("Mulia Gift Order");

    rendered.unmount();
    setup("Mulia Raya Updated");
    render(<SecretCatalogBookDetail />);
    await waitFor(() => expect((screen.getByLabelText("Nama") as HTMLInputElement).value).toBe("Mulia Raya Updated"));
  });

  it.each([
    ["single-line descriptions", "One line."],
    ["one newline", "Paragraph one.\nParagraph two."],
    ["blank paragraphs", "Paragraph one.\n\nParagraph two."],
    [
      "long descriptions",
      "Paragraph one with enough text to wrap naturally on narrow screens.\n\nParagraph two remains readable.",
    ],
  ])("marks %s for visual line-break preservation", (_label, description) => {
    setup("MULIA KAH", description);
    const { container } = render(<SecretCatalogBookDetail />);

    const renderedDescription = container.querySelector(".ready-stock-detail > .content-stack > p");
    expect(renderedDescription?.textContent).toBe(description);
    expect((renderedDescription as HTMLElement | null)?.style.whiteSpace).toBe("pre-line");
  });

  it("renders HTML-looking descriptions as escaped plain text", () => {
    const description = "<script>alert(1)</script>\n\nSafe text.";
    setup("MULIA KAH", description);
    const { container } = render(<SecretCatalogBookDetail />);

    const rendered = container.querySelector(".ready-stock-detail > .content-stack > p");
    expect(rendered?.textContent).toBe(description);
    expect(rendered?.querySelector("script")).toBeNull();
  });

  it("submits the currently displayed price as reconciliation evidence", async () => {
    const product = setup();
    vi.mocked(product.submitOrder).mockResolvedValue({ id: "order-1" } as never);
    render(<SecretCatalogBookDetail />);

    await waitFor(() => expect((screen.getByLabelText("Nama") as HTMLInputElement).value).toBe("MULIA KAH"));
    fireEvent.click(screen.getByRole("button", { name: "Catat preorder" }));

    await waitFor(() =>
      expect(product.submitOrder).toHaveBeenCalledWith("catalog-1", {
        customerName: "MULIA KAH",
        customerEmail: "",
        items: [{ variantId: "variant-1", quantity: 1, expectedUnitPriceAmount: 125000 }],
      }),
    );
  });

  it("maps a price mismatch to a deliberate retry message", async () => {
    const product = setup();
    vi.mocked(product.submitOrder).mockRejectedValue(new Error("[CONVEX M(orders:submit)] PRICE_CHANGED"));
    render(<SecretCatalogBookDetail />);

    await waitFor(() => expect((screen.getByLabelText("Nama") as HTMLInputElement).value).toBe("MULIA KAH"));
    fireEvent.click(screen.getByRole("button", { name: "Catat preorder" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Harga buku berubah");
  });

  it("passes the selected detail Variant Catalog Item and quantity to Cart", () => {
    const product = setup();
    render(<SecretCatalogBookDetail />);

    fireEvent.change(screen.getByLabelText("Jumlah"), { target: { value: "3" } });

    const action = screen.getByTestId("add-to-cart-action");
    expect(action.getAttribute("data-catalog-item-id")).toBe("catalog-item-1");
    expect(action.getAttribute("data-quantity")).toBe("3");
    expect(product.submitOrder).not.toHaveBeenCalled();
  });

  it("keeps Variant and quantity selection available before signed-out auth continuation", () => {
    const product = setup() as { authState: string; sessionRole: string | null };
    product.authState = "signed-out";
    product.sessionRole = null;
    render(<SecretCatalogBookDetail />);

    fireEvent.change(screen.getByLabelText("Jumlah"), { target: { value: "2" } });

    const action = screen.getByTestId("add-to-cart-action");
    expect(action.getAttribute("data-catalog-item-id")).toBe("catalog-item-1");
    expect(action.getAttribute("data-quantity")).toBe("2");
    expect(action.getAttribute("data-return-to")).toBe("/catalog/catalog-1/book-1");
  });
});
