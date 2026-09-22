import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminNavSkeleton } from "@/components/admin-nav";
import { isAdminShellBootstrapLoading } from "@/components/site-shell";
import type { ProductContextValue } from "@/domain/prototype/context";

function product(overrides: Partial<ProductContextValue> = {}) {
  return {
    hydrated: true,
    dataSource: "convex",
    sessionRole: "admin",
    userStatus: "active",
    customerProfileDisplayName: null,
    authState: "authenticated",
    membershipState: "ACTIVE",
    catalogLoading: false,
    catalogsLoading: false,
    ordersLoading: false,
    retryAuth: () => undefined,
    state: {} as ProductContextValue["state"],
    unlockedCatalog: undefined,
    catalogOptions: [],
    selectCatalog: () => undefined,
    createCatalog: async () => ({}) as never,
    unlockCatalog: async () => undefined,
    submitOrder: async () => ({}) as never,
    updateOrderStatus: () => undefined,
    closeCatalog: async () => undefined,
    editOrder: async () => ({}) as never,
    ...overrides,
  } satisfies ProductContextValue;
}

describe("Admin bootstrap shell loading contract", () => {
  it("skeletonizes only unresolved bootstrap identity", () => {
    expect(isAdminShellBootstrapLoading(null)).toBe(true);
    expect(isAdminShellBootstrapLoading(product({ authState: "loading", hydrated: false }))).toBe(true);
    expect(isAdminShellBootstrapLoading(product())).toBe(false);
    expect(isAdminShellBootstrapLoading(product({ membershipState: "MEMBERSHIP_RECONCILING" }))).toBe(true);
  });

  it("keeps the full sidebar footprint in the bootstrap state", () => {
    const { container } = render(<AdminNavSkeleton />);

    expect(container.querySelectorAll(".admin-nav-group")).toHaveLength(6);
    expect(container.querySelectorAll(".admin-nav-link")).toHaveLength(19);
    expect(container.querySelectorAll(".admin-nav-skeleton-icon")).toHaveLength(19);
  });
});
