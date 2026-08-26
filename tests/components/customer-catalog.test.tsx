import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerCatalog } from "@/components/customer-catalog";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

describe("CustomerCatalog projection", () => {
  it("renders the persisted Convex cover for an unlocked catalog book", () => {
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-1",
        name: "Maisys Funfair Preorder",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2026-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-1",
            title: "Maisy's Funfair",
            publisher: "walker books",
            coverImageUrl: "https://clean-eel-522.convex.cloud/api/storage/cover-1",
            variants: [
              {
                id: "variant-1",
                format: "BB",
                isbn: "978035235345346",
                price: 305000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    expect(screen.getByRole("img", { name: "Maisy's Funfair cover" }).getAttribute("src")).toContain(
      "convex.cloud/api/storage/cover-1",
    );
  });

  it("routes Admin away from the Customer mutation", () => {
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-1",
        name: "Admin Preview",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2026-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-1",
            title: "Preview Book",
            publisher: "Publisher",
            variants: [
              {
                id: "variant-1",
                format: "PB",
                isbn: "978035235345347",
                price: 305000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "admin",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    expect(screen.queryByRole("button", { name: "Catat preorder" })).toBeNull();
    expect(screen.getByRole("link", { name: "Buka Pesanan Admin" })).toBeTruthy();
  });
});
