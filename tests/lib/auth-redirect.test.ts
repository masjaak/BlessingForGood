import { describe, expect, it } from "vitest";
import { safeAuthRedirect } from "@/lib/auth-redirect";

describe("safeAuthRedirect", () => {
  it("preserves internal paths and normalizes Clerk absolute redirects", () => {
    expect(safeAuthRedirect("/account/invoices?tab=deposit")).toBe("/account/invoices?tab=deposit");
    expect(safeAuthRedirect("http://localhost:3100/account/invoices")).toBe("/account/invoices");
  });

  it("never returns an external origin or protocol-relative target", () => {
    expect(safeAuthRedirect("https://example.com/account")).toBe("/account");
    expect(safeAuthRedirect("//example.com/account")).toBe("/catalog");
    expect(safeAuthRedirect("javascript:alert(1)")).toBe("/catalog");
  });
});
