import { describe, expect, it } from "vitest";
import { resolveProductAuthState, type ProductAuthResolutionInput } from "@/domain/prototype/context";

const activeCustomer = { role: "customer" as const, status: "active" as const };

function resolve(overrides: Partial<ProductAuthResolutionInput> = {}) {
  return resolveProductAuthState({
    clerkLoaded: true,
    clerkSignedIn: true,
    convexLoading: false,
    convexAuthenticated: true,
    appUser: activeCustomer,
    provisioning: false,
    admissionDenied: false,
    provisionError: false,
    ...overrides,
  });
}

describe("authenticated product session state", () => {
  it("keeps Clerk and Convex hydration separate", () => {
    expect(resolve({ clerkLoaded: false })).toBe("loading");
    expect(resolve({ clerkSignedIn: false })).toBe("signed-out");
    expect(resolve({ convexLoading: true, convexAuthenticated: false })).toBe("convex-loading");
    expect(resolve({ convexAuthenticated: false })).toBe("convex-error");
  });

  it("does not authorize private queries before appUser resolves", () => {
    expect(resolve({ appUser: undefined })).toBe("provisioning");
    expect(resolve({ appUser: null, provisioning: true })).toBe("provisioning");
    expect(resolve({ admissionDenied: true, appUser: null })).toBe("admission-required");
  });

  it("reaches terminal account and role states", () => {
    expect(resolve({ appUser: { role: "customer", status: "active" } })).toBe("authenticated");
    expect(resolve({ appUser: { role: "admin", status: "active" } })).toBe("authenticated");
    expect(resolve({ appUser: { role: "owner", status: "active" } })).toBe("authenticated");
    expect(resolve({ appUser: { role: "customer", status: "suspended" } })).toBe("suspended");
    expect(resolve({ provisionError: true })).toBe("network-error");
  });

  it("rejects invalid transitions into private data", () => {
    expect(resolve({ convexAuthenticated: false, appUser: activeCustomer })).toBe("convex-error");
    expect(resolve({ appUser: undefined })).toBe("provisioning");
  });
});
