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
    expect(
      screen.getByText("Untuk membuka Buku Saya, Tagihan, dan Akun, kirim permintaan bergabung terlebih dahulu."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gabung Blessfriends" }).getAttribute("href")).toBe("/join");
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("does not tell an approved applicant to apply again", () => {
    render(
      <ProductContext.Provider
        value={contextValue({ authState: "admission-required", membershipState: "APPROVED_INVITATION_PENDING" })}
      >
        <ProductAccessGuard requiredRole="customer">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Permintaanmu sudah disetujui." })).toBeTruthy();
    expect(screen.getByText("Kami sedang menyelesaikan aktivasi akunmu.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Gabung Blessfriends" })).toBeNull();
  });

  it("routes an approved existing identity to sign-in", () => {
    render(
      <ProductContext.Provider
        value={contextValue({ authState: "admission-required", membershipState: "EXISTING_IDENTITY_SIGNIN_REQUIRED" })}
      >
        <ProductAccessGuard requiredRole="customer">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Akun BFG-mu sudah ada." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Masuk dengan akun BFG" }).getAttribute("href")).toBe(
      "/sign-in?redirect_url=%2Faccount",
    );
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("denies signed-out users from the Admin workspace", () => {
    render(
      <ProductContext.Provider value={contextValue({ authState: "signed-out" })}>
        <ProductAccessGuard requiredRole="admin">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Masuk lewat Akun untuk melihat bagian ini." })).toBeTruthy();
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it.each([
    ["customer", "Halaman ini tidak tersedia untuk akunmu", false],
    ["admin", "Private content", true],
    ["owner", "Private content", true],
  ] as const)("enforces Admin workspace access for %s", (role, expectedText, allowed) => {
    render(
      <ProductContext.Provider value={contextValue({ sessionRole: role })}>
        <ProductAccessGuard requiredRole="admin">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.queryByText("Private content") !== null).toBe(allowed);
    expect(screen.getByText(expectedText)).toBeTruthy();
  });

  it("denies the Admin workspace to suspended accounts", () => {
    render(
      <ProductContext.Provider value={contextValue({ authState: "suspended", userStatus: "suspended" })}>
        <ProductAccessGuard requiredRole="admin">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Akses akun tidak tersedia" })).toBeTruthy();
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("sends removed memberships back to the fresh Join flow", () => {
    render(
      <ProductContext.Provider value={contextValue({ authState: "removed", userStatus: "removed" })}>
        <ProductAccessGuard requiredRole="customer">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Akun ini bukan Blessfriend aktif." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gabung Blessfriends" }).getAttribute("href")).toBe("/join");
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it.each(["customer", "admin", "owner"] as const)("allows active %s accounts into the customer workspace", (role) => {
    render(
      <ProductContext.Provider value={contextValue({ sessionRole: role })}>
        <ProductAccessGuard requiredRole="customer">Private content</ProductAccessGuard>
      </ProductContext.Provider>,
    );

    expect(screen.getByText("Private content")).toBeTruthy();
  });
});
