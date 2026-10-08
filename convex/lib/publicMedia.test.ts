import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryCtx } from "../_generated/server";

vi.mock("@convex-dev/r2", () => ({
  R2: class {
    getUrl(key: string) {
      return Promise.resolve(`https://signed.example.invalid/${key}`);
    }
  },
}));

import { publicMediaUrl } from "./publicMedia";

describe("public product media URL routing", () => {
  beforeEach(() => {
    vi.stubEnv("R2_BUCKET", "bfg-public-media");
    vi.stubEnv("R2_ENDPOINT", "https://r2.example.invalid");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-access");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("R2_PUBLIC_BASE_URL", "https://media.blessingforgood.com/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("serves an existing R2 image through the persistent production media domain", async () => {
    const url = await publicMediaUrl({} as QueryCtx, undefined, "folder/book cover.webp");
    expect(url).toBe("https://media.blessingforgood.com/folder/book%20cover.webp");
  });

  it("keeps old Convex-only images available", async () => {
    const storage = { getUrl: vi.fn().mockResolvedValue("https://legacy.convex.cloud/image") };
    const url = await publicMediaUrl({ storage } as unknown as QueryCtx, "legacy-id" as never);
    expect(url).toBe("https://legacy.convex.cloud/image");
    expect(storage.getUrl).toHaveBeenCalledWith("legacy-id");
  });

  it("never claims an R2 object URL when the R2 connection is not configured", async () => {
    vi.stubEnv("R2_BUCKET", "");
    const url = await publicMediaUrl({} as QueryCtx, undefined, "orphan-key");
    expect(url).toBeNull();
  });
});
