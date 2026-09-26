import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { requireClerkIssuer } from "../../convex/lib/auth_config";

describe("Convex Clerk auth configuration", () => {
  it("rejects an absent issuer instead of silently deploying unauthenticated Convex", () => {
    expect(() => requireClerkIssuer(undefined)).toThrow("CLERK_JWT_ISSUER_DOMAIN");
    expect(() => requireClerkIssuer("")).toThrow("CLERK_JWT_ISSUER_DOMAIN");
  });

  it("rejects non-HTTPS issuers", () => {
    expect(() => requireClerkIssuer("clerk.blessingforgood.com")).toThrow("HTTPS");
    expect(() => requireClerkIssuer("http://clerk.blessingforgood.com")).toThrow("HTTPS");
  });

  it("preserves the configured Clerk issuer", () => {
    expect(requireClerkIssuer("https://clerk.blessingforgood.com")).toBe("https://clerk.blessingforgood.com");
  });

  it("keeps Convex issuer synchronization in the Production build case", () => {
    const { buildCommand } = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string };
    const buildScript = readFileSync("scripts/vercel-build.sh", "utf8");
    const productionCase = buildScript.split("  production)\n")[1]?.split("  *)")[0] ?? "";

    expect(buildCommand).toBe("sh scripts/vercel-build.sh");
    expect(productionCase).toContain(
      "printf '%s' \"$CLERK_JWT_ISSUER_DOMAIN\" | npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN",
    );
    expect(productionCase).toContain("printf '%s' \"$CLERK_SECRET_KEY\" | npx convex env set --prod CLERK_SECRET_KEY");
    expect(productionCase).toContain("--prod");
  });
});
