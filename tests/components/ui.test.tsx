import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { AdminNav } from "@/components/admin-nav";
import { BrandLogo, BrandMascot } from "@/components/brand";
import { LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

    expect(screen.getByRole("navigation", { name: "Primary navigation" }).querySelectorAll("a")).toHaveLength(5);
    expect(screen.queryByRole("link", { name: "Admin prototype" })).toBeNull();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Catalog" }).getAttribute("href")).toBe("/catalog");
    expect(screen.getByRole("link", { name: "Ready Stock" }).getAttribute("href")).toBe("/ready-stock");
    expect(screen.getByRole("link", { name: "Orders" }).getAttribute("href")).toBe("/account/orders");
    expect(screen.getByRole("link", { name: "Account" }).getAttribute("href")).toBe("/account/invoices");
  });

  it("exposes Clerk authentication controls without adding public admin links", () => {
    render(<SiteShell>Navigation content</SiteShell>);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept invitation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "User profile" })).toBeTruthy();
  });

  it("gives the welcome screen one branded entry point per supported path", () => {
    render(<HomePage />);

    expect(screen.getByRole("img", { name: "Blessing For Goods mascot" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Community guide" }).getAttribute("href")).toBe("/community");
    expect(screen.getAllByRole("link", { name: "How to order" })[0].getAttribute("href")).toBe("/how-to-order");
    expect(screen.getAllByRole("link", { name: "Ready Stock" })[0].getAttribute("href")).toBe("/ready-stock");
  });

  it("marks unimplemented admin destinations without creating dead links", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Catalog" }).getAttribute("href")).toBe("/admin/catalogs");
    expect(screen.getByText("Books").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Settings").getAttribute("aria-disabled")).toBe("true");
  });
});
