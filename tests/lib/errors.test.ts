import { describe, expect, it } from "vitest";
import { productErrorMessage } from "@/domain/prototype/errors";

describe("prototype error boundary", () => {
  it("maps Convex failures without exposing request details", () => {
    expect(
      productErrorMessage(
        new Error("[CONVEX M(catalogAccess:unlock)] [Request ID: secret] ACCESS_CODE_INVALID"),
        "fallback",
      ),
    ).toContain("Kode belum cocok");
    expect(productErrorMessage(new Error("[CONVEX M] internal stack trace"), "fallback")).toBe("fallback");
  });

  it("normalizes Ready Stock business errors and hides raw client failures", () => {
    expect(
      productErrorMessage(
        new Error("[CONVEX M(orders:createReadyStock)] READY_STOCK_UNAVAILABLE: Jumlah melebihi stok."),
        "fallback",
      ),
    ).toBe("Jumlah melebihi stok.");
    expect(
      productErrorMessage(new Error("[CONVEX M(orders:createReadyStock)] READY_STOCK_UNAVAILABLE"), "fallback"),
    ).toBe("Stok baru saja habis.");
    expect(
      productErrorMessage(
        new Error("Server Error Called by client [Request ID: secret]"),
        "Pesanan belum berhasil dibuat.",
      ),
    ).toBe("Pesanan belum berhasil dibuat.");
  });
});
