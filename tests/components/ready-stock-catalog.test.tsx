import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { ReadyStockCatalog } from "@/components/ready-stock-catalog";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));

describe("Standalone Ready Stock public catalog", () => {
  it("renders manual listing price, format, stock, and requests server price sorting", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue({
      items: [
        {
          listingId: "listing-1",
          id: "listing-1",
          slug: "are-we-ready-for-a-pet",
          title: "Are We Ready For A Pet?",
          priceAmount: 225000,
          format: "PB",
          quantity: 4,
          reservedQuantity: 1,
          availableQuantity: 3,
          status: "published",
          coverUrl: null,
          gallery: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      filters: { formats: ["PB"] },
    } as never);

    const { container } = render(<ReadyStockCatalog />);
    const card = screen.getByRole("link", { name: /Are We Ready For A Pet/ });
    expect(card.textContent).toContain("225.000");
    expect(card.textContent).toContain("PB");
    expect(card.textContent).toContain("3 tersedia");
    expect(container.querySelectorAll(".ready-stock-card")).toHaveLength(1);

    fireEvent.click(screen.getByRole("combobox", { name: "Urutkan" }));
    fireEvent.click(screen.getByRole("option", { name: "Harga" }));
    expect(vi.mocked(useQuery).mock.lastCall?.[1]).toMatchObject({ sort: "price" });
  });

  it("searches the standalone Ready Stock title without Master Buku filters", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue({ items: [], filters: { formats: [] } } as never);

    render(<ReadyStockCatalog />);
    fireEvent.change(screen.getByPlaceholderText("Cari judul Ready Stock"), { target: { value: "Pet" } });

    expect(vi.mocked(useQuery).mock.lastCall?.[1]).toMatchObject({ search: "Pet" });
    expect(screen.queryByRole("combobox", { name: "Penerbit" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Kategori" })).toBeNull();
  });
});
