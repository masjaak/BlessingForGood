import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
