import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { ReadyStockCatalog } from "@/components/ready-stock-catalog";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));

describe("Standalone Ready Stock storefront", () => {
  it("renders manual price, format, stock, and requests server price sorting", () => {
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useQuery).mockReturnValue({
      items: [
        {
          listingId: "listing-1",
          slug: "are-we-ready-for-a-pet",
          title: "Are We Ready For A Pet?",
          priceAmount: 195000,
          format: "PB",
          quantity: 3,
          reservedQuantity: 1,
          availableQuantity: 2,
          status: "published",
          coverImageUrl: null,
          gallery: [],
          createdAt: 2,
          updatedAt: 2,
        },
      ],
      filters: { formats: ["PB"] },
    } as never);

    const { container } = render(<ReadyStockCatalog />);
    const card = screen.getByRole("link", { name: /Are We Ready For A Pet/ });
    expect(card.textContent).toContain("195.000");
    expect(card.textContent).toContain("PB");
    expect(card.textContent).toContain("2 tersedia");
    expect(container.querySelectorAll(".ready-stock-card")).toHaveLength(1);

    fireEvent.click(screen.getByRole("combobox", { name: "Urutkan" }));
    fireEvent.click(screen.getByRole("option", { name: "Harga" }));
    expect(vi.mocked(useQuery).mock.lastCall?.[1]).toMatchObject({ sort: "price" });
  });
});
