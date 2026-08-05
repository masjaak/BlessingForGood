import { beforeEach, describe, expect, it } from "vitest";
import {
  getOrCreatePrototypeSessionToken,
  getStoredPrototypeRole,
  getStoredUnlockedCatalogId,
  setStoredPrototypeRole,
  setStoredUnlockedCatalogId,
} from "@/domain/prototype/session";

describe("Preview prototype session storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("creates a browser session token once and keeps it out of localStorage", () => {
    const first = getOrCreatePrototypeSessionToken();
    const second = getOrCreatePrototypeSessionToken();

    expect(first).toBeTruthy();
    expect(first).toHaveLength(43);
    expect(second).toBe(first);
    expect(window.localStorage.getItem("bfg-prototype-session-v0.1")).toBeNull();
  });

  it("stores only the unlocked catalog pointer and prototype role in session scope", () => {
    setStoredUnlockedCatalogId("catalog-id");
    setStoredPrototypeRole("customer");

    expect(getStoredUnlockedCatalogId()).toBe("catalog-id");
    expect(getStoredPrototypeRole()).toBe("customer");
  });
});
