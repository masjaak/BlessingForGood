import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeQuickGuidance } from "@/components/home-quick-guidance";

describe("homepage quick guidance", () => {
  it("uses native disclosures for the order guide and current PO gateway", () => {
    render(<HomeQuickGuidance />);

    const order = screen.getByText("Cara pesan di BFG").closest("details");
    const po = screen.getByText("Lihat PO yang sedang berjalan").closest("details");
    expect(order?.open).toBe(false);
    expect(po?.open).toBe(false);

    fireEvent.click(screen.getByText("Cara pesan di BFG"));
    fireEvent.click(screen.getByText("Lihat PO yang sedang berjalan"));
    expect(order?.open).toBe(true);
    expect(po?.open).toBe(true);
    expect(screen.getByRole("link", { name: "Lihat cara pesan" }).getAttribute("href")).toBe("/how-to-order");
    expect(screen.getByRole("link", { name: "Buka Secret Catalog" }).getAttribute("href")).toBe("/catalog");
  });

  it("describes the existing gateway without rendering private Catalog data or an access code", () => {
    const { container } = render(<HomeQuickGuidance />);

    expect(screen.getByText(/Access code dibagikan melalui WhatsApp Group BFG/)).toBeTruthy();
    expect(container.querySelectorAll("[data-private-catalog-item]")).toHaveLength(0);
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\b[A-Z0-9]{8,}\b/);
  });
});
