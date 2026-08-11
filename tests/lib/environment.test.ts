import { describe, expect, it } from "vitest";
import { isValidBackendUrl } from "@/lib/environment";

describe("product environment guards", () => {
  it("accepts secure Convex URLs", () => {
    expect(isValidBackendUrl("https://content-snake-214.convex.cloud")).toBe(true);
  });

  it("accepts localhost development URLs", () => {
    expect(isValidBackendUrl("http://127.0.0.1:3210")).toBe(true);
  });

  it("rejects missing backend configuration", () => {
    expect(isValidBackendUrl(undefined)).toBe(false);
    expect(isValidBackendUrl("")).toBe(false);
  });

  it("rejects non-http schemes and malformed values", () => {
    expect(isValidBackendUrl("javascript:alert(1)")).toBe(false);
    expect(isValidBackendUrl("not-a-url")).toBe(false);
  });
});
