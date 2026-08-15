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

  it("keeps route-specific Admin loading anatomy tied to the ready state", () => {
    const { unmount } = render(<PageAwareSkeleton workspace="admin" pathname="/admin/ready-stock" />);

    expect(document.querySelector('[data-skeleton-layout="ready-stock"]')).toBeTruthy();
    expect(document.querySelectorAll(".workspace-skeleton-summary-grid .workspace-skeleton-metric")).toHaveLength(3);
    expect(document.querySelector(".workspace-skeleton-table-card")).toBeTruthy();

    unmount();
    render(<PageAwareSkeleton workspace="admin" pathname="/admin/batches" />);

    expect(document.querySelector('[data-skeleton-layout="batch"]')).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-form")).toBeTruthy();
    expect(document.querySelectorAll(".workspace-skeleton-list-card")).toHaveLength(3);
  });

  it("preserves the populated geometry for Books, Catalogs, and Users", () => {
    const { unmount } = render(<PageAwareSkeleton workspace="admin" pathname="/admin/books" />);
    expect(document.querySelector(".workspace-skeleton-book-create")).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-book-filters")).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-table-card")).toBeTruthy();

    unmount();
    render(<PageAwareSkeleton workspace="admin" pathname="/admin/catalogs" />);
    expect(document.querySelector(".workspace-skeleton-two-column")).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-card-list")).toBeTruthy();

    unmount();
    render(<PageAwareSkeleton workspace="admin" pathname="/admin/users" />);
    expect(screen.getByRole("heading", { name: "Manage BFG users" })).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-users-onboarding")).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-users-filters")).toBeTruthy();
  });

  it("keeps customer list loading anatomy free of unrelated toolbar geometry", () => {
    render(<PageAwareSkeleton workspace="customer" pathname="/account/orders" />);

    expect(document.querySelector('[data-skeleton-layout="customer-card-list"]')).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton-toolbar")).toBeNull();
    expect(document.querySelectorAll(".workspace-skeleton-list-card")).toHaveLength(4);
  });

  it("mirrors the Customer dashboard loading sections", () => {
    render(<PageAwareSkeleton workspace="customer" pathname="/account" />);

    expect(document.querySelectorAll(".workspace-skeleton-customer-metrics .workspace-skeleton-metric")).toHaveLength(
      4,
    );
    expect(
      document.querySelectorAll(".workspace-skeleton-customer-dashboard-grid .workspace-skeleton-panel"),
    ).toHaveLength(6);
  });
});
