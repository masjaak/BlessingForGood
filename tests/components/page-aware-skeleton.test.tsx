import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { PageAwareSkeleton } from "@/components/page-aware-skeleton";
import { ProductContext } from "@/domain/prototype/context";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="User profile" />,
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin/invoices"),
}));

function contextValue(overrides: Record<string, unknown> = {}) {
  return {
    hydrated: false,
    dataSource: "convex",
    sessionRole: null,
    userStatus: null,
    authState: "provisioning",
    catalogLoading: false,
    catalogsLoading: false,
    ordersLoading: false,
    retryAuth: vi.fn(),
    state: { catalogs: [], orders: [], invoices: [] },
    ...overrides,
  } as never;
}

describe("page-aware workspace skeletons", () => {
  it("keeps the Admin shell and finance geometry during auth bootstrap", () => {
    render(
      <ProductContext.Provider value={contextValue()}>
        <ProductAccessGuard requiredRole="admin">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Make the money state explicit." })).toBeTruthy();
    expect(document.querySelector('[data-skeleton="ADMIN_FINANCE_SKELETON"]')).toBeTruthy();
    expect(document.querySelector(".admin-page > .admin-workspace")).toBeTruthy();
    expect(document.querySelector(".admin-nav")).toBeTruthy();
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("uses the customer grammar for owned activity routes", () => {
    render(<PageAwareSkeleton workspace="customer" pathname="/account/inbox" />);

    expect(document.querySelector('[data-skeleton="CUSTOMER_ACTIVITY_SKELETON"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Inbox" })).toBeTruthy();
    expect(document.querySelector(".admin-nav")).toBeNull();
  });

  it("covers the shared Admin archetypes by route", () => {
    const routes = [
      ["/admin", "ADMIN_DASHBOARD_SKELETON"],
      ["/admin/books", "ADMIN_FORM_LIST_SKELETON"],
      ["/admin/catalogs", "ADMIN_FORM_LIST_SKELETON"],
      ["/admin/ready-stock", "ADMIN_TABLE_QUEUE_SKELETON"],
      ["/admin/batches/abc", "ADMIN_DETAIL_SKELETON"],
      ["/admin/invoices", "ADMIN_FINANCE_SKELETON"],
      ["/admin/settings", "ADMIN_SETTINGS_SKELETON"],
    ] as const;

    for (const [pathname, skeleton] of routes) {
      const { unmount } = render(<PageAwareSkeleton workspace="admin" pathname={pathname} />);
      expect(document.querySelector(`[data-skeleton="${skeleton}"]`)).toBeTruthy();
      unmount();
    }
  });

  it("mirrors the Admin dashboard loading sections", () => {
    render(<PageAwareSkeleton workspace="admin" pathname="/admin" />);

    expect(document.querySelectorAll(".admin-dashboard-section")).toHaveLength(2);
    expect(document.querySelectorAll(".admin-queue-grid-primary .workspace-skeleton-queue-card")).toHaveLength(4);
    expect(document.querySelectorAll(".admin-queue-grid-secondary .workspace-skeleton-queue-card")).toHaveLength(3);
    expect(document.querySelectorAll(".workspace-skeleton-quick-actions .skeleton-quick-action")).toHaveLength(5);
  });
});
