import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadDirectPublicMedia } from "@/lib/upload-direct-public-media";
import { optimizeBfgFileForUpload } from "@/lib/upload-file";

vi.mock("@/lib/upload-file", async (original) => ({
  ...(await original<typeof import("@/lib/upload-file")>()),
  optimizeBfgFileForUpload: vi.fn(async (file: File) => file),
}));

const target = { bookId: "book-test" as never, purpose: "cover" as const };

describe("Direct public R2 upload contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(optimizeBfgFileForUpload).mockImplementation(async (file) => file);
  });

  it("preserves optimized file name, MIME and bytes through PUT and attach", async () => {
    const optimized = new File([new Uint8Array([1, 2, 3])], "picture.webp", { type: "image/webp" });
    vi.mocked(optimizeBfgFileForUpload).mockResolvedValue(optimized);
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const prepare = vi.fn(async () => ({ key: "key-1", url: "https://r2.example/signed" }));
    const attach = vi.fn(async () => "key-1");
    const original = new File(["JPEG"], "picture.jpg", { type: "image/jpeg" });

    await expect(uploadDirectPublicMedia(original, target, prepare, attach)).resolves.toBe("key-1");
    expect(prepare).toHaveBeenCalledWith(target);
    expect(fetchMock).toHaveBeenCalledWith("https://r2.example/signed", {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: optimized,
    });
    expect(attach).toHaveBeenCalledWith({
      ...target,
      key: "key-1",
      fileName: "picture.webp",
      mimeType: "image/webp",
      altText: undefined,
    });
    vi.unstubAllGlobals();
  });

  it("keeps existing media untouched when R2 upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );
    const prepare = vi.fn(async () => ({ key: "key-2", url: "https://r2.example/signed" }));
    const attach = vi.fn();
    const file = new File(["fake"], "cover.png", { type: "image/png" });
    await expect(uploadDirectPublicMedia(file, target, prepare, attach)).rejects.toThrow(
      "R2 direct upload rejected (403)",
    );
    expect(attach).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rejects invalid content type before signing", async () => {
    const prepare = vi.fn();
    const attach = vi.fn();
    const file = new File(["bad"], "file.gif", { type: "image/gif" });
    await expect(uploadDirectPublicMedia(file, target, prepare, attach)).rejects.toThrow("File gambar");
    expect(prepare).not.toHaveBeenCalled();
  });
});
