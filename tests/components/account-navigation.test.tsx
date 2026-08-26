import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "@/app/account/page";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="User profile" />,
  useAuth: vi.fn(),
  useClerk: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => 0),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/domain/prototype/operations-context", () => ({
  useOperations: vi.fn(),
}));

describe("customer account navigation", () => {
  const signOut = vi.fn();
  const openUserProfile = vi.fn();

  function renderAccount() {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true, signOut } as never);
    vi.mocked(useClerk).mockReturnValue({ openUserProfile } as never);
    vi.mocked(useProduct).mockReturnValue({
      hydrated: true,
      dataSource: "convex",
      sessionRole: "customer",
      userStatus: "active",
      authState: "authenticated",
      ordersLoading: false,
      retryAuth: vi.fn(),
      state: { catalogs: [], orders: [], invoices: [] },
    } as never);
    vi.mocked(useOperations).mockReturnValue({
      customerInvoiceList: { page: [] },
      customerAccount: { account: { availableAmount: 0, reservedAmount: 0 } },
      customerTransactions: { page: [] },
      customerExceptionList: { page: [] },
    } as never);

    return render(<AccountPage />);
  }

  it("exposes every essential Account action from the account surface", () => {
    renderAccount();
    const accountNavigation = document.querySelector<HTMLElement>(".account-navigation-card");
    expect(accountNavigation).not.toBeNull();
    const navigation = within(accountNavigation!);

    expect(navigation.getByRole("link", { name: /Profil/ }).getAttribute("href")).toBe("/account/profile");
    expect(navigation.getByRole("link", { name: /Alamat pengiriman/ }).getAttribute("href")).toBe("/account/addresses");
    expect(navigation.getByRole("link", { name: /Buka Aktivitas/ }).getAttribute("href")).toBe(
      "/account/notifications",
    );
    expect(navigation.getByRole("button", { name: /Keamanan akun/ })).toBeTruthy();
    expect(navigation.getByRole("button", { name: /^Keluar/ })).toBeTruthy();
    expect(
      within(screen.getByRole("navigation", { name: "Navigasi pelanggan" }))
        .getByRole("link", { name: "Akun" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak Masuk/ })).toBeNull();
  });

  it("uses Clerk for account management and sign-out", () => {
    renderAccount();

    fireEvent.click(screen.getByRole("button", { name: /Keamanan akun/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Keluar/ }));

    expect(openUserProfile).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });
});
