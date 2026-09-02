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

function setup(profileDisplayName: string | null | undefined = "MULIA KAH") {
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
          variants: [{ id: "variant-1", format: "PB", isbn: "9780000000001", price: 125000 }],
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
});
