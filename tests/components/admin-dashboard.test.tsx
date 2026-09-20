import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery_experimental } from "convex/react";
import { getFunctionName } from "convex/server";
import AdminPage from "@/app/admin/page";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useQuery_experimental: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/product-access-guard", () => ({
  ProductAccessGuard: ({ children }: { children: import("react").ReactNode }) => children,
}));

vi.mock("@/components/site-shell", () => ({
  SiteShell: ({ children }: { children: import("react").ReactNode }) => children,
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

const countQueryNames = [
  "joinRequests:pendingCount",
  "orders:countSubmittedForAdmin",
  "paymentConfirmations:countPendingForAdmin",
  "orderExceptions:countOpenForAdmin",
  "batches:countActiveForAdmin",
  "invoices:countOpenForAdmin",
  "refunds:countPendingForAdmin",
] as const;

type QueryState = { status: "pending" } | { status: "error"; error: Error } | { status: "success"; data: number };

function successCounts(): Record<(typeof countQueryNames)[number], QueryState> {
  return Object.fromEntries(
    countQueryNames.map((name, index) => [name, { status: "success", data: index + 1 }]),
  ) as Record<(typeof countQueryNames)[number], QueryState>;
}

function setupQueryStates(states: Record<(typeof countQueryNames)[number], QueryState>) {
  vi.mocked(useQuery_experimental).mockImplementation(({ query }) => {
    return states[getFunctionName(query as never) as (typeof countQueryNames)[number]] as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useProduct).mockReturnValue({
    dataSource: "convex",
    sessionRole: "admin",
  } as never);
});

describe("Admin Dashboard loading", () => {
  it("skeletonizes the route header with the body while one source is slow", () => {
    const states = successCounts();
    states["refunds:countPendingForAdmin"] = { status: "pending" };
    setupQueryStates(states);

    render(<AdminPage />);

    expect(document.querySelector(".page-header[aria-busy='true'] h1")).toBeTruthy();
    expect(screen.queryByText("Pekerjaan penting hari ini.")).toBeNull();
    expect(document.querySelectorAll(".admin-dashboard-section")).toHaveLength(2);
    expect(document.querySelector('[data-dashboard-block="Pesanan baru"][data-dashboard-state="ready"]')).toBeNull();
    expect(document.querySelector('[data-dashboard-block="Refund"][data-dashboard-state="loading"]')).toBeNull();
  });

  it.each(countQueryNames)("keeps healthy cards available when %s fails", (failedQuery) => {
    const states = successCounts();
    states[failedQuery] = { status: "error", error: new Error("query failed") };
    setupQueryStates(states);

    render(<AdminPage />);

    expect(document.querySelectorAll('[data-dashboard-state="unavailable"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-dashboard-state="ready"]')).toHaveLength(6);
    expect(screen.getByText("Data belum tersedia saat ini.")).toBeTruthy();
    expect(document.querySelector(".workspace-skeleton")).toBeNull();
  });

  it("keeps the initial route skeleton until every dashboard count resolves", () => {
    const states = Object.fromEntries(countQueryNames.map((name) => [name, { status: "pending" }])) as Record<
      (typeof countQueryNames)[number],
      QueryState
    >;
    setupQueryStates(states);
    const view = render(<AdminPage />);

    expect(document.querySelector(".page-header[aria-busy='true'] h1")).toBeTruthy();
    expect(document.querySelectorAll(".admin-dashboard-section")).toHaveLength(2);
    states["orders:countSubmittedForAdmin"] = { status: "success", data: 12 };
    view.rerender(<AdminPage />);
    expect(document.querySelector(".page-header[aria-busy='true'] h1")).toBeTruthy();
    expect(document.querySelectorAll(".admin-dashboard-section")).toHaveLength(2);

    for (const name of countQueryNames) states[name] = { status: "success", data: 0 };
    view.rerender(<AdminPage />);
    expect(document.querySelectorAll('[data-dashboard-state="ready"]')).toHaveLength(7);
    expect(document.querySelectorAll('[data-dashboard-state="loading"]')).toHaveLength(0);
    expect(document.querySelector(".workspace-skeleton")).toBeNull();
  });
});
