import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "../next.config";

describe("Clerk challenge CSP contract", () => {
  it("allows the current Clerk and Cloudflare challenge surfaces without a global wildcard", () => {
    expect(contentSecurityPolicy).toContain("https://challenges.cloudflare.com");
    expect(contentSecurityPolicy).toContain("https://*.protect.clerk.com");
    expect(contentSecurityPolicy).toContain("https://*.protect.clerk.com:*");
    expect(contentSecurityPolicy).toContain("https://img.clerk.com");
    expect(contentSecurityPolicy).toContain("worker-src 'self' blob:");
    expect(contentSecurityPolicy).not.toContain("default-src *");
    expect(contentSecurityPolicy).not.toContain("script-src *");
  });
});
