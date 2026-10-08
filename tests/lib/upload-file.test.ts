import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BfgUploadError,
  optimizeBfgFileForUpload,
  uploadBfgFile,
  uploadBfgFileWithMetadata,
  type BfgUploadPurpose,
} from "@/lib/upload-file";

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

  it("keeps small public media unchanged and never rewrites private proofs", async () => {
    const smallCover = new File(["small-cover"], "cover.jpg", { type: "image/jpeg" });
    const largeProof = new File([new Uint8Array(900_000)], "proof.jpg", { type: "image/jpeg" });

    await expect(optimizeBfgFileForUpload(smallCover, "book-cover")).resolves.toBe(smallCover);
    await expect(optimizeBfgFileForUpload(largeProof, "payment-proof")).resolves.toBe(largeProof);
  });

  it("returns the optimized file metadata used by server-side validation", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://clean-eel-522.convex.site");
    const optimizedBytes = new Uint8Array(300_000);
    const optimizedBlob = new Blob([optimizedBytes], { type: "image/webp" });

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 1500,
        height: 1500,
        close: vi.fn(),
      })),
    );
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({ drawImage: vi.fn() })),
        toBlob: (callback: (blob: Blob | null) => void) => callback(optimizedBlob),
      })),
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ storageId: "optimized-storage-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const original = new File([new Uint8Array(900_000)], "large-cover.jpg", {
      type: "image/jpeg",
      lastModified: 123,
    });

    await expect(
      uploadBfgFileWithMetadata(
        original,
        "book-cover",
        vi.fn(async () => "token"),
        { aud: "convex" },
      ),
    ).resolves.toMatchObject({
      storageId: "optimized-storage-id",
      fileName: "large-cover.webp",
      mimeType: "image/webp",
      size: 300_000,
    });

    const [url, request] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("fileName=large-cover.webp");
    expect(request).toMatchObject({
      method: "POST",
      body: expect.objectContaining({ name: "large-cover.webp", type: "image/webp" }),
    });
  });

  it("derives the Convex site endpoint when Production only injects the cloud URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://clean-eel-522.convex.cloud");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ storageId: "storage-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const file = new File(["operator-approved-file"], "71NF7HZ5+UL._SL1500_.jpg", { type: "image/jpeg" });

    await expect(
      uploadBfgFile(
        file,
        "book-gallery",
        vi.fn(async () => "token"),
        { aud: "convex" },
      ),
    ).resolves.toBe("storage-id");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://clean-eel-522.convex.site/bfg/upload?purpose=book-gallery&fileName=71NF7HZ5%2BUL._SL1500_.jpg",
    );
  });

  it("classifies a rate-limited response with its retry window", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://clean-eel-522.convex.site");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "RATE_LIMITED", retryAfterSeconds: 90 }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "90" },
      }),
    );

    await expect(
      uploadBfgFile(
        new File(["operator-approved-file"], "book.jpg", { type: "image/jpeg" }),
        "book-gallery",
        vi.fn(async () => "token"),
        { aud: "convex" },
      ),
    ).rejects.toMatchObject({
      code: "UPLOAD_RATE_LIMITED",
      retryAfterSeconds: 90,
    } satisfies Partial<BfgUploadError>);
  });
});
