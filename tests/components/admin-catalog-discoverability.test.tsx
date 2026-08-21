import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Tanggal tutup")).toBeTruthy();
    expect(document.querySelectorAll("#create-catalog .field-hint")).toHaveLength(3);
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
  });
});
