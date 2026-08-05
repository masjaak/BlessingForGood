import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo, BrandMascot } from "@/components/brand";
import { LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

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

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Catalog" }).getAttribute("href")).toBe("/catalog");
    expect(screen.getByRole("link", { name: "Ready Stock" }).getAttribute("href")).toBe("/ready-stock");
    expect(screen.getByRole("link", { name: "Orders" }).getAttribute("href")).toBe("/account/orders");
    expect(screen.getByRole("link", { name: "Account" }).getAttribute("href")).toBe("/account/invoices");
  });
});
