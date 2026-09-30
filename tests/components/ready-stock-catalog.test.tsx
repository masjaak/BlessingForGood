import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { ReadyStockCatalog } from "@/components/ready-stock-catalog";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));

describe("Ready Stock public selling prices", () => {
  it("renders effective range prices and requests server price sorting", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue({
      items: [
        {
          bookId: "book-1",
          slug: "carry-me",
          title: "Carry Me!",
          author: null,
          publisher: { id: "publisher-1", name: "BFG House" },
          coverImageUrl: null,
          minPrice: 195000,
          maxPrice: 210000,
          totalStock: 3,
          variants: [
            { id: "variant-1", format: "PB", priceAmount: 195000, stockQuantity: 2 },
            { id: "variant-2", format: "HB", priceAmount: 210000, stockQuantity: 1 },
          ],
        },
      ],
      filters: { categories: [], publishers: [], formats: [] },
    } as never);
    const { container } = render(<ReadyStockCatalog />);
    const card = screen.getByRole("link", { name: /Carry Me!/ });
    expect(card.textContent).toContain("195.000");
    expect(card.textContent).toContain("210.000");
    expect(card.textContent).not.toContain("175.000");
    expect(container.querySelectorAll(".ready-stock-card")).toHaveLength(1);
    fireEvent.click(screen.getByRole("combobox", { name: "Urutkan" }));
    fireEvent.click(screen.getByRole("option", { name: "Harga" }));
    expect(vi.mocked(useQuery).mock.lastCall?.[1]).toMatchObject({ sort: "price" });
  });
});
