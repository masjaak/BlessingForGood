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

  it("keeps Production Convex issuer synchronization in the release command", () => {
    const { buildCommand } = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string };
    expect(buildCommand).toContain("convex env set CLERK_JWT_ISSUER_DOMAIN");
    expect(buildCommand).toContain("--prod");
  });
});
