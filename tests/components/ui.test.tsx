import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "convex/react";
import HomePage from "@/app/page";
import { AdminShellLink } from "@/components/admin-shell-link";
import { AdminNav } from "@/components/admin-nav";
import { BrandLogo, BrandMascot } from "@/components/brand";
import { AdminShellContext } from "@/components/site-shell";
import { Button, Card, InlineBooleanField, LinkButton, PageHeader } from "@/components/ui";
import { AdminShell, SiteShell } from "@/components/site-shell";
import { ProductContext } from "@/domain/prototype/context";
import { useAuth } from "@clerk/nextjs";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  UserButton: () => <button aria-label="User profile" type="button" />,
  useAuth: vi.fn(() => ({ isLoaded: true, isSignedIn: false })),
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
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
    expect(screen.getByRole("navigation", { name: "Navigasi utama" })).toBeTruthy();
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
    expect(document.querySelector(".brand-logo-frame-primary")).toBeTruthy();
    expect(document.querySelector(".brand-logo-frame-admin")).toBeTruthy();
  });

  it("exposes shared button sizes and frame semantics", () => {
    render(
      <div>
        <Button size="compact">Compact action</Button>
        <LinkButton href="/catalog" size="compact">
          Compact link
        </LinkButton>
        <Card frame="detail">Detail surface</Card>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Compact action" }).className).toContain("button-size-compact");
    expect(screen.getByRole("link", { name: "Compact link" }).className).toContain("button-size-compact");
    expect(document.querySelector("section.frame-detail")).toBeTruthy();
  });

  it("keeps Button and LinkButton on one complete interaction contract", () => {
    render(
      <div>
        <Button variant="secondary" disabled>
          Disabled action
        </Button>
        <LinkButton disabled href="/catalog" variant="secondary">
          Disabled link
        </LinkButton>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Disabled action" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("link", { name: "Disabled link" })).toBeNull();
    expect(screen.getByText("Disabled link").closest(".button")?.getAttribute("aria-disabled")).toBe("true");
    expect(globalsCss).toContain(".button:focus-visible");
    expect(globalsCss).toContain(".button:active:not(:disabled)");
    expect(globalsCss).toContain(".button:disabled");
    expect(globalsCss).toContain("--color-button-secondary-surface");
    expect(globalsCss).toContain("--color-button-secondary-border: #9bb99f");
    expect(globalsCss).toContain(".activity-card.is-unread");
    expect(globalsCss).toContain(".activity-card.is-read");
  });

  it("keeps boolean fields in the shared field row grammar", () => {
    render(<InlineBooleanField checked label="Aktif" onChange={vi.fn()} />);

    expect(document.querySelector(".boolean-field .boolean-field-spacer")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Aktif" })).toHaveProperty("checked", true);
  });

  it("controls select and page-title geometry through shared tokens", () => {
    expect(globalsCss).toContain("appearance: none");
    expect(globalsCss).toContain("-webkit-appearance: none");
    expect(globalsCss).toContain("padding-right: 40px");
    expect(globalsCss).toContain("--control-surface:");
    expect(globalsCss).toContain("grid-template-columns: minmax(0, 1fr) var(--control-trailing-width)");
    expect(globalsCss).toContain(".summary-line + .action-group");
    expect(globalsCss).toContain(".catalog-access-code-section");
    expect(globalsCss).toContain("--type-page-title-size: clamp(1.8rem, 2.4vw, 2.4rem)");
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

  it("keeps the homepage journey grouped and the BFG opening headline readable", () => {
    render(<HomePage />);

    expect(document.querySelector(".home-journey")).toBeTruthy();
    expect(globalsCss).toContain(".customer-shell .home-journey {");
    expect(globalsCss).toContain("max-width: 940px;");
    expect(globalsCss).toContain(".customer-shell .story-card-opening h3 {");
    expect(globalsCss).toContain("color: var(--color-white);");
  });

  it("links the grouped admin workspace destinations", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Dasbor" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Katalog" }).getAttribute("href")).toBe("/admin/catalogs");
    expect(screen.getByRole("link", { name: "Buku" }).getAttribute("href")).toBe("/admin/books");
    expect(screen.getByRole("link", { name: "Ready Stock" }).getAttribute("href")).toBe("/admin/ready-stock");
    expect(screen.getByRole("link", { name: "Pembayaran" }).getAttribute("href")).toBe("/admin/payments");
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

  it("uses one coherent activity entry in the Admin header", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
    render(
      <ProductContext.Provider
        value={{ dataSource: "convex", authState: "authenticated", sessionRole: "owner" } as never}
      >
        <AdminShell>Admin content</AdminShell>
      </ProductContext.Provider>,
    );

    expect(screen.getByRole("button", { name: "Aktivitas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lihat sisi pelanggan" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Notifikasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kotak masuk/ })).toBeNull();
    expect(document.querySelectorAll(".workspace-activity-trigger")).toHaveLength(1);
    expect(globalsCss).toContain(".admin-shell .admin-account > a,\n.workspace-activity-trigger");
  });

  it("shows only the live pending Join Requests count in the Admin sidebar", () => {
    vi.mocked(useQuery).mockReturnValue(3 as never);
    render(
      <ProductContext.Provider value={{ dataSource: "convex", sessionRole: "admin" } as never}>
        <AdminNav />
      </ProductContext.Provider>,
    );

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Permintaan bergabung.*3/ })).toBeTruthy();

    vi.mocked(useQuery).mockReturnValue(0 as never);
    render(
      <ProductContext.Provider value={{ dataSource: "convex", sessionRole: "admin" } as never}>
        <AdminNav />
      </ProductContext.Provider>,
    );
    expect(screen.queryByText("0")).toBeNull();
  });

  it("keeps one mounted sidebar when Admin routes render through the persistent shell", () => {
    const { rerender } = render(
      <AdminShellContext.Provider value>
        <AdminNav />
      </AdminShellContext.Provider>,
    );
    expect(screen.queryByRole("navigation", { name: "Navigasi admin" })).toBeNull();

    rerender(
      <AdminShellContext.Provider value>
        <AdminNav persistent />
      </AdminShellContext.Provider>,
    );
    expect(screen.getByRole("navigation", { name: "Navigasi admin" })).toBeTruthy();
  });

  it("does not expose the persistent Admin sidebar to a resolved customer", () => {
    render(
      <ProductContext.Provider
        value={{ dataSource: "convex", sessionRole: "customer", authState: "authenticated" } as never}
      >
        <AdminShellContext.Provider value>
          <AdminNav persistent />
        </AdminShellContext.Provider>
      </ProductContext.Provider>,
    );

    expect(screen.queryByRole("navigation", { name: "Navigasi admin" })).toBeNull();
  });

  it("shows the shell admin link only for a resolved elevated role", () => {
    const { rerender } = render(
      <ProductContext.Provider value={{ sessionRole: "owner" } as never}>
        <AdminShellLink />
      </ProductContext.Provider>,
    );
    expect(screen.getByRole("link", { name: "Buka ruang kerja Admin" }).getAttribute("href")).toBe("/admin");

    rerender(
      <ProductContext.Provider value={{ sessionRole: "customer" } as never}>
        <AdminShellLink />
      </ProductContext.Provider>,
    );
    expect(screen.queryByRole("link", { name: "Buka ruang kerja Admin" })).toBeNull();
  });

  it("keeps the Admin workspace switch out of customer primary navigation", () => {
    vi.mocked(useAuth).mockReturnValue({ isLoaded: true, isSignedIn: true } as never);
    render(
      <ProductContext.Provider value={{ sessionRole: "owner", authState: "authenticated" } as never}>
        <SiteShell>Customer content</SiteShell>
      </ProductContext.Provider>,
    );

    const navigation = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual(["Beranda", "Katalog", "Buku Saya", "Tagihan", "Akun"]);
    expect(within(navigation).queryByRole("link", { name: "Buka ruang kerja Admin" })).toBeNull();
    expect(screen.getByRole("link", { name: "Buka ruang kerja Admin" }).getAttribute("href")).toBe("/admin");
  });

  it("renders the mockup-aligned customer bottom navigation for signed-out customers", () => {
    render(<SiteShell>Customer content</SiteShell>);

    const navigation = screen.getByRole("navigation", { name: "Navigasi pelanggan" });
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

    const navigation = screen.getByRole("navigation", { name: "Navigasi pelanggan" });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent?.trim()),
    ).toEqual(["Beranda", "Katalog", "Buku Saya", "Tagihan", "Akun"]);
    expect(within(navigation).getByRole("link", { name: "Katalog" }).getAttribute("href")).toBe("/catalog");
  });
});
