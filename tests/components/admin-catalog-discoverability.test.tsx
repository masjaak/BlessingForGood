import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCatalogsPage from "@/app/admin/catalogs/page";
import { AdminCatalogAccess } from "@/components/admin-catalog-access";
import { AdminCatalogDetail } from "@/components/admin-catalog-detail";
import { useMutation, useQuery } from "convex/react";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/catalogs",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
  vi.mocked(useQuery).mockReturnValue(undefined as never);
  vi.mocked(useProduct).mockReturnValue({
    state: { catalogs: [] },
    catalogsLoading: false,
    closeCatalog: vi.fn(),
  } as never);
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
});

describe("Secret Catalog operational discoverability", () => {
  it("keeps stacked actions and supporting copy in semantic action regions", () => {
    vi.mocked(useProduct).mockReturnValue({
      state: {
        catalogs: [
          {
            id: "catalog-open",
            name: "Open",
            accessCodeHash: "hash-open",
            status: "open",
            closingAt: null,
            books: [],
            titleCount: 0,
            createdAt: "2026-08-21T00:00:00.000Z",
          },
          {
            id: "catalog-draft",
            name: "Draft",
            accessCodeHash: "hash-draft",
            status: "draft",
            closingAt: null,
            books: [],
            titleCount: 0,
            createdAt: "2026-08-21T00:00:00.000Z",
          },
        ],
      },
      catalogsLoading: false,
      closeCatalog: vi.fn(),
    } as never);

    render(<AdminCatalogsPage />);

    const openCard = screen.getByRole("heading", { name: "Open" }).closest(".card");
    expect(openCard?.querySelector(".action-region")).toBeTruthy();
    expect(openCard?.querySelector(".action-stack")?.querySelectorAll(".button")).toHaveLength(2);

    const draftCard = screen.getByRole("heading", { name: "Draft" }).closest(".card");
    expect(draftCard?.querySelector(".action-stack")?.querySelectorAll(".button")).toHaveLength(1);
    expect(draftCard?.querySelector(".action-support")?.textContent).toMatch(/Draf/);
  });

  it("points the empty catalog state to the create form and explains the next step", () => {
    render(<AdminCatalogsPage />);

    expect(document.getElementById("create-catalog")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Buat katalog" }).getAttribute("href")).toBe("#create-catalog");
    expect(screen.getByText(/mengelola akses/)).toBeTruthy();
    expect(screen.getByText("Nama katalog")).toBeTruthy();
    expect(screen.getByText("Batas pemesanan")).toBeTruthy();
    expect(document.querySelectorAll("#create-catalog .field-hint")).toHaveLength(3);
    expect(document.querySelector("#create-catalog input[type='date']")).toBeTruthy();
  });

  it("exposes Kelola akses from catalog detail", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        id: "catalog-1",
        name: "Spring",
        status: "draft",
        description: null,
        closesAt: null,
      } as never)
      .mockReturnValueOnce([] as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    expect(screen.getByRole("link", { name: "Kelola akses" }).getAttribute("href")).toBe(
      "/admin/catalogs/catalog-1/access",
    );
    expect(screen.getByText("Draf")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Buku dalam katalog" })).toBeTruthy();
  });

  it("exposes and confirms a restore action for an archived catalog", async () => {
    const restore = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useMutation).mockReturnValue(restore as never);
    const catalog = {
      id: "catalog-archived",
      name: "Archived",
      status: "archived",
      description: null,
      closesAt: null,
    };
    const queryResults = [catalog, [], []];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogDetail catalogId="catalog-archived" />);

    fireEvent.click(screen.getByRole("button", { name: "Pulihkan katalog" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Pulihkan katalog ini?" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Pulihkan katalog" }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith({ catalogId: "catalog-archived" }));
  });

  it("uses a date-only deadline input for an existing catalog", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        id: "catalog-1",
        name: "August",
        status: "draft",
        description: null,
        closesAt: Date.parse("2030-08-30T20:21:00.000+07:00"),
      } as never)
      .mockReturnValueOnce([] as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    const deadlineInput = screen.getByText("Batas pemesanan").closest("label")?.querySelector("input");
    expect(deadlineInput?.getAttribute("type")).toBe("date");
    expect((deadlineInput as HTMLInputElement | null)?.value).toBe("2030-08-30");
    expect(document.querySelector(".catalog-settings-grid.form-grid-wide")).toBeTruthy();
  });

  it("keeps Buat kode akses actionable only after a catalog exists", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        id: "catalog-1",
        name: "Spring",
        status: "open",
        description: null,
        closesAt: null,
      } as never)
      .mockReturnValueOnce({ codes: [], grants: [] } as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCatalogAccess catalogId="catalog-1" />);

    expect(screen.getByRole("button", { name: "Buat kode akses" })).toBeTruthy();
    expect(screen.getByText("Belum ada kode akses")).toBeTruthy();
    expect(document.querySelector(".catalog-access-code-section")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Buat kode akses" }).closest(".action-group")?.querySelectorAll(".button"),
    ).toHaveLength(2);
  });

  it("keeps one global access-code concept and removes period controls", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        id: "catalog-1",
        name: "Spring",
        status: "open",
        description: null,
        closesAt: null,
      } as never)
      .mockReturnValueOnce({ codes: [], grants: [] } as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCatalogAccess catalogId="catalog-1" />);

    expect(screen.getByText("Kode akses Secret Catalog")).toBeTruthy();
    expect(screen.getByText("Satu kode untuk Secret Catalog yang tersedia.")).toBeTruthy();
    expect(screen.queryByText(/Periode/i)).toBeNull();
    expect(screen.queryByText("Nama periode")).toBeNull();
    expect(screen.queryByRole("button", { name: /Buat periode/i })).toBeNull();
    expect(document.querySelector(".catalog-access-code-form")).toBeTruthy();
    expect(document.querySelector(".catalog-member-form")).toBeTruthy();
    expect(document.querySelector(".catalog-member-form .bfg-select-trigger")).toBeTruthy();
    expect(document.querySelector(".catalog-member-form select")).toBeNull();
  });

  it("shows copy success only after the clipboard write resolves", async () => {
    let resolveWrite: () => void = () => {};
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const generate = vi.fn().mockResolvedValue({ code: "BFG-ONE-TIME" });
    vi.mocked(useMutation).mockReturnValue(generate as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "Spring",
        status: "open",
        description: null,
        closesAt: null,
      },
      { codes: [], grants: [] },
      [],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogAccess catalogId="catalog-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Buat kode akses" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salin kode" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Salin kode" }));
    expect(writeText).toHaveBeenCalledWith("BFG-ONE-TIME");
    expect(screen.queryByText("Kode akses berhasil disalin.")).toBeNull();

    resolveWrite();
    await waitFor(() => {
      const toast = screen.getByText("Kode akses berhasil disalin.");
      expect(toast.closest("[role='status']")?.getAttribute("aria-live")).toBe("polite");
    });
  });

  it("shows copy failure feedback without a false success", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard unavailable"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const generate = vi.fn().mockResolvedValue({ code: "BFG-ONE-TIME" });
    vi.mocked(useMutation).mockReturnValue(generate as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "Spring",
        status: "open",
        description: null,
        closesAt: null,
      },
      { codes: [], grants: [] },
      [],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogAccess catalogId="catalog-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Buat kode akses" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salin kode" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Salin kode" }));

    await waitFor(() => expect(screen.getByText("Kode akses gagal disalin. Coba salin secara manual.")).toBeTruthy());
    expect(screen.getByRole("alert").getAttribute("aria-live")).toBe("assertive");
    expect(screen.queryByText("Kode akses berhasil disalin.")).toBeNull();
  });

  it("searches eligible assignment records and current Catalog records without changing mutations", async () => {
    const add = vi.fn().mockResolvedValue("catalog-item-new");
    vi.mocked(useMutation).mockReturnValue(add as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "September",
        status: "open",
        description: null,
        closesAt: null,
      },
      [
        {
          _id: "catalog-item-forest",
          title: "Forest Stories",
          publisherName: "Nosy Crow",
          author: "Bea Reader",
          format: "BB",
          isbn: "978-0-02-2222-22-2",
        },
        {
          _id: "catalog-item-history",
          title: "History Atlas",
          publisherName: "Usborne",
          author: "Cleo Curious",
          format: "PB",
          isbn: "978-0-03-3333-33-3",
        },
      ],
      [
        {
          variantId: "variant-science",
          bookId: "book-science",
          title: "Science Around Us",
          publisherName: "DK",
          author: "Ada Lovelace",
          format: "PB",
          isbn: "978-0-01-1111-11-1",
          priceAmount: 125000,
        },
        {
          variantId: "variant-forest",
          bookId: "book-forest",
          title: "Forest Stories",
          publisherName: "Nosy Crow",
          author: "Bea Reader",
          format: "BB",
          isbn: "978-0-02-2222-22-2",
          priceAmount: 135000,
        },
      ],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    expect(document.querySelector(".admin-catalog-picker-controls .bfg-select-trigger")).toBeTruthy();
    expect(document.querySelector(".admin-catalog-tracking-controls .bfg-select-trigger")).toBeTruthy();
    expect(
      document.querySelectorAll(".admin-catalog-picker-controls select, .admin-catalog-tracking-controls select"),
    ).toHaveLength(0);

    const pickerSearch = screen.getAllByPlaceholderText("Cari judul, publisher, ISBN, atau penulis")[0];
    fireEvent.change(pickerSearch, { target: { value: "lovelace" } });
    expect(screen.getByText("1 buku/format ditemukan")).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Produk yang dapat ditambahkan" }));
    expect(screen.getByRole("option", { name: /Science Around Us/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /Science Around Us/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah produk" }));
    await waitFor(() => expect(add).toHaveBeenCalledWith({ catalogId: "catalog-1", bookVariantId: "variant-science" }));

    const trackingSearch = screen.getAllByPlaceholderText("Cari judul, publisher, ISBN, atau penulis")[1];
    fireEvent.change(trackingSearch, { target: { value: "9780033333333" } });
    expect(screen.getByText("1 judul ditemukan")).toBeTruthy();
    expect(screen.getByText("History Atlas")).toBeTruthy();
    expect(screen.queryByText("Forest Stories")).toBeNull();

    fireEvent.change(trackingSearch, { target: { value: "" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Publisher dalam Catalog" }));
    await waitFor(() => expect(screen.getByRole("option", { name: "Nosy Crow" })).toBeTruthy());
    fireEvent.click(screen.getByRole("option", { name: "Nosy Crow" }));
    expect(screen.getByText("1 judul ditemukan")).toBeTruthy();
    expect(screen.getByText("Forest Stories")).toBeTruthy();
    expect(screen.queryByText("History Atlas")).toBeNull();
  });

  it("exposes scoped move controls for deterministic Catalog item order", async () => {
    const move = vi.fn().mockResolvedValue({ moved: true, position: 1 });
    const mutationFns = Array.from({ length: 9 }, () => vi.fn());
    mutationFns.push(move);
    let mutationIndex = 0;
    vi.mocked(useMutation).mockImplementation(() => mutationFns[mutationIndex++] as never);
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        id: "catalog-1",
        name: "Series Catalog",
        status: "open",
        description: null,
        closesAt: null,
      } as never)
      .mockReturnValueOnce([
        { _id: "item-one", title: "Series One", format: "PB", isbn: "9780000000001" },
        { _id: "item-two", title: "Series Two", format: "PB", isbn: "9780000000002" },
      ] as never)
      .mockReturnValueOnce([] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    expect(screen.getByText(/Geser pegangan di setiap buku/)).toBeTruthy();
    expect(screen.getByText("Urutan 1")).toBeTruthy();
    expect(screen.getByText("Urutan 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Naikkan Series Two" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turunkan Series One" }));

    await waitFor(() => expect(move).toHaveBeenCalledWith({ catalogItemId: "item-one", direction: "down" }));
  });

  it("reorders from an explicit drag handle and uses a destination index", async () => {
    const move = vi.fn().mockResolvedValue({ moved: true, position: 2 });
    vi.mocked(useMutation).mockReturnValue(move as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "Series Catalog",
        status: "open",
        description: null,
        closesAt: null,
      },
      [
        { _id: "item-one", title: "Series One", format: "PB", isbn: "9780000000001" },
        { _id: "item-two", title: "Series Two", format: "PB", isbn: "9780000000002" },
        { _id: "item-three", title: "Series Three", format: "PB", isbn: "9780000000003" },
        { _id: "item-four", title: "Series Four", format: "PB", isbn: "9780000000004" },
      ],
      [],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    const rows = Array.from(document.querySelectorAll<HTMLElement>(".catalog-item-row"));
    rows.forEach((row, index) => {
      Object.defineProperty(row, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ top: index * 80, bottom: index * 80 + 80, height: 80 }),
      });
    });
    const handle = screen.getByRole("button", { name: "Atur urutan Series Four" });
    expect(handle.getAttribute("data-drag-handle")).toBe("true");
    expect(handle.closest(".catalog-item-row")?.getAttribute("draggable")).toBeNull();

    fireEvent.pointerDown(handle, { pointerId: 7, pointerType: "touch", clientY: 280 });
    fireEvent.pointerMove(handle, { pointerId: 7, pointerType: "touch", clientY: 90 });
    await waitFor(() => expect(document.querySelector(".catalog-item-row.is-dragging")).toBeTruthy());
    fireEvent.pointerUp(handle, { pointerId: 7, pointerType: "touch", clientY: 90 });

    await waitFor(() => expect(move).toHaveBeenCalledWith({ catalogItemId: "item-four", targetPosition: 1 }));
  });

  it("shows the drop target after the final remaining item", async () => {
    const move = vi.fn().mockResolvedValue({ moved: true, position: 2 });
    vi.mocked(useMutation).mockReturnValue(move as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "Series Catalog",
        status: "open",
        description: null,
        closesAt: null,
      },
      [
        { _id: "item-one", title: "Series One", format: "PB", isbn: "9780000000001" },
        { _id: "item-two", title: "Series Two", format: "PB", isbn: "9780000000002" },
      ],
      [],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    const rows = Array.from(document.querySelectorAll<HTMLElement>(".catalog-item-row"));
    rows.forEach((row, index) => {
      Object.defineProperty(row, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ top: index * 80, bottom: index * 80 + 80, height: 80 }),
      });
    });
    const handle = screen.getByRole("button", { name: "Atur urutan Series One" });
    fireEvent.pointerDown(handle, { pointerId: 9, pointerType: "mouse", clientY: 40 });
    fireEvent.pointerMove(handle, { pointerId: 9, pointerType: "mouse", clientY: 200 });

    await waitFor(() => expect(screen.getByText("Lepas di sini")).toBeTruthy());
    expect(Array.from(document.querySelectorAll(".catalog-item-row")).at(-1)?.textContent).toContain("Series Two");
  });

  it("shows an accessible error when a drag reorder cannot be persisted", async () => {
    const move = vi.fn().mockRejectedValue(new Error("reorder failed"));
    vi.mocked(useMutation).mockReturnValue(move as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "Series Catalog",
        status: "open",
        description: null,
        closesAt: null,
      },
      [
        { _id: "item-one", title: "Series One", format: "PB", isbn: "9780000000001" },
        { _id: "item-two", title: "Series Two", format: "PB", isbn: "9780000000002" },
      ],
      [],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    const rows = Array.from(document.querySelectorAll<HTMLElement>(".catalog-item-row"));
    rows.forEach((row, index) => {
      Object.defineProperty(row, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ top: index * 80, bottom: index * 80 + 80, height: 80 }),
      });
    });
    const handle = screen.getByRole("button", { name: "Atur urutan Series Two" });
    fireEvent.pointerDown(handle, { pointerId: 8, pointerType: "mouse", clientY: 120 });
    fireEvent.pointerMove(handle, { pointerId: 8, pointerType: "mouse", clientY: 10 });
    fireEvent.pointerUp(handle, { pointerId: 8, pointerType: "mouse", clientY: 10 });

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Perubahan katalog ditolak"));
    expect(move).toHaveBeenCalledWith({ catalogItemId: "item-two", targetPosition: 0 });
  });

  it("keeps drag and fallback reorder actions disabled while the list is filtered", () => {
    const mutationFns = Array.from({ length: 10 }, () => vi.fn());
    let mutationIndex = 0;
    vi.mocked(useMutation).mockImplementation(() => mutationFns[mutationIndex++] as never);
    const queryResults = [
      {
        id: "catalog-1",
        name: "Series Catalog",
        status: "open",
        description: null,
        closesAt: null,
      },
      [
        { _id: "item-one", title: "Series One", format: "PB", isbn: "9780000000001" },
        { _id: "item-two", title: "Series Two", format: "PB", isbn: "9780000000002" },
      ],
      [],
    ];
    let queryIndex = 0;
    vi.mocked(useQuery).mockImplementation(() => queryResults[queryIndex++ % queryResults.length] as never);

    render(<AdminCatalogDetail catalogId="catalog-1" />);

    fireEvent.change(screen.getAllByPlaceholderText("Cari judul, publisher, ISBN, atau penulis")[1], {
      target: { value: "Series One" },
    });

    expect(screen.getByText("Reset pencarian atau Publisher untuk mengatur ulang urutan.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Atur urutan Series One" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Naikkan Series One" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Turunkan Series One" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Reset pencarian" }));
    expect((screen.getByRole("button", { name: "Atur urutan Series One" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
