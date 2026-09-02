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

beforeEach(() => {
  vi.mocked(useUser).mockReturnValue({ isLoaded: true, user: null } as never);
});

describe("CustomerCatalog projection", () => {
  it("prefills the editable preorder name from the active display name", async () => {
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: { fullName: "Ibu Sari", username: "sari_bfg" },
    } as never);
    vi.mocked(useProduct).mockReturnValue({
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
    await waitFor(() => expect((name as HTMLInputElement).value).toBe("Ibu Sari"));
    fireEvent.change(name, { target: { value: "Nama pilihan" } });
    expect((name as HTMLInputElement).value).toBe("Nama pilihan");
  });

  it("falls back to username and leaves the field blank when account names are unavailable", async () => {
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      user: { fullName: "", username: "sari_bfg" },
    } as never);
    vi.mocked(useProduct).mockReturnValue({
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
        items: [{ variantId: "variant-pb", quantity: 1 }],
      }),
    );
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
