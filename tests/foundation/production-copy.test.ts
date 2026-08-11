import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

function source(root: string): string {
  return readdirSync(root, { recursive: true })
    .filter((file) => [".ts", ".tsx"].includes(extname(String(file))))
    .map((file) => readFileSync(join(root, String(file)), "utf8"))
    .join("\n");
}

describe("production presentation guard", () => {
  it("keeps prohibited prototype language out of production-facing source", () => {
    const productionSource = source(join(process.cwd(), "src/app")) + source(join(process.cwd(), "src/components"));
    for (const text of [
      "Prototype Preview",
      "Prototype v0.1",
      "Prototype boundary",
      "Data is stored only in this browser",
      "Admin prototype",
      "production ownership is not enabled yet",
    ]) {
      expect(productionSource).not.toContain(text);
    }
  });

  it("keeps browser-local product storage and mode flags out of runtime source", () => {
    const runtimeSource = source(join(process.cwd(), "src"));
    expect(runtimeSource).not.toContain("window.localStorage");
    expect(runtimeSource).not.toContain("NEXT_PUBLIC_BFG_PROTOTYPE_MODE");
    expect(runtimeSource).not.toContain("NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE");
  });
});
