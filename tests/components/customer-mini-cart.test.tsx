import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery_experimental } from "convex/react";
import { CustomerMiniCart } from "@/features/customer-cart/customer-mini-cart";
import { usePathname } from "next/navigation";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useQuery_experimental: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

const query = vi.mocked(useQuery_experimental);
const pathname = vi.mocked(usePathname);
const product = vi.mocked(useProduct);

function context(overrides: Record<string, unknown> = {}) {
  return {
    dataSource: "convex",
    authState: "authenticated",
    sessionRole: "customer",
    ...overrides,
  } as never;
}

function result(retainedQuantity: number, activeQuantity = retainedQuantity) {
  return {
    status: "success",
    data: { retainedQuantity, activeQuantity, lines: [] },
  } as never;
}

function lastRequest() {
  return query.mock.calls[query.mock.calls.length - 1]?.[0] as { args: unknown };
}

describe("CustomerMiniCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname.mockReturnValue("/catalog");
    product.mockReturnValue(context());
    query.mockReturnValue(result(0));
  });

  it("stays absent for an empty Cart without reserving space", () => {
    render(<CustomerMiniCart />);

    expect(screen.queryByTestId("customer-mini-cart")).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
    expect(lastRequest().args).toEqual({});
  });

  it("renders the retained quantity and the canonical Cart destination", () => {
    query.mockReturnValue(result(3, 2));

    render(<CustomerMiniCart />);

    expect(screen.getByRole("link", { name: "Buka keranjang, 3 buku tersimpan" }).getAttribute("href")).toBe(
      "/account/cart",
    );
    expect(screen.getByText("3 buku")).toBeTruthy();
    expect(screen.queryByText(/Rp/)).toBeNull();
  });

  it("keeps unavailable retained intent visible and follows reactive Cart changes", () => {
    query.mockReturnValue(result(3, 0));
    const view = render(<CustomerMiniCart />);

    expect(screen.getByText("3 buku")).toBeTruthy();

    query.mockReturnValue(result(5, 1));
    view.rerender(<CustomerMiniCart />);
    expect(screen.getByText("5 buku")).toBeTruthy();

    query.mockReturnValue(result(0));
    view.rerender(<CustomerMiniCart />);
    expect(screen.queryByTestId("customer-mini-cart")).toBeNull();
  });

  it.each([
    ["signed-out", { authState: "signed-out", sessionRole: null }],
    ["non-Customer", { authState: "authenticated", sessionRole: "admin" }],
    ["Cart page", { authState: "authenticated", sessionRole: "customer", path: "/account/cart" }],
  ] as const)("does not query or render for %s", (_label, options) => {
    if ("path" in options) pathname.mockReturnValue(options.path);
    product.mockReturnValue(context(options));
    query.mockReturnValue({ status: "pending" } as never);

    render(<CustomerMiniCart />);

    expect(screen.queryByTestId("customer-mini-cart")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it.each(["pending", "error"] as const)("does not flash on Cart query %s", (status) => {
    query.mockReturnValue({ status } as never);

    render(<CustomerMiniCart />);

    expect(screen.queryByTestId("customer-mini-cart")).toBeNull();
  });
});
