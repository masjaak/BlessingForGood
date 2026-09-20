import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminSkeletonContent } from "@/components/workspace-skeleton-content";
import { PageHeader } from "@/components/ui";

describe("Admin route loading geometry", () => {
  it("replaces the complete header composition until the route resolves", () => {
    const { container, rerender } = render(
      <PageHeader
        eyebrow="OPERASIONAL BFG"
        title="Pekerjaan penting hari ini."
        description="Antrian utama dari pesanan, batch, pembayaran, invoice, dan penanganan masalah."
        actions={<button type="button">Kelola pesanan</button>}
        loading
        skeleton={{
          eyebrowWidth: "132px",
          titleWidth: "62%",
          descriptionWidths: ["92%", "58%"],
          actionWidths: ["124px"],
        }}
      />,
    );

    expect(screen.queryByText("OPERASIONAL BFG")).toBeNull();
    expect(screen.queryByText("Pekerjaan penting hari ini.")).toBeNull();
    expect(screen.queryByText(/Antrian utama/)).toBeNull();
    expect(container.querySelector("header")?.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll(".page-header-skeleton-eyebrow")).toHaveLength(1);
    expect(container.querySelectorAll(".page-header-skeleton-title")).toHaveLength(1);
    expect(container.querySelectorAll(".page-header-skeleton-description .bfg-skeleton-text")).toHaveLength(2);
    expect(container.querySelectorAll(".page-header-actions .skeleton-cta")).toHaveLength(1);

    rerender(
      <PageHeader
        eyebrow="OPERASIONAL BFG"
        title="Pekerjaan penting hari ini."
        description="Antrian utama dari pesanan, batch, pembayaran, invoice, dan penanganan masalah."
        actions={<button type="button">Kelola pesanan</button>}
      />,
    );

    expect(screen.getByText("OPERASIONAL BFG")).toBeTruthy();
    expect(screen.getByText("Pekerjaan penting hari ini.")).toBeTruthy();
    expect(screen.getByText(/Antrian utama/)).toBeTruthy();
    expect(container.querySelectorAll(".page-header-skeleton-title")).toHaveLength(0);
  });

  it("keeps Books loading geometry feature-owned below the header", () => {
    const { container } = render(<AdminSkeletonContent kind="form-list" variant="book-master" />);

    expect(container.querySelector(".workspace-skeleton-book-create")).toBeTruthy();
    expect(container.querySelector(".workspace-skeleton-book-publisher")).toBeTruthy();
    expect(container.querySelector(".workspace-skeleton-book-filters")).toBeTruthy();
    expect(container.querySelector(".workspace-skeleton-table-card")).toBeTruthy();
    expect(container.querySelectorAll(".workspace-skeleton-table-head .bfg-skeleton-text")).toHaveLength(6);
  });
});
