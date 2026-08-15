import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "@/app/account/page";
import { useAuth } from "@clerk/nextjs";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="User profile" />,
  useAuth: vi.fn(() => ({ isLoaded: true, isSignedIn: true })),
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
  it("exposes profile and address routes from the account surface", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
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

    render(<AccountPage />);

    expect(screen.getByRole("link", { name: /Profil/ }).getAttribute("href")).toBe("/account/profile");
    expect(screen.getByRole("link", { name: /Alamat pengiriman/ }).getAttribute("href")).toBe("/account/addresses");
    expect(screen.getByRole("link", { name: /Notifikasi/ }).getAttribute("href")).toBe("/account/notifications");
    expect(screen.getByRole("link", { name: /Kotak Masuk/ }).getAttribute("href")).toBe("/account/inbox");
  });
});
