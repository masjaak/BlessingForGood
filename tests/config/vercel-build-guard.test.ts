import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const temp = mkdtempSync(join(tmpdir(), "bfg-vercel-build-guard-"));
const convexMarker = join(temp, "convex-command-ran");
const npmMarker = join(temp, "npm-command-ran");
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
      BFG_NPX_MARKER: convexMarker,
      BFG_NPM_MARKER: npmMarker,
      ...overrides,
    },
  });
}

describe("Vercel Preview credential gate", () => {
  beforeAll(() => {
    const npx = join(temp, "npx");
    writeFileSync(npx, '#!/bin/sh\n: > "$BFG_NPX_MARKER"\n');
    chmodSync(npx, 0o755);
    const npm = join(temp, "npm");
    writeFileSync(npm, '#!/bin/sh\nprintf "%s" "$*" > "$BFG_NPM_MARKER"\n');
    chmodSync(npm, 0o755);
  });

  afterAll(() => rmSync(temp, { recursive: true, force: true }));

  it("allows only preview Convex and development Clerk types to reach Convex", () => {
    const result = run();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CONVEX_KEY_TYPE=PREVIEW");
    expect(result.stdout).toContain("CLERK_PUBLISHABLE_TYPE=DEVELOPMENT");
    expect(result.stdout).toContain("CLERK_SECRET_TYPE=DEVELOPMENT");
    expect(result.stdout).toContain("CREDENTIAL_GATE=PASS");
    expect(existsSync(convexMarker)).toBe(true);
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
    rmSync(convexMarker, { force: true });
    const result = run(overrides);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(classification);
    expect(result.stderr).toContain("CREDENTIAL_GATE=FAIL");
    expect(existsSync(convexMarker)).toBe(false);
  });

  it("builds directly against a verified Development URL without inspecting the deploy key", () => {
    const result = run({
      SECURITY_STAGING_MODE: "convex-dev",
      CONVEX_DEPLOY_KEY: "unclassified-test-value",
      CONVEX_TARGET_TYPE: "DEVELOPMENT",
      CONVEX_TARGET_REFERENCE: "dev/masjak",
      CONVEX_TARGET_DEPLOYMENT: "content-snake-214",
      NEXT_PUBLIC_CONVEX_URL: "https://content-snake-214.convex.cloud",
      NEXT_PUBLIC_CONVEX_SITE_URL: "https://content-snake-214.convex.site",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SECURITY_STAGING_MODE=convex-dev");
    expect(result.stdout).toContain("CONVEX_TARGET_TYPE=DEVELOPMENT");
    expect(result.stdout).toContain("CONVEX_DEPLOY_COMMAND=DISABLED");
    expect(result.stdout).toContain("CREDENTIAL_GATE=PASS");
    expect(result.stdout).not.toContain("CONVEX_KEY_TYPE");
    expect(result.stdout).not.toContain("unclassified-test-value");
    expect(existsSync(convexMarker)).toBe(false);
    expect(existsSync(npmMarker)).toBe(true);
  });

  it.each([
    ["non-preview environment", { VERCEL_ENV: "production" }],
    ["production target", { CONVEX_TARGET_TYPE: "PRODUCTION", CONVEX_TARGET_REFERENCE: "prod" }],
    ["production deployment reference", { CONVEX_TARGET_REFERENCE: "prod/clean-eel-522" }],
    ["invalid URL", { NEXT_PUBLIC_CONVEX_URL: "https://example.com" }],
    [
      "production URL mismatched with Development metadata",
      { NEXT_PUBLIC_CONVEX_URL: "https://clean-eel-522.convex.cloud" },
    ],
    [
      "production site URL mismatched with Development metadata",
      { NEXT_PUBLIC_CONVEX_SITE_URL: "https://clean-eel-522.convex.site" },
    ],
    ["missing URL", { NEXT_PUBLIC_CONVEX_URL: "" }],
    ["production Clerk secret", { CLERK_SECRET_KEY: "sk_live_" }],
  ])("blocks convex-dev staging for %s before invoking a command", (_name, overrides) => {
    rmSync(convexMarker, { force: true });
    rmSync(npmMarker, { force: true });
    const result = run({
      SECURITY_STAGING_MODE: "convex-dev",
      CONVEX_TARGET_TYPE: "DEVELOPMENT",
      CONVEX_TARGET_REFERENCE: "dev/masjak",
      CONVEX_TARGET_DEPLOYMENT: "content-snake-214",
      NEXT_PUBLIC_CONVEX_URL: "https://content-snake-214.convex.cloud",
      NEXT_PUBLIC_CONVEX_SITE_URL: "https://content-snake-214.convex.site",
      ...overrides,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CREDENTIAL_GATE=FAIL");
    expect(existsSync(convexMarker)).toBe(false);
    expect(existsSync(npmMarker)).toBe(false);
  });
});
