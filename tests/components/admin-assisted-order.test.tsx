import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import AdminOrdersPage from "@/app/admin/orders/page";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

const catalogs = [
  {
    id: "catalog-spring",
    name: "Spring Secret Catalog",
    status: "open",
    closingAt: null,
    books: [
      {
        id: "book-doctor",
        title: "Doctor Fairytale",
        publisher: "Walker Books",
        author: "Alice Author",
        variants: [{ id: "variant-doctor", format: "HB", isbn: "9781529509243", price: 150000 }],
      },
      {
        id: "book-elsewhere",
        title: "Elsewhere Title",
        publisher: "Other Publisher",
        author: "Other Author",
        variants: [{ id: "variant-elsewhere", format: "PB", isbn: "9780000000002", price: 125000 }],
      },
    ],
  },
  {
    id: "catalog-autumn",
    name: "Autumn Secret Catalog",
    status: "open",
    closingAt: null,
    books: [
      {
        id: "book-cross-catalog",
        title: "Doctor Fairytale Elsewhere",
        publisher: "Elsewhere Publisher",
        author: "Elsewhere Author",
        variants: [{ id: "variant-cross-catalog", format: "BB", isbn: "9780000000003", price: 130000 }],
      },
    ],
  },
  {
    id: "catalog-closed",
    name: "Closed Catalog Should Stay Hidden",
    status: "closed",
    closingAt: null,
    books: [],
  },
];

describe("Admin assisted-order discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProduct).mockReturnValue({
      dataSource: "convex",
      state: { catalogs, orders: [], invoices: [] },
      ordersLoading: false,
    } as never);
    vi.mocked(useQuery).mockReturnValue([
      { customerUserId: "customer-1", displayName: "A Customer", memberCode: "BFG-0001" },
    ] as never);
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);
  });

  it("searches Catalog by name and searches scoped variants by title, ISBN, publisher, and author", () => {
    render(<AdminOrdersPage />);

    const catalogSearch = screen.getByPlaceholderText("Cari Catalog...");
    fireEvent.change(catalogSearch, { target: { value: "spring" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Katalog" }));
    expect(screen.getByRole("option", { name: "Spring Secret Catalog" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Autumn Secret Catalog" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Closed Catalog Should Stay Hidden" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Spring Secret Catalog" }));

    const variantSearch = screen.getByPlaceholderText("Cari judul, ISBN, publisher, atau penulis...");
    const variantSelect = screen.getByRole("combobox", { name: "Buku / varian" });
    for (const query of ["doctor fairytale", "9781529509243", "walker books", "alice author"]) {
      fireEvent.change(variantSearch, { target: { value: query } });
      fireEvent.click(variantSelect);
      expect(screen.getByRole("option", { name: /Doctor Fairytale · Walker Books · HB · 9781529509243/ })).toBeTruthy();
      fireEvent.keyDown(variantSelect, { key: "Escape" });
    }

    fireEvent.change(variantSearch, { target: { value: "elsewhere author" } });
    expect(screen.getByText("Tidak ada varian yang cocok.")).toBeTruthy();
    fireEvent.change(variantSearch, { target: { value: "9780000000003" } });
    expect(screen.queryByRole("option", { name: /Doctor Fairytale Elsewhere/ })).toBeNull();
    fireEvent.change(catalogSearch, { target: { value: "does-not-exist" } });
    expect(screen.getByText("Tidak ada Catalog yang cocok.")).toBeTruthy();
    expect(document.querySelector("select")).toBeNull();
  });
});
