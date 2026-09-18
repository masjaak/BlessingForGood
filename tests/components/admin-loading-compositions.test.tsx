import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminSkeletonContent } from "@/components/workspace-skeleton-content";

describe("Admin loading geometry contracts", () => {
  it.each([
    ["ready-stock", 3, true],
    ["batch", 3, false],
    ["catalog-list", 2, false],
    ["report", 4, true],
    ["users", 3, false],
  ] as const)("keeps the %s loading composition tied to its resolved anatomy", (variant, cardCount, hasTable) => {
    const { container } = render(<AdminSkeletonContent kind="table-queue" variant={variant} />);

    if (variant === "ready-stock") {
      expect(
        container.querySelectorAll(".workspace-skeleton-summary-grid .workspace-skeleton-summary-item"),
      ).toHaveLength(cardCount);
    } else if (variant === "report") {
      expect(container.querySelectorAll(".workspace-skeleton-metric-grid .workspace-skeleton-metric")).toHaveLength(
        cardCount,
      );
    } else {
      expect(container.querySelectorAll(".workspace-skeleton-list-card")).toHaveLength(cardCount);
    }
    expect(Boolean(container.querySelector(".workspace-skeleton-table-card"))).toBe(hasTable);
  });

  it("keeps the dashboard independent sections separate", () => {
    const { container } = render(<AdminSkeletonContent kind="dashboard" />);

    expect(container.querySelectorAll(".admin-dashboard-section")).toHaveLength(2);
    expect(container.querySelectorAll(".workspace-skeleton-queue-card")).toHaveLength(7);
    expect(container.querySelectorAll(".skeleton-quick-action")).toHaveLength(5);
  });
});
