import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteShell } from "@/components/site-shell";
import { ProductContext } from "@/domain/prototype/context";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/features/customer-cart/customer-mini-cart", () => ({
  CustomerMiniCart: () => <div data-testid="customer-mini-cart-mount" />,
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="User profile" />,
}));

vi.mock("@/components/brand", () => ({
  BrandLogo: () => <span>Blessing For Good</span>,
}));

vi.mock("@/components/admin-shell-link", () => ({
  AdminShellLink: () => null,
}));

vi.mock("@/components/workspace-actions", () => ({
  WorkspaceActivityProvider: ({ children }: { children: ReactNode }) => children,
  WorkspaceActions: () => null,
  useWorkspaceActivity: () => ({}),
}));

vi.mock("@/components/ui", () => ({
  LinkButton: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const pathname = vi.mocked(usePathname);

function productValue() {
  return {
    dataSource: "convex",
    authState: "authenticated",
  } as never;
}

describe("Customer SiteShell mini-cart mounting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname.mockReturnValue("/catalog");
  });

  it("mounts one access layer inside the Customer main rail", () => {
    render(
      <ProductContext.Provider value={productValue()}>
        <SiteShell>
          <div data-testid="customer-content">Catalog</div>
        </SiteShell>
      </ProductContext.Provider>,
    );

    const main = screen.getByRole("main");
    expect(main.querySelectorAll('[data-testid="customer-mini-cart-mount"]')).toHaveLength(1);
    expect(main.querySelector('[data-testid="customer-content"]')).toBeTruthy();
  });

  it("does not mount the Customer access layer in the Admin shell", () => {
    pathname.mockReturnValue("/admin");

    render(
      <ProductContext.Provider value={productValue()}>
        <SiteShell>
          <div>Admin</div>
        </SiteShell>
      </ProductContext.Provider>,
    );

    expect(screen.queryByTestId("customer-mini-cart-mount")).toBeNull();
  });
});
