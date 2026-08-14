import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import globalsCss from "../../src/app/globals.css?raw";
import { useQuery } from "convex/react";
import HomePage from "@/app/page";
import { AdminShellLink } from "@/components/admin-shell-link";
import { AdminNav } from "@/components/admin-nav";
import { BrandLogo, BrandMascot } from "@/components/brand";
import { LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { ProductContext } from "@/domain/prototype/context";
import { useAuth } from "@clerk/nextjs";

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  UserButton: () => <button aria-label="User profile" type="button" />,
  useAuth: vi.fn(() => ({ isLoaded: true, isSignedIn: false })),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => 0),
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as never);
  vi.mocked(useQuery).mockReturnValue(0 as never);
});

describe("public UI foundation", () => {
  it("renders one accessible page heading and named navigation links", () => {
    render(
      <SiteShell>
        <PageHeader eyebrow="Foundation" title="A useful heading" description="Repository-backed content." />
        <LinkButton href="/catalog">Open catalog</LinkButton>
      </SiteShell>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open catalog" }).getAttribute("href")).toBe("/catalog");
  });

  it("maps the approved brand assets to accessible image variants", () => {
    render(
      <div>
        <BrandLogo />
        <BrandLogo variant="admin" linkToHome={false} />
        <BrandLogo variant="symbol" linkToHome={false} />
        <BrandMascot variant="success" />
      </div>,
    );

    expect(screen.getByRole("img", { name: "Blessing For Goods" }).getAttribute("src")).toContain("Logo-1");
    expect(screen.getByRole("img", { name: "Blessing For Goods operational mark" }).getAttribute("src")).toContain(
      "Logo-1",
    );
    expect(screen.getByRole("img", { name: "Blessing For Goods symbol" }).getAttribute("src")).toContain("Logo-2.png");
    expect(screen.getByRole("img", { name: "Blessing For Goods mascot celebrating" }).getAttribute("src")).toContain(
      "Mascott-3.png",
    );
  });

  it("keeps customer discovery links on public surfaces", () => {
    render(<SiteShell>Navigation content</SiteShell>);

    expect(screen.getByRole("link", { name: "Ready Stock" }).getAttribute("href")).toBe("/ready-stock");
    expect(screen.queryByRole("link", { name: "Admin prototype" })).toBeNull();
  });

  it("exposes the dedicated BFG sign-in route without adding public admin links", () => {
    render(<SiteShell>Navigation content</SiteShell>);

    expect(screen.getByRole("link", { name: "Masuk" }).getAttribute("href")).toBe("/sign-in");
    expect(screen.queryByRole("button", { name: "Accept invitation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "User profile" })).toBeNull();
  });

  it("keeps homepage jobs distinct while preserving supported routes", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("img", { name: "Blessing For Goods mascot with hearts" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Lihat Ready Stock" })[0].getAttribute("href")).toBe("/ready-stock");
    expect(screen.getAllByRole("link", { name: "Buka Secret Catalog" })[0].getAttribute("href")).toBe("/catalog");
    expect(screen.getByRole("link", { name: "Gabung sekarang" }).getAttribute("href")).toBe("/join");
    expect(screen.getByRole("link", { name: /Lihat cara memesan/ }).getAttribute("href")).toBe("/how-to-order");
    expect(screen.getByRole("heading", { name: "Ready Stock" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Secret Catalog" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Gabung Blessfriends" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Perjalanan bukumu" })).toBeTruthy();
    expect(document.querySelector(".hero-panel")).toBeNull();
    expect(screen.queryByText("Kenalan dulu, lalu pilih langkahmu.")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Cara memesan" })[0].getAttribute("href")).toBe("/how-to-order");
  });

  it("links the grouped admin workspace destinations", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Catalogs" }).getAttribute("href")).toBe("/admin/catalogs");
    expect(screen.getByRole("link", { name: "Books" }).getAttribute("href")).toBe("/admin/books");
    expect(screen.getByRole("link", { name: "Ready Stock" }).getAttribute("href")).toBe("/admin/ready-stock");
    expect(screen.getByRole("link", { name: "Payments" }).getAttribute("href")).toBe("/admin/payments");
    expect(document.querySelectorAll(".admin-nav-icon-wrap").length).toBe(
      document.querySelectorAll(".admin-nav-link").length,
    );
    expect(document.querySelectorAll(".admin-nav-icon").length).toBe(
      document.querySelectorAll(".admin-nav-link").length,
    );
  });

  it("does not leave a legacy selector to override the shared nav row", () => {
    expect(globalsCss).not.toContain(".admin-nav a");
  });

  it("shows only the live pending Join Requests count in the Admin sidebar", () => {
    vi.mocked(useQuery).mockReturnValue(3 as never);
    render(
      <ProductContext.Provider value={{ dataSource: "convex", sessionRole: "admin" } as never}>
        <AdminNav />
      </ProductContext.Provider>,
    );

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Join Requests.*3/ })).toBeTruthy();

    vi.mocked(useQuery).mockReturnValue(0 as never);
    render(
      <ProductContext.Provider value={{ dataSource: "convex", sessionRole: "admin" } as never}>
        <AdminNav />
      </ProductContext.Provider>,
    );
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows the shell admin link only for a resolved elevated role", () => {
    const { rerender } = render(
      <ProductContext.Provider value={{ sessionRole: "owner" } as never}>
        <AdminShellLink />
      </ProductContext.Provider>,
    );
    expect(screen.getByRole("link", { name: "Buka Workspace Admin" }).getAttribute("href")).toBe("/admin");

    rerender(
      <ProductContext.Provider value={{ sessionRole: "customer" } as never}>
        <AdminShellLink />
      </ProductContext.Provider>,
    );
    expect(screen.queryByRole("link", { name: "Buka Workspace Admin" })).toBeNull();
  });

  it("keeps the Admin workspace switch out of customer primary navigation", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
    render(
      <ProductContext.Provider value={{ sessionRole: "owner" } as never}>
        <SiteShell>Customer content</SiteShell>
      </ProductContext.Provider>,
    );

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual(["Beranda", "Katalog", "Buku Saya", "Tagihan", "Akun"]);
    expect(within(navigation).queryByRole("link", { name: "Buka Workspace Admin" })).toBeNull();
    expect(screen.getByRole("link", { name: "Buka Workspace Admin" }).getAttribute("href")).toBe("/admin");
  });

  it("renders the mockup-aligned customer bottom navigation for signed-out customers", () => {
    render(<SiteShell>Customer content</SiteShell>);

    const navigation = screen.getByRole("navigation", { name: "Navigasi customer" });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual(["Beranda", "Katalog", "Buku Saya", "Tagihan", "Akun"]);
    expect(screen.queryByLabelText("Buka menu")).toBeNull();
  });

  it("keeps the same bottom navigation for signed-in customers", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
    render(<SiteShell>Customer content</SiteShell>);

    const navigation = screen.getByRole("navigation", { name: "Navigasi customer" });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual(["Beranda", "Katalog", "Buku Saya", "Tagihan", "Akun"]);
    expect(within(navigation).getByRole("link", { name: "Katalog" }).getAttribute("href")).toBe("/catalog");
  });
});
