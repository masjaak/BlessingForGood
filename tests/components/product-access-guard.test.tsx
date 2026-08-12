import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { ProductContext } from "@/domain/prototype/context";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="User profile" />,
}));

function contextValue(overrides: Record<string, unknown> = {}) {
  return {
    hydrated: true,
    dataSource: "convex",
    sessionRole: null,
    userStatus: null,
    authState: "authenticated",
    catalogLoading: false,
    catalogsLoading: false,
    ordersLoading: false,
    retryAuth: vi.fn(),
    state: { catalogs: [], orders: [], invoices: [] },
    ...overrides,
  } as never;
}

describe("ProductAccessGuard session boundary", () => {
  it("shows a terminal Convex auth error with retry instead of a skeleton", () => {
    const retryAuth = vi.fn();
    render(
      <ProductContext.Provider value={contextValue({ authState: "convex-error", retryAuth })}>
        <ProductAccessGuard requiredRole="customer">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Sesi BFG belum siap." })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(retryAuth).toHaveBeenCalledOnce();
  });

  it("shows a terminal account-not-active state for a missing appUser", () => {
    render(
      <ProductContext.Provider value={contextValue({ authState: "admission-required" })}>
        <ProductAccessGuard requiredRole="customer">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Akun ini belum menjadi Blessfriend." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Join Blessfriends" }).getAttribute("href")).toBe("/join");
    expect(screen.queryByText("Private content")).toBeNull();
  });
});
