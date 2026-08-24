import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonSpecimen } from "./button-specimen";

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("global BFG button system", () => {
  it("covers canonical variants, sizes, states, and semantics", () => {
    render(<ButtonSpecimen />);

    expect(screen.getByRole("button", { name: "Primary" }).className).toContain("button-primary");
    expect(screen.getByRole("button", { name: "Secondary" }).className).toContain("button-secondary");
    expect(screen.getByRole("button", { name: "Tertiary" }).className).toContain("button-tertiary");
    expect(screen.getByRole("button", { name: "Danger" }).className).toContain("button-danger");
    expect(screen.getByRole("button", { name: "Compact" }).className).toContain("button-size-compact");
    expect(screen.getByRole("button", { name: "Large" }).className).toContain("button-size-large");
    expect(screen.getByRole("button", { name: "Close" }).className).toContain("button-icon");
    expect(screen.getByRole("link", { name: "Open account" }).className).toContain("button-icon");
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Saving…" }).getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("button", { name: "Disabled" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Selected option" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps source callsites on the canonical family", () => {
    const source = sourceFiles(join(process.cwd(), "src"))
      .filter((path) => !path.endsWith("/components/ui.tsx"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/variant=["']quiet["']/);
    expect(source).not.toContain("button-quiet");
    expect(source).not.toMatch(/<button\b/);
    expect(source).not.toContain('role="button"');
    expect(source).not.toMatch(/className=["'][^"']*button-(primary|secondary|tertiary|danger)/);
  });
});
