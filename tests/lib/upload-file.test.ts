import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadBfgFile, type BfgUploadPurpose } from "@/lib/upload-file";

describe("BFG upload client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each<BfgUploadPurpose>(["book-cover", "book-gallery"])(
    "reaches the Convex HTTP site for %s when only the deployment URL is injected",
    async (purpose) => {
      vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://clean-eel-522.convex.cloud");
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ storageId: "storage-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const file = new File(["operator-approved-file"], "WhatsApp Image 2026-08-13 at 22.34.39.jpeg", {
        type: "image/jpeg",
      });

      await expect(uploadBfgFile(file, purpose, async () => "convex-token")).resolves.toBe("storage-id");

      const [url, request] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe(
        `https://clean-eel-522.convex.site/bfg/upload?purpose=${purpose}&fileName=WhatsApp+Image+2026-08-13+at+22.34.39.jpeg`,
      );
      expect(request).toMatchObject({ method: "POST", body: file });
    },
  );
});
