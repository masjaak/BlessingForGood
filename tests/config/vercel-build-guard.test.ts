import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const temp = mkdtempSync(join(tmpdir(), "bfg-vercel-build-guard-"));
const marker = join(temp, "convex-command-ran");
const script = join(process.cwd(), "scripts/vercel-build.sh");

function run(overrides: Record<string, string> = {}) {
  return spawnSync("/bin/sh", [script], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: temp,
      VERCEL_ENV: "preview",
      CONVEX_DEPLOY_KEY: "preview:",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_",
      CLERK_SECRET_KEY: "sk_test_",
      BFG_NPX_MARKER: marker,
      ...overrides,
    },
  });
}

describe("Vercel Preview credential gate", () => {
  beforeAll(() => {
    const npx = join(temp, "npx");
    writeFileSync(npx, '#!/bin/sh\n: > "$BFG_NPX_MARKER"\n');
    chmodSync(npx, 0o755);
  });

  afterAll(() => rmSync(temp, { recursive: true, force: true }));

  it("allows only preview Convex and development Clerk types to reach Convex", () => {
    const result = run();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CONVEX_KEY_TYPE=PREVIEW");
    expect(result.stdout).toContain("CLERK_PUBLISHABLE_TYPE=DEVELOPMENT");
    expect(result.stdout).toContain("CLERK_SECRET_TYPE=DEVELOPMENT");
    expect(result.stdout).toContain("CREDENTIAL_GATE=PASS");
    expect(existsSync(marker)).toBe(true);
  });

  it.each([
    ["production Convex", { CONVEX_DEPLOY_KEY: "prod:" }, "CONVEX_KEY_TYPE=PRODUCTION"],
    [
      "production publishable key",
      { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_" },
      "CLERK_PUBLISHABLE_TYPE=PRODUCTION",
    ],
    ["production Clerk secret", { CLERK_SECRET_KEY: "sk_live_" }, "CLERK_SECRET_TYPE=PRODUCTION"],
  ])("stops before Convex for %s", (_name, overrides, classification) => {
    rmSync(marker, { force: true });
    const result = run(overrides);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(classification);
    expect(result.stderr).toContain("CREDENTIAL_GATE=FAIL");
    expect(existsSync(marker)).toBe(false);
  });
});
