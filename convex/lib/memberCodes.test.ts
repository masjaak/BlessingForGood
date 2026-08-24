import { describe, expect, it, vi } from "vitest";
import { nextMemberCode } from "./memberCodes";

describe("member code allocation", () => {
  it("retries a suffix collision and keeps the safe name slug", async () => {
    const existingCodes = new Set(["undo-customer-1234"]);
    const ctx = {
      db: {
        query: () => ({
          withIndex: (_name: string, callback: (index: { eq: (field: string, value: string) => unknown }) => unknown) =>
            callback({ eq: (_field, value) => ({ unique: async () => (existingCodes.has(value) ? { _id: "existing" } : null) }) }),
        }),
      },
    } as never;
    const getRandomValues = vi.spyOn(globalThis.crypto, "getRandomValues");
    getRandomValues
      .mockImplementationOnce((bytes) => {
        if (!bytes) return bytes;
        const values = new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);
        values[0] = 0x04;
        values[1] = 0xd2;
        return bytes;
      })
      .mockImplementationOnce((bytes) => {
        if (!bytes) return bytes;
        const values = new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);
        values[0] = 0x04;
        values[1] = 0xd3;
        return bytes;
      });
    await expect(nextMemberCode(ctx, "Undo / Customer")).resolves.toBe("undo-customer-1235");
    getRandomValues.mockRestore();
  });
});
