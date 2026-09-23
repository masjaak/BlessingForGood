import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import AdminCustomersPage from "@/app/admin/customers/page";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/domain/prototype/store", () => ({ useProduct: vi.fn() }));
vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: import("react").ReactNode }) => children,
}));
vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: import("react").ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/admin-nav", () => ({ AdminNav: () => <nav aria-label="Admin navigation" /> }));

type Customer = { customerUserId: string; displayName: string; memberCode: string; email: string };

function customer(index: number, name = `Customer ${String(index).padStart(3, "0")}`): Customer {
  return {
    customerUserId: `customer-${index}`,
    displayName: name,
    memberCode: `member-${index}`,
    email: `customer-${index}@example.com`,
  };
}

function mockCustomerDirectory() {
  vi.mocked(useQuery).mockImplementation(((query: unknown, args?: unknown) => {
    if (args === "skip" || !getFunctionName(query as never).endsWith(":listCustomersForAdmin")) return null as never;
    const queryArgs = args as { paginationOpts: { numItems: number; cursor: string | null }; search?: string };
    const offset = Number(queryArgs.paginationOpts.cursor || 0);
    const search = queryArgs.search?.trim().toLowerCase() || "";
    const rows = search ? Array.from({ length: 27 }, (_, index) => customer(index + 1, `Maria User ${index + 1}`)) : [];
    const page = search
      ? rows.slice(offset, offset + queryArgs.paginationOpts.numItems)
      : Array.from({ length: Math.min(queryArgs.paginationOpts.numItems, 61 - offset) }, (_, index) =>
          customer(offset + index + 1),
        );
    const totalCount = search ? rows.length : 61;
    const nextOffset = offset + page.length;
    return {
      page,
      totalCount,
      totalCountKnown: true,
      isDone: nextOffset >= totalCount,
      continueCursor: nextOffset >= totalCount ? "" : String(nextOffset),
    } as never;
  }) as never);
}

describe("Admin Pelanggan pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    mockCustomerDirectory();
  });

  it("shows a bounded 25-row page, exact range, and three-page navigation", () => {
    render(<AdminCustomersPage />);

    expect(screen.getByText("Menampilkan 1–25 dari 61 pelanggan")).toBeTruthy();
    expect(screen.getByText("Halaman 1 dari 3")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(26);
    const pageSize = screen.getByRole("combobox", { name: "pelanggan per halaman" });
    fireEvent.click(pageSize);
    expect(screen.getByRole("option", { name: "25" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "50" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "100" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "10" })).toBeNull();
  });

  it("searches the directory and resets pagination when search or page size changes", async () => {
    render(<AdminCustomersPage />);

    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    await waitFor(() => expect(screen.getByText("Halaman 2 dari 3")).toBeTruthy());

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari pelanggan" }), {
      target: { value: "Maria" },
    });
    await waitFor(() => expect(screen.getByText("Menampilkan 1–25 dari 27 pelanggan")).toBeTruthy());
    expect(screen.getByText("Maria User 1")).toBeTruthy();
    expect(screen.getByText("Halaman 1 dari 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    await waitFor(() => expect(screen.getByText("Menampilkan 26–27 dari 27 pelanggan")).toBeTruthy());
    expect(screen.getByText("Maria User 27")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    await waitFor(() => expect(screen.getByText("Menampilkan 1–25 dari 27 pelanggan")).toBeTruthy());
    expect(screen.getByText("Halaman 1 dari 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "pelanggan per halaman" }));
    fireEvent.click(screen.getByRole("option", { name: "50" }));
    const directoryCalls = vi.mocked(useQuery).mock.calls.filter(([, args]) => args !== "skip");
    expect(directoryCalls.at(-1)?.[1]).toMatchObject({
      search: "Maria",
      paginationOpts: { numItems: 50, cursor: null },
    });
  });
});
