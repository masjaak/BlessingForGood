import { beforeEach, describe, expect, it } from "vitest";
import { getStoredUnlockedCatalogId, setStoredUnlockedCatalogId } from "@/domain/prototype/session";

describe("catalog session storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores only the unlocked catalog pointer in session scope", () => {
    setStoredUnlockedCatalogId("catalog-id");

    expect(getStoredUnlockedCatalogId()).toBe("catalog-id");
  });
});
