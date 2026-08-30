import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("shows Catalog context and composes title, ISBN, Publisher, reset, and empty states", async () => {
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-discovery",
        name: "September Discovery",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: "2030-09-30T16:59:59.999Z",
        estimatedArrivalMonth: "2030-11",
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-science",
            title: "Science Around Us",
            publisher: "DK",
            author: "Ada Lovelace",
            coverImageUrl: "https://example.com/science.jpg",
            variants: [
              {
                id: "variant-science",
                format: "PB",
                isbn: "978-0-01-1111-11-1",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
          {
            id: "book-forest",
            title: "Forest Stories",
            publisher: "Nosy Crow",
            author: "Bea Reader",
            coverImageUrl: "https://example.com/forest.jpg",
            variants: [
              {
                id: "variant-forest",
                format: "BB",
                isbn: "978-0-02-2222-22-2",
                price: 135000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
          {
            id: "book-experiments",
            title: "Science Experiments",
            publisher: "DK",
            author: "Cleo Curious",
            coverImageUrl: "https://example.com/experiments.jpg",
            variants: [
              {
                id: "variant-experiments",
                format: "HB",
                isbn: "978-0-03-3333-33-3",
                price: 145000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      sessionRole: "customer",
      authState: "authenticated",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    expect(screen.getByRole("heading", { name: "September Discovery" })).toBeTruthy();
    expect(screen.getAllByText("3 buku tersedia")).toHaveLength(2);
    expect(screen.getByText("30 Sep 2030")).toBeTruthy();
    expect(screen.getByText("Nov 2030")).toBeTruthy();

    const search = screen.getByRole("searchbox", { name: "Cari judul atau ISBN" });
    fireEvent.change(search, { target: { value: "science" } });
    expect(screen.getByText("2 buku ditemukan")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Science Around Us" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Science Experiments" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Forest Stories" })).toBeNull();

    fireEvent.change(search, { target: { value: "978 0 01 1111" } });
    expect(screen.getByText("1 buku ditemukan")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Science Around Us" })).toBeTruthy();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Publisher" }));
    await waitFor(() => expect(screen.getByRole("option", { name: "DK" })).toBeTruthy());
    fireEvent.click(screen.getByRole("option", { name: "DK" }));
    expect(screen.getByText("2 buku ditemukan")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Forest Stories" })).toBeNull();

    fireEvent.change(search, { target: { value: "experiments" } });
    expect(screen.getByText("1 buku ditemukan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset pencarian" }));
    expect(screen.getAllByText("3 buku tersedia")).toHaveLength(2);

    fireEvent.change(search, { target: { value: "does-not-exist" } });
    expect(screen.getByText("Tidak ada buku yang cocok.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Reset pencarian" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Reset pencarian" })[1]);
    const scienceCard = screen.getByRole("heading", { name: "Science Around Us" }).closest(".book-card");
    expect(scienceCard).toBeTruthy();
    expect(within(scienceCard as HTMLElement).queryByText("Ada Lovelace")).toBeNull();
    expect(within(scienceCard as HTMLElement).getByText(/978-0-01-1111-11-1/)).toBeTruthy();
  });
});
