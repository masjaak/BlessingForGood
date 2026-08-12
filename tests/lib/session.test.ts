import { beforeEach, describe, expect, it } from "vitest";
import {
  getStoredCatalogSession,
  getStoredUnlockedCatalogId,
  setStoredCatalogSession,
  setStoredUnlockedCatalogId,
} from "@/domain/prototype/session";

describe("catalog session storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores only the unlocked catalog pointer in session scope", () => {
    setStoredUnlockedCatalogId("catalog-id");

    expect(getStoredUnlockedCatalogId()).toBe("catalog-id");
  });

  it("stores an opaque, expiring catalog session separately from the original code", () => {
    setStoredCatalogSession({ catalogId: "catalog-id", sessionToken: "opaque-session", expiresAt: Date.now() + 1000 });

    expect(getStoredCatalogSession()).toEqual({
      catalogId: "catalog-id",
      sessionToken: "opaque-session",
      expiresAt: expect.any(Number),
    });
    expect(window.sessionStorage.getItem("bfg-catalog-session")).toContain("opaque-session");
    expect(window.sessionStorage.getItem("bfg-catalog-session")).not.toContain("catalog-secret");
  });
});
