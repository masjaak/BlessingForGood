import { afterEach, describe, expect, it, vi } from "vitest";
import type { QueryCtx } from "../_generated/server";
import { publicMediaUrl } from "./publicMedia";

const fakeCtx = {} as QueryCtx;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("BFG R2 public media delivery", () => {
  it("uses the stable Cloudflare custom domain for the BFG production bucket", async () => {
    vi.stubEnv("R2_BUCKET", "bfg-public-media");
    vi.stubEnv("R2_ENDPOINT", "https://example.r2.cloudflarestorage.com");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("R2_PUBLIC_BASE_URL", "https://pub-old.r2.dev");
    await expect(publicMediaUrl(fakeCtx, undefined, "image-key")).resolves.toBe(
      "https://media.blessingforgood.com/image-key",
    );
  });

  it("keeps existing public images accessible without R2 upload credentials", async () => {
    vi.stubEnv("R2_BUCKET", "bfg-public-media");
    vi.stubEnv("R2_ENDPOINT", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    await expect(publicMediaUrl(fakeCtx, undefined, "saved-image-key")).resolves.toBe(
      "https://media.blessingforgood.com/saved-image-key",
    );
  });

  it("retains a custom base URL for unrelated R2 buckets", async () => {
    vi.stubEnv("R2_BUCKET", "other-test-bucket");
    vi.stubEnv("R2_ENDPOINT", "https://example.r2.cloudflarestorage.com");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("R2_PUBLIC_BASE_URL", "https://assets.example.test");
    await expect(publicMediaUrl(fakeCtx, undefined, "folder/image key")).resolves.toBe(
      "https://assets.example.test/folder/image%20key",
    );
  });
});
