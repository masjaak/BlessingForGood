import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { AdminShellLink } from "@/components/admin-shell-link";
import { AdminNav } from "@/components/admin-nav";
import { BrandLogo, BrandMascot } from "@/components/brand";
import { LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { PrototypeContext } from "@/domain/prototype/context";

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children, when }: { children: React.ReactNode; when: "signed-in" | "signed-out" }) =>
    when === "signed-out" ? <>{children}</> : null,
  SignInButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  UserButton: () => <button aria-label="User profile" type="button" />,
}));

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

    expect(screen.getByRole("navigation", { name: "Primary navigation" }).querySelectorAll("a")).toHaveLength(0);
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
    expect(screen.getByRole("link", { name: "Community guide" }).getAttribute("href")).toBe("/community");
    expect(screen.getAllByRole("link", { name: "How to order" })[0].getAttribute("href")).toBe("/how-to-order");
    expect(screen.getAllByRole("link", { name: "Ready Stock" })[0].getAttribute("href")).toBe("/ready-stock");
  });

  it("links implemented admin destinations and marks remaining gaps", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Catalog" }).getAttribute("href")).toBe("/admin/catalogs");
    expect(screen.getByRole("link", { name: "Books" }).getAttribute("href")).toBe("/admin/books");
    expect(screen.getByRole("link", { name: "Payments" }).getAttribute("href")).toBe("/admin/payments");
    expect(screen.getByText("Settings").getAttribute("aria-disabled")).toBe("true");
  });

  it("shows the shell admin link only for a resolved elevated role", () => {
    const { rerender } = render(
      <PrototypeContext.Provider value={{ sessionRole: "owner" } as never}>
        <AdminShellLink />
      </PrototypeContext.Provider>,
    );
    expect(screen.getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");

    rerender(
      <PrototypeContext.Provider value={{ sessionRole: "customer" } as never}>
        <AdminShellLink />
      </PrototypeContext.Provider>,
    );
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  });
});
