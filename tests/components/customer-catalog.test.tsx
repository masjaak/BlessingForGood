import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "@clerk/nextjs";
import { CustomerCatalog } from "@/components/customer-catalog";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/features/customer-cart/add-to-cart-action", () => ({
  AddToCartAction: ({ catalogItemId, quantity }: { catalogItemId: string; quantity: number }) => (
    <span data-testid="add-to-cart-action" data-catalog-item-id={catalogItemId} data-quantity={quantity} />
  ),
}));

beforeEach(() => {
  vi.mocked(useUser).mockReturnValue({ isLoaded: true, user: null } as never);
});

describe("CustomerCatalog projection", () => {
  it("requests server pages and resets paging for search and category changes", () => {
    const updateCatalogBrowse = vi.fn();
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      unlockedCatalog: {
        id: "catalog-pagination",
        name: "Pagination Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        titleCount: 134,
        resultCount: 134,
        pageNumber: 1,
        pageSize: 25,
        publisherOptions: ["BFG Press"],
        books: [
          {
            id: "book-page-one",
            title: "Page One Book",
            publisher: "BFG Press",
            categories: ["Children Books"],
            variants: [
              {
                id: "variant-page-one",
                format: "PB",
                isbn: "9780000000101",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogBrowse: { pageNumber: 1, pageSize: 25, search: "", category: "", publishers: [], formats: [] },
      updateCatalogBrowse,
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    expect(screen.getByText("Menampilkan 1–25 dari 134 buku")).toBeTruthy();
    expect(screen.getByText("Halaman 1 dari 6")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Sebelumnya/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Berikutnya/ }) as HTMLButtonElement).disabled).toBe(false);
    const pageSize = screen.getByRole("combobox", { name: "buku per halaman" });
    fireEvent.click(pageSize);
    expect(screen.getByRole("option", { name: "25" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "100" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "50" }));
    expect(updateCatalogBrowse).toHaveBeenCalledWith({ pageSize: 50 });
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    expect(updateCatalogBrowse).toHaveBeenCalledWith({ pageNumber: 2 });

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari judul atau ISBN" }), {
      target: { value: "page two" },
    });
    expect(updateCatalogBrowse).toHaveBeenCalledWith({ search: "page two" });
    fireEvent.click(screen.getByRole("combobox", { name: "Kategori" }));
    fireEvent.click(screen.getByRole("option", { name: "Children Books" }));
    expect(updateCatalogBrowse).toHaveBeenCalledWith({ category: "Children Books" });
  });

  it("renders a 100-product page with covers set to lazy-load", () => {
    const books = Array.from({ length: 100 }, (_, index) => {
      const number = String(index + 1).padStart(3, "0");
      return {
        id: `book-page-${number}`,
        title: `Page Book ${number}`,
        publisher: "BFG Press",
        categories: ["Children Books"],
        coverImageUrl: `https://test.convex.cloud/api/storage/cover-${number}`,
        variants: [
          {
            id: `variant-page-${number}`,
            format: "PB",
            isbn: `978000000${number}`,
            price: 125000,
            currency: "IDR",
            availability: "available",
          },
        ],
      };
    });
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      unlockedCatalog: {
        id: "catalog-page-100",
        name: "100 Page Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        titleCount: 101,
        resultCount: 101,
        pageNumber: 1,
        pageSize: 100,
        publisherOptions: ["BFG Press"],
        books,
      },
      catalogBrowse: { pageNumber: 1, pageSize: 100, search: "", category: "", publishers: [], formats: [] },
      updateCatalogBrowse: vi.fn(),
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    expect(document.querySelectorAll(".book-card")).toHaveLength(100);
    const covers = Array.from(document.querySelectorAll<HTMLImageElement>(".book-cover-image"));
    expect(covers).toHaveLength(100);
    expect(
      covers.every((cover) => cover.getAttribute("loading") === "lazy" && cover.getAttribute("decoding") === "async"),
    ).toBe(true);
    expect(screen.getByText("Menampilkan 1–100 dari 101 buku")).toBeTruthy();
    expect(screen.getByText("Halaman 1 dari 2")).toBeTruthy();
  });

  it("prefills the editable preorder name from the BFG Profile display name", async () => {
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: { fullName: "Mulia Raya", username: "muliaraya" },
    } as never);
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      customerProfileDisplayName: "MULIA KAH",
      unlockedCatalog: {
        id: "catalog-name",
        name: "Name Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-name",
            title: "Book Name",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-name",
                format: "PB",
                isbn: "9780000000009",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    const name = await screen.findByLabelText("Nama");
    await waitFor(() => expect((name as HTMLInputElement).value).toBe("MULIA KAH"));
    fireEvent.change(name, { target: { value: "Nama pilihan" } });
    expect((name as HTMLInputElement).value).toBe("Nama pilihan");
  });

  it("falls back to username and leaves the field blank when account names are unavailable", async () => {
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: { fullName: "", username: "sari_bfg" },
    } as never);
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      customerProfileDisplayName: null,
      unlockedCatalog: {
        id: "catalog-username",
        name: "Username Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-username",
            title: "Book Username",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-username",
                format: "PB",
                isbn: "9780000000010",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);
    await waitFor(() => expect((screen.getByLabelText("Nama") as HTMLInputElement).value).toBe("sari_bfg"));

    vi.mocked(useUser).mockReturnValue({ isLoaded: true, user: null } as never);
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      customerProfileDisplayName: null,
      unlockedCatalog: {
        id: "catalog-blank",
        name: "Blank Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-blank",
            title: "Book Blank",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-blank",
                format: "PB",
                isbn: "9780000000011",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);
    const blankName = screen.getAllByLabelText("Nama").slice(-1)[0] as HTMLInputElement;
    expect(blankName.value).toBe("");
  });

  it("keeps one-format books static and frames the detail action", () => {
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-single",
        name: "Single Format Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-single",
            title: "Book A",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-hb",
                format: "HB",
                isbn: "9780000000001",
                price: 325000,
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

    const card = screen.getByRole("heading", { name: "Book A" }).closest(".book-card");
    expect(card).toBeTruthy();
    expect(card?.querySelector(".variant-list")).toBeNull();
    expect(card?.querySelector("input[type='radio']")).toBeNull();
    expect(card?.querySelector(".book-format-summary .book-format-value")?.textContent).toBe("HB");
    expect(card?.querySelector(".book-card-price .money")?.textContent).toMatch(/325[.]000/);

    const detail = within(card as HTMLElement).getByRole("link", { name: "Buka detail buku" });
    expect(detail.className).toContain("button-secondary");
    expect(detail.className).toContain("button-size-compact");
    expect(detail.getAttribute("href")).toBe("/catalog/catalog-single/book-single");
  });

  it("filters canonical book categories without hiding legacy uncategorized books from All", () => {
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-categories",
        name: "Category Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-children",
            title: "Children Stories",
            publisher: "BFG Press",
            categories: ["Children Books"],
            variants: [
              {
                id: "variant-children",
                format: "PB",
                isbn: "9780000000012",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
          {
            id: "book-adult",
            title: "Adult Stories",
            publisher: "BFG Press",
            categories: ["Adult Books"],
            variants: [
              {
                id: "variant-adult",
                format: "PB",
                isbn: "9780000000013",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
          {
            id: "book-legacy",
            title: "Legacy Stories",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-legacy",
                format: "PB",
                isbn: "9780000000014",
                price: 125000,
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

    expect(screen.getByRole("heading", { name: "Children Stories" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Adult Stories" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Legacy Stories" })).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "Kategori" }));
    fireEvent.click(screen.getByRole("option", { name: "Children Books" }));
    expect(screen.getByRole("heading", { name: "Children Stories" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Adult Stories" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Legacy Stories" })).toBeNull();

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari judul atau ISBN" }), {
      target: { value: "Children" },
    });
    expect(screen.getByText("Menampilkan 1–1 dari 1 buku")).toBeTruthy();
  });

  it("uses compact multi-format choices and submits the selected variant price and id", async () => {
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: { fullName: "Ada Customer", username: "ada_customer" },
    } as never);
    const submitOrder = vi.fn().mockResolvedValue({
      id: "order-1",
      catalogId: "catalog-multi",
      customerName: "Ada Customer",
      customerEmail: null,
      source: "preorder",
      items: [
        {
          id: "order-item-1",
          bookId: "book-multi",
          bookTitle: "Book B",
          publisher: "BFG Press",
          variantId: "variant-pb",
          format: "PB",
          isbn: "9780000000003",
          unitPrice: 245000,
          quantity: 1,
          subtotal: 245000,
        },
      ],
      total: 245000,
      depositRequirement: { kind: "unset" },
      status: "submitted",
      statusHistory: [{ status: "submitted", at: "2030-08-15T00:00:00.000Z" }],
      createdAt: "2030-08-15T00:00:00.000Z",
      updatedAt: "2030-08-15T00:00:00.000Z",
    });
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      customerProfileDisplayName: null,
      unlockedCatalog: {
        id: "catalog-multi",
        name: "Multi Format Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-multi",
            title: "Book B",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-hb",
                format: "HB",
                isbn: "9780000000002",
                price: 325000,
                currency: "IDR",
                availability: "available",
              },
              {
                id: "variant-pb",
                format: "PB",
                isbn: "9780000000003",
                price: 245000,
                currency: "IDR",
                availability: "available",
              },
              {
                id: "variant-bb",
                format: "BB",
                isbn: "9780000000004",
                price: 275000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder,
    } as never);

    render(<CustomerCatalog />);

    const card = screen.getByRole("heading", { name: "Book B" }).closest(".book-card");
    expect(card).toBeTruthy();
    expect(within(card as HTMLElement).getByRole("radiogroup", { name: "Format untuk Book B" })).toBeTruthy();
    expect(within(card as HTMLElement).getAllByRole("radio")).toHaveLength(3);
    expect(card?.querySelectorAll(".variant-option .money")).toHaveLength(0);
    expect(card?.querySelector(".book-card-price .money")?.textContent).toMatch(/325[.]000/);

    fireEvent.click(within(card as HTMLElement).getByRole("radio", { name: "PB" }));
    expect(card?.querySelector(".book-card-price .money")?.textContent).toMatch(/245[.]000/);

    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: "Tambah jumlah Book B" }));
    await waitFor(() => expect((screen.getByLabelText("Nama") as HTMLInputElement).value).toBe("Ada Customer"));
    fireEvent.click(screen.getByRole("button", { name: "Catat preorder" }));

    await waitFor(() =>
      expect(submitOrder).toHaveBeenCalledWith("catalog-multi", {
        customerName: "Ada Customer",
        customerEmail: "",
        items: [{ variantId: "variant-pb", quantity: 1, expectedUnitPriceAmount: 245000 }],
      }),
    );
  });

  it("passes the currently selected Catalog Item and quantity to Cart", () => {
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-cart",
        name: "Cart Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-cart",
            title: "Cart Book",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-hb",
                catalogItemId: "catalog-item-hb",
                format: "HB",
                isbn: "9780000000002",
                price: 325000,
                currency: "IDR",
                availability: "available",
              },
              {
                id: "variant-pb",
                catalogItemId: "catalog-item-pb",
                format: "PB",
                isbn: "9780000000003",
                price: 245000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    const card = screen.getByRole("heading", { name: "Cart Book" }).closest(".book-card") as HTMLElement;
    fireEvent.click(within(card).getByRole("radio", { name: "PB" }));
    fireEvent.click(within(card).getByRole("button", { name: "Tambah jumlah Cart Book" }));

    const action = within(card).getByTestId("add-to-cart-action");
    expect(action.getAttribute("data-catalog-item-id")).toBe("catalog-item-pb");
    expect(action.getAttribute("data-quantity")).toBe("1");
  });

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

    expect(screen.getByRole("link", { name: "Tinjau preorder" }).getAttribute("href")).toBe("#order-summary");
    expect(document.getElementById("order-summary")).toBeTruthy();

    expect(screen.getByRole("heading", { name: "September Discovery" })).toBeTruthy();
    expect(screen.getAllByText("3 buku tersedia")).toHaveLength(1);
    expect(screen.getByText("30 Sep 2030")).toBeTruthy();
    expect(screen.getByText("Nov 2030")).toBeTruthy();

    const search = screen.getByRole("searchbox", { name: "Cari judul atau ISBN" });
    fireEvent.change(search, { target: { value: "science" } });
    expect(screen.getByText("Menampilkan 1–2 dari 2 buku")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Science Around Us" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Science Experiments" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Forest Stories" })).toBeNull();

    fireEvent.change(search, { target: { value: "978 0 01 1111" } });
    expect(screen.getByText("Menampilkan 1–1 dari 1 buku")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Science Around Us" })).toBeTruthy();

    fireEvent.change(search, { target: { value: "" } });
    const publisherTrigger = screen.getByRole("button", { name: "Publisher" });
    fireEvent.click(publisherTrigger);
    const publisherMenu = await screen.findByRole("dialog", { name: "Publisher" });
    expect(within(publisherMenu).getAllByRole("checkbox")).toHaveLength(2);
    fireEvent.click(within(publisherMenu).getByRole("checkbox", { name: "DK" }));
    expect(screen.getByText("Menampilkan 1–2 dari 2 buku")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Forest Stories" })).toBeNull();
    fireEvent.click(within(publisherMenu).getByRole("checkbox", { name: "Nosy Crow" }));
    expect(screen.getByText("Menampilkan 1–3 dari 3 buku")).toBeTruthy();
    expect(publisherTrigger.textContent).toContain("DK, Nosy Crow");
    fireEvent.click(within(publisherMenu).getByRole("button", { name: "Semua Publisher" }));
    expect(screen.getAllByText("3 buku tersedia")).toHaveLength(1);
    fireEvent.click(publisherTrigger);

    fireEvent.change(search, { target: { value: "experiments" } });
    expect(screen.getByText("Menampilkan 1–1 dari 1 buku")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset pencarian" }));
    expect(screen.getAllByText("3 buku tersedia")).toHaveLength(1);

    fireEvent.change(search, { target: { value: "does-not-exist" } });
    expect(screen.getByText("Tidak ada buku yang cocok.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Reset pencarian" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Reset pencarian" })[1]);
    const scienceCard = screen.getByRole("heading", { name: "Science Around Us" }).closest(".book-card");
    expect(scienceCard).toBeTruthy();
    expect(within(scienceCard as HTMLElement).queryByText("Ada Lovelace")).toBeNull();
    expect(within(scienceCard as HTMLElement).getByText(/978-0-01-1111-11-1/)).toBeTruthy();
  });

  it("filters the visible Catalog by every canonical format and composes search with formats", () => {
    const formatFixtures = [
      ["BB", "BB Book"],
      ["HB", "HB Book"],
      ["PB", "PB Book"],
      ["Boxset PB", "Boxset PB Book"],
      ["Boxset HB", "Boxset HB Book"],
      ["Slipcase PB", "Slipcase PB Book"],
      ["Slipcase HB", "Slipcase HB Book"],
      ["Cards", "Cards Book"],
      ["Pack", "Pack Book"],
      ["FLEXIBOUND", "FLEXIBOUND Book"],
    ] as const;
    const variant = (id: string, format: string) => ({
      id,
      format,
      isbn: `978000000${id.replace(/\D/g, "").padStart(4, "0")}`,
      price: 125000,
      currency: "IDR",
      availability: "available",
    });

    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-formats",
        name: "Format Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          ...formatFixtures.map(([format, title], index) => ({
            id: `book-${index}`,
            title,
            publisher: "BFG Press",
            variants: [variant(`variant-${index}`, format)],
          })),
          {
            id: "book-multi",
            title: "Harry Multi",
            publisher: "BFG Press",
            variants: [variant("variant-multi-pb", "PB"), variant("variant-multi-hb", "HB")],
          },
          {
            id: "book-harry-hb",
            title: "Harry HB",
            publisher: "BFG Press",
            variants: [variant("variant-harry-hb", "HB")],
          },
          {
            id: "book-harry-pb",
            title: "Harry PB",
            publisher: "BFG Press",
            variants: [variant("variant-harry-pb", "PB")],
          },
          {
            id: "book-dune",
            title: "Dune",
            publisher: "BFG Press",
            variants: [variant("variant-dune-hb", "HB")],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    const formatTrigger = screen.getByRole("button", { name: "Format" });
    expect(formatTrigger.textContent).toContain("Semua Format");
    expect(screen.queryByRole("checkbox", { name: "BB" })).toBeNull();
    fireEvent.click(formatTrigger);
    const formatMenu = screen.getByRole("dialog", { name: "Format" });
    expect(within(formatMenu).getAllByRole("checkbox")).toHaveLength(10);
    for (const [format, title] of formatFixtures) {
      const checkbox = within(formatMenu).getByRole("checkbox", { name: format });
      fireEvent.click(checkbox);
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
      fireEvent.click(checkbox);
    }

    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "PB" }));
    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "HB" }));
    expect(screen.getByRole("heading", { name: "PB Book" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "HB Book" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Harry Multi" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Harry Multi" })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Pack Book" })).toBeNull();
    expect(formatTrigger.textContent).toContain("PB, HB");

    const search = screen.getByRole("searchbox", { name: "Cari judul atau ISBN" });
    fireEvent.change(search, { target: { value: "Harry" } });
    expect(screen.getByRole("heading", { name: "Harry Multi" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Harry HB" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Harry PB" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Dune" })).toBeNull();

    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "PB" }));
    expect(screen.queryByRole("heading", { name: "Harry PB" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Harry HB" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Harry Multi" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset pencarian" }));
    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "PB" }));
    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "Pack" }));
    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "HB" }));
    expect(formatTrigger.textContent).toContain("3 format dipilih");
    expect(screen.getByRole("heading", { name: "PB Book" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pack Book" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "HB Book" })).toBeTruthy();

    fireEvent.click(within(formatMenu).getByRole("button", { name: "Semua Format" }));
    expect(formatTrigger.textContent).toContain("Semua Format");
    expect(screen.getByRole("heading", { name: "Dune" })).toBeTruthy();
  }, 15_000);

  it("composes search, Format, and Publisher as AND across OR groups", () => {
    const variant = (id: string, format: string) => ({
      id,
      format,
      isbn: `978000000${id.replace(/\D/g, "").padStart(4, "0")}`,
      price: 125000,
      currency: "IDR",
      availability: "available",
    });

    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-combined-filters",
        name: "Combined Filter Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-a",
            title: "Harry A",
            publisher: "Publisher One",
            variants: [variant("variant-a-hb", "HB")],
          },
          {
            id: "book-b",
            title: "Harry B",
            publisher: "Publisher Two",
            variants: [variant("variant-b-pb", "PB")],
          },
          {
            id: "book-c",
            title: "Dune",
            publisher: "Publisher One",
            variants: [variant("variant-c-hb", "HB")],
          },
          {
            id: "book-d",
            title: "Harry Multi",
            publisher: "Publisher Three",
            variants: [variant("variant-d-hb", "HB"), variant("variant-d-pb", "PB")],
          },
          {
            id: "book-e",
            title: "Pack",
            publisher: "Publisher Two",
            variants: [variant("variant-e-pack", "Pack")],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    render(<CustomerCatalog />);

    const formatTrigger = screen.getByRole("button", { name: "Format" });
    fireEvent.click(formatTrigger);
    const formatMenu = screen.getByRole("dialog", { name: "Format" });
    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "HB" }));
    fireEvent.click(within(formatMenu).getByRole("checkbox", { name: "PB" }));
    fireEvent.click(formatTrigger);

    const publisherTrigger = screen.getByRole("button", { name: "Publisher" });
    fireEvent.click(publisherTrigger);
    const publisherMenu = screen.getByRole("dialog", { name: "Publisher" });
    fireEvent.click(within(publisherMenu).getByRole("checkbox", { name: "Publisher One" }));
    fireEvent.click(within(publisherMenu).getByRole("checkbox", { name: "Publisher Three" }));

    const search = screen.getByRole("searchbox", { name: "Cari judul atau ISBN" });
    fireEvent.change(search, { target: { value: "Harry" } });
    expect(screen.getByRole("heading", { name: "Harry A" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Harry Multi" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Harry Multi" })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Harry B" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Dune" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Pack" })).toBeNull();
  });

  it("repeats preorder/list navigation without changing the selected preorder", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    window.history.replaceState(null, "", "/catalog");
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-navigation",
        name: "Navigation Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-navigation",
            title: "Book Navigation",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-navigation",
                format: "PB",
                isbn: "9780000000099",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    try {
      render(<CustomerCatalog />);
      fireEvent.click(screen.getByRole("button", { name: "Tambah jumlah Book Navigation" }));
      expect(screen.getByLabelText("Jumlah Book Navigation").textContent).toBe("1");
      expect(screen.getAllByText(/125[.]000/)).toHaveLength(2);

      const down = screen.getByRole("link", { name: "Tinjau preorder" });
      const up = screen.getByRole("link", { name: "Kembali ke daftar buku" });
      for (let cycle = 0; cycle < 3; cycle += 1) {
        fireEvent.click(down);
        fireEvent.click(up);
      }

      expect(scrollIntoView).toHaveBeenCalledTimes(6);
      expect(scrollIntoView).toHaveBeenNthCalledWith(1, {
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      expect(scrollIntoView).toHaveBeenNthCalledWith(2, {
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      expect(window.location.hash).toBe("");
      expect(screen.getByLabelText("Jumlah Book Navigation").textContent).toBe("1");
      expect(screen.getAllByText(/125[.]000/)).toHaveLength(2);
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("uses instant navigation when reduced motion is preferred", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    window.history.replaceState(null, "", "/catalog");
    vi.mocked(useProduct).mockReturnValue({
      unlockedCatalog: {
        id: "catalog-reduced-motion",
        name: "Reduced Motion Catalog",
        accessCodeHash: "convex-managed",
        status: "open",
        closingAt: null,
        createdAt: "2030-08-15T00:00:00.000Z",
        books: [
          {
            id: "book-reduced-motion",
            title: "Book Reduced Motion",
            publisher: "BFG Press",
            variants: [
              {
                id: "variant-reduced-motion",
                format: "PB",
                isbn: "9780000000098",
                price: 125000,
                currency: "IDR",
                availability: "available",
              },
            ],
          },
        ],
      },
      catalogLoading: false,
      authState: "authenticated",
      sessionRole: "customer",
      unlockCatalog: vi.fn(),
      submitOrder: vi.fn(),
    } as never);

    try {
      render(<CustomerCatalog />);
      fireEvent.click(screen.getByRole("link", { name: "Tinjau preorder" }));
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start", inline: "nearest" });
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });
});
