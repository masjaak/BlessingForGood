import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { AdminExceptions } from "@/components/admin-exceptions";
import { AdminReadyStock } from "@/components/admin-ready-stock";
import { AdminRefunds } from "@/components/admin-refunds";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="User profile" />,
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

const productContext = {
  hydrated: true,
  dataSource: "convex",
  sessionRole: "admin",
  userStatus: "active",
  authState: "authenticated",
  catalogLoading: false,
  catalogsLoading: false,
  ordersLoading: false,
  retryAuth: vi.fn(),
  state: { catalogs: [], orders: [], invoices: [] },
};

describe("Admin operational loading grammar", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
    vi.mocked(useProduct).mockReturnValue(productContext as never);
    vi.mocked(useQuery).mockReturnValue(undefined as never);
  });

  it.each([
    ["Ready Stock", AdminReadyStock, "Stok yang siap diproses."],
    ["Exceptions", AdminExceptions, "Selesaikan masalah tanpa menghapus riwayat."],
    ["Refunds", AdminRefunds, "Kewajiban refund dan payout."],
  ] as const)("keeps the Admin page frame mounted while %s loads", (_name, Page, heading) => {
    const { container } = render(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    expect(container.querySelector(".admin-page.admin-operational-page")).toBeTruthy();
    expect(container.querySelector(".admin-workspace")).toBeTruthy();
    expect(container.querySelector(".admin-nav")).toBeTruthy();
    expect(container.querySelector(".admin-content.admin-operational-content .loading-region")).toBeTruthy();
  });
});
