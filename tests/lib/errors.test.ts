import { describe, expect, it } from "vitest";
import { prototypeErrorMessage } from "@/domain/prototype/errors";

describe("prototype error boundary", () => {
  it("maps Convex failures without exposing request details", () => {
    expect(
      prototypeErrorMessage(
        new Error("[CONVEX M(catalogAccess:unlock)] [Request ID: secret] ACCESS_CODE_INVALID"),
        "fallback",
      ),
    ).toContain("Kode belum cocok");
    expect(prototypeErrorMessage(new Error("[CONVEX M] internal stack trace"), "fallback")).toBe("fallback");
  });
});
