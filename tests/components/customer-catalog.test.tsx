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
    const publisherTrigger = screen.getByRole("button", { name: "Publisher" });
    fireEvent.click(publisherTrigger);
    const publisherMenu = await screen.findByRole("dialog", { name: "Publisher" });
    expect(within(publisherMenu).getAllByRole("checkbox")).toHaveLength(2);
    fireEvent.click(within(publisherMenu).getByRole("checkbox", { name: "DK" }));
    expect(screen.getByText("2 buku ditemukan")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Forest Stories" })).toBeNull();
    fireEvent.click(within(publisherMenu).getByRole("checkbox", { name: "Nosy Crow" }));
    expect(screen.getByText("3 buku ditemukan")).toBeTruthy();
    expect(publisherTrigger.textContent).toContain("DK, Nosy Crow");
    fireEvent.click(within(publisherMenu).getByRole("button", { name: "Semua Publisher" }));
    expect(screen.getAllByText("3 buku tersedia")).toHaveLength(2);
    fireEvent.click(publisherTrigger);

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
    expect(within(formatMenu).getAllByRole("checkbox")).toHaveLength(9);
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
  });

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
});
