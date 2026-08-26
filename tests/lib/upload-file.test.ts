import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadBfgFile, type BfgUploadPurpose } from "@/lib/upload-file";

describe("BFG upload client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each<BfgUploadPurpose>(["book-cover", "book-gallery"])(
    "uses the native Convex session token for %s",
    async (purpose) => {
      vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://clean-eel-522.convex.site");
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ storageId: "storage-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const file = new File(["operator-approved-file"], "WhatsApp Image 2026-08-13 at 22.34.39.jpeg", {
        type: "image/jpeg",
      });
      const getToken = vi.fn(async ({ template }: { template?: "convex" }) => {
        if (template) throw new Error("JWT template is unavailable for the native Convex integration");
        return "native-convex-session-token";
      });
      await expect(uploadBfgFile(file, purpose, getToken, { aud: "convex" })).resolves.toBe("storage-id");

      expect(getToken).toHaveBeenCalledWith({});
      const [url, request] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe(
        `https://clean-eel-522.convex.site/bfg/upload?purpose=${purpose}&fileName=WhatsApp+Image+2026-08-13+at+22.34.39.jpeg`,
      );
      expect(request).toMatchObject({ method: "POST", body: file });
    },
  );
});
