import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: false } as never);
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
        <BrandLogo variant="symbol" linkToHome={false} />
        <BrandMascot variant="success" />
      </div>,
    );

    expect(screen.getByRole("img", { name: "Blessing For Goods" }).getAttribute("src")).toContain("Logo-4.png");
    expect(screen.getByRole("img", { name: "Blessing For Goods symbol" }).getAttribute("src")).toContain("Logo-2.png");
    expect(screen.getByRole("img", { name: "Blessing For Goods mascot celebrating" }).getAttribute("src")).toContain(
      "Mascott-3.png",
    );
  });

  it("keeps customer navigation on implemented routes", () => {
    render(<SiteShell>Navigation content</SiteShell>);

    expect(
      within(screen.getByRole("navigation", { name: "Primary navigation" }))
        .getByRole("link", { name: "Ready Stock" })
        .getAttribute("href"),
    ).toBe("/ready-stock");
    expect(screen.queryByRole("link", { name: "Admin prototype" })).toBeNull();
  });

  it("exposes Clerk authentication controls without adding public admin links", () => {
    render(<SiteShell>Navigation content</SiteShell>);

    expect(screen.getByRole("button", { name: "Masuk" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept invitation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "User profile" })).toBeNull();
  });

  it("gives the welcome screen one branded entry point per supported path", () => {
    render(<HomePage />);

    expect(screen.getByRole("img", { name: "Blessing For Goods mascot" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Gabung Blessfriends" })[0].getAttribute("href")).toBe("/join");
    expect(screen.getAllByRole("link", { name: "Cara memesan" })[0].getAttribute("href")).toBe("/how-to-order");
    expect(screen.getAllByRole("link", { name: "Ready Stock" })[0].getAttribute("href")).toBe("/ready-stock");
  });

  it("links implemented admin destinations and marks remaining gaps", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Ringkasan" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Katalog" }).getAttribute("href")).toBe("/admin/catalogs");
    expect(screen.getByRole("link", { name: "Buku" }).getAttribute("href")).toBe("/admin/books");
    expect(screen.getByRole("link", { name: "Pembayaran" }).getAttribute("href")).toBe("/admin/payments");
  });

  it("shows the shell admin link only for a resolved elevated role", () => {
    const { rerender } = render(
      <ProductContext.Provider value={{ sessionRole: "owner" } as never}>
        <AdminShellLink />
      </ProductContext.Provider>,
    );
    expect(screen.getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");

    rerender(
      <ProductContext.Provider value={{ sessionRole: "customer" } as never}>
        <AdminShellLink />
      </ProductContext.Provider>,
    );
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  });

  it("renders the mockup-aligned customer bottom navigation for signed-in customers", () => {
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
