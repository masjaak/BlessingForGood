import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { AdminBookDetail } from "@/components/admin-book-detail";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { ProductGallery } from "@/components/product-gallery";
import { useProduct } from "@/domain/prototype/store";
import { BfgUploadError, uploadBfgFile } from "@/lib/upload-file";

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

vi.mock("@/lib/upload-file", async () => ({
  ...(await vi.importActual<typeof import("@/lib/upload-file")>("@/lib/upload-file")),
  uploadBfgFile: vi.fn(),
}));

type TestGalleryImage = {
  mediaId: string;
  storageId: string;
  displayOrder: number;
  altText: string;
  url: string | null;
};

type TestBook = {
  _id: string;
  publisherId: string;
  title: string;
  slug: string;
  author: string | null;
  description: string | null;
  categories: string[];
  publicationStatus: "draft" | "published" | "special" | "archived";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  coverImageUrl: string | null;
  coverUrl: string | null;
  coverPresentation: null;
  gallery: TestGalleryImage[];
  externalPreviewLabel: string | null;
  externalPreviewUrl: string | null;
  publisher: { name: string };
  variants: never[];
};

const baseBook: TestBook = {
  _id: "book-1",
  publisherId: "publisher-1",
  title: "Media Book",
  slug: "media-book",
  author: null,
  description: null,
  categories: [],
  publicationStatus: "draft",
  isActive: true,
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
  coverImageUrl: null,
  coverUrl: null,
  coverPresentation: null,
  gallery: [],
  externalPreviewLabel: null,
  externalPreviewUrl: null,
  publisher: { name: "Test Publisher" },
  variants: [],
};

function storageUrl(storageId: string) {
  return `https://clean-eel-522.convex.cloud/api/storage/${storageId}`;
}

function galleryImage(index: number, altText = `Gallery image ${index + 1}`): TestGalleryImage {
  return {
    mediaId: `media-${index + 1}`,
    storageId: `storage-${index + 1}`,
    displayOrder: index,
    altText,
    url: storageUrl(`gallery-${index + 1}`),
  };
}

function imageFile(name: string, type = "image/png") {
  return new File([name], name, { type });
}

function mockActions({
  attachCover = vi.fn(),
  attachGallery = vi.fn(),
  removeGallery = vi.fn(),
  moveGallery = vi.fn(),
  updateExternalPreview = vi.fn(),
}: {
  attachCover?: ReturnType<typeof vi.fn>;
  attachGallery?: ReturnType<typeof vi.fn>;
  removeGallery?: ReturnType<typeof vi.fn>;
  moveGallery?: ReturnType<typeof vi.fn>;
  updateExternalPreview?: ReturnType<typeof vi.fn>;
} = {}) {
  let actionIndex = 0;
  const actions = [attachCover, attachGallery];
  vi.mocked(useAction).mockImplementation(() => actions[actionIndex++ % actions.length] as never);
  let mutationIndex = 0;
  const mutations = [vi.fn(), vi.fn(), vi.fn(), removeGallery, moveGallery, updateExternalPreview];
  vi.mocked(useMutation).mockImplementation(() => mutations[mutationIndex++ % mutations.length] as never);
}

function renderAdminBook(book: TestBook = baseBook) {
  const state = { currentBook: book };
  vi.mocked(useQuery).mockImplementation(((...queryOptions: readonly unknown[]) => {
    const args = queryOptions[1];
    if (args && typeof args === "object" && "paginationOpts" in args) return { page: [] } as never;
    return state.currentBook as never;
  }) as never);
  const view = render(<AdminBookDetail bookId="book-1" />);
  return { state, view };
}

describe("Admin Book media characterization", () => {
  beforeEach(() => {
    vi.mocked(useAction).mockReset();
    vi.mocked(useMutation).mockReset();
    vi.mocked(useQuery).mockReset();
    vi.mocked(uploadBfgFile).mockReset();
    vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
    vi.mocked(useAuth).mockReturnValue({ getToken: vi.fn(), sessionClaims: { aud: "convex" } } as never);
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("renders the empty media state, persisted cover, and persisted gallery order", () => {
    mockActions();
    const { state, view } = renderAdminBook();

    expect(screen.getByText("Belum ada cover")).toBeTruthy();
    expect(screen.getByText("Belum ada gambar tambahan.")).toBeTruthy();
    expect(screen.getByText("0/8")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Simpan cover" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Simpan gambar" }) as HTMLButtonElement).disabled).toBe(true);

    state.currentBook = {
      ...baseBook,
      coverUrl: storageUrl("cover-persisted"),
      gallery: [galleryImage(0, "First page"), galleryImage(1, "Second page")],
    };
    view.rerender(<AdminBookDetail bookId="book-1" />);

    expect(screen.getByRole("img", { name: "Media Book cover preview" }).getAttribute("src")).toBe(
      storageUrl("cover-persisted"),
    );
    expect(screen.getByRole("img", { name: "First page" }).getAttribute("src")).toBe(storageUrl("gallery-1"));
    expect(
      Array.from(document.querySelectorAll<HTMLElement>(".product-media-row")).map(
        (row) => row.querySelector("small")?.textContent,
      ),
    ).toEqual(["First page", "Second page"]);
    expect(screen.getByRole("button", { name: "Naikkan gambar 1" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Turunkan gambar 2" })).toHaveProperty("disabled", true);
  });

  it("uploads a replacement cover, passes the file through, and follows the refreshed cover query", async () => {
    const attachCover = vi.fn().mockImplementation(async ({ storageId }: { storageId: string }) => {
      state.currentBook = { ...state.currentBook, coverUrl: storageUrl(storageId) };
    });
    mockActions({ attachCover });
    const { state, view } = renderAdminBook({ ...baseBook, coverUrl: storageUrl("cover-old") });
    let resolveUpload: (storageId: string) => void = () => {};
    vi.mocked(uploadBfgFile).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve as (storageId: string) => void;
      }) as never,
    );
    const file = imageFile("cover-new.png");
    fireEvent.change(screen.getByLabelText("Pilih file cover"), { target: { files: [file] } });
    const save = screen.getByRole("button", { name: "Simpan cover" });
    fireEvent.click(save);

    await waitFor(() => {
      expect(save.getAttribute("data-loading")).toBe("true");
      expect((screen.getByLabelText("Pilih file cover") as HTMLInputElement).disabled).toBe(true);
    });
    resolveUpload("storage-cover-new");

    await waitFor(() => expect(screen.getByText("Cover tersimpan.")).toBeTruthy());
    view.rerender(<AdminBookDetail bookId="book-1" />);
    expect(uploadBfgFile).toHaveBeenCalledWith(file, "book-cover", expect.any(Function), { aud: "convex" });
    expect(attachCover).toHaveBeenCalledWith({
      bookId: "book-1",
      storageId: "storage-cover-new",
      fileName: "cover-new.png",
      mimeType: "image/png",
    });
    expect(save.getAttribute("data-loading")).toBeNull();
    expect(within(document.querySelector(".cover-upload-field")!).getByText("Belum ada file dipilih")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Media Book cover preview" }).getAttribute("src")).toBe(
      storageUrl("storage-cover-new"),
    );
  });

  it("blocks invalid cover selection before transport", () => {
    mockActions();
    renderAdminBook({ ...baseBook, coverUrl: storageUrl("cover-existing") });
    const file = imageFile("cover.gif", "image/gif");
    fireEvent.change(screen.getByLabelText("Pilih file cover"), { target: { files: [file] } });

    expect(screen.getByRole("alert").textContent).toContain("Cover harus berupa JPG, PNG, atau WebP.");
    expect((screen.getByRole("button", { name: "Simpan cover" }) as HTMLButtonElement).disabled).toBe(true);
    expect(uploadBfgFile).not.toHaveBeenCalled();
  });

  it("clears cover loading after transport failure and allows the next selection", async () => {
    mockActions();
    renderAdminBook({ ...baseBook, coverUrl: storageUrl("cover-existing") });
    vi.mocked(uploadBfgFile).mockRejectedValueOnce(new Error("network-like failure"));
    const input = screen.getByLabelText("Pilih file cover");
    const save = screen.getByRole("button", { name: "Simpan cover" });

    fireEvent.change(input, { target: { files: [imageFile("cover-first.png")] } });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Unggah cover belum tersimpan. Coba lagi."));

    expect(save.getAttribute("data-loading")).toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(false);
    fireEvent.change(input, { target: { files: [imageFile("cover-retry.png")] } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect((save as HTMLButtonElement).disabled).toBe(false);
  });

  it("preserves the current rate-limit message and releases the cover action", async () => {
    mockActions();
    renderAdminBook({ ...baseBook, coverUrl: storageUrl("cover-existing") });
    vi.mocked(uploadBfgFile).mockRejectedValueOnce(new BfgUploadError("UPLOAD_RATE_LIMITED", 42));
    const save = screen.getByRole("button", { name: "Simpan cover" });
    fireEvent.change(screen.getByLabelText("Pilih file cover"), { target: { files: [imageFile("cover.png")] } });
    fireEvent.click(save);

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Unggah cover sementara dibatasi. Coba lagi dalam 42 detik."),
    );
    expect(save.getAttribute("data-loading")).toBeNull();
  });

  it("uploads gallery media with alt text and renders it after the query refresh", async () => {
    const attachGallery = vi
      .fn()
      .mockImplementation(async ({ storageId, altText }: { storageId: string; altText: string }) => {
        state.currentBook = {
          ...state.currentBook,
          gallery: [
            ...state.currentBook.gallery,
            {
              mediaId: storageId,
              storageId,
              displayOrder: state.currentBook.gallery.length,
              altText,
              url: storageUrl(storageId),
            },
          ],
        };
      });
    mockActions({ attachGallery });
    const { state, view } = renderAdminBook();
    vi.mocked(uploadBfgFile).mockResolvedValue("storage-gallery-1" as never);
    fireEvent.change(document.querySelector(".product-media-upload-grid input")!, { target: { value: "Inside page" } });
    const file = imageFile("gallery.png");
    fireEvent.change(screen.getByLabelText("Pilih file gambar galeri"), { target: { files: [file] } });
    const save = screen.getByRole("button", { name: "Simpan gambar" });
    fireEvent.click(save);

    await waitFor(() => expect(screen.getByText("Gambar galeri tersimpan.")).toBeTruthy());
    view.rerender(<AdminBookDetail bookId="book-1" />);
    expect(uploadBfgFile).toHaveBeenCalledWith(file, "book-gallery", expect.any(Function), { aud: "convex" });
    expect(attachGallery).toHaveBeenCalledWith({
      bookId: "book-1",
      storageId: "storage-gallery-1",
      fileName: "gallery.png",
      mimeType: "image/png",
      altText: "Inside page",
    });
    expect(state.currentBook.gallery).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Inside page" }).getAttribute("src")).toBe(storageUrl("storage-gallery-1"));
    expect(save.getAttribute("data-loading")).toBeNull();
  });

  it("keeps gallery upload recoverable after attachment failure", async () => {
    const attachGallery = vi.fn().mockRejectedValueOnce(new Error("attachment failure"));
    mockActions({ attachGallery });
    renderAdminBook();
    vi.mocked(uploadBfgFile).mockResolvedValue("storage-gallery" as never);
    const input = screen.getByLabelText("Pilih file gambar galeri");
    const save = screen.getByRole("button", { name: "Simpan gambar" });
    fireEvent.change(input, { target: { files: [imageFile("gallery-first.png")] } });
    fireEvent.click(save);

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Unggah gambar galeri belum tersimpan. Coba lagi."),
    );
    expect(save.getAttribute("data-loading")).toBeNull();
    expect(screen.getByText("gallery-first.png")).toBeTruthy();

    fireEvent.change(input, { target: { files: [imageFile("gallery-retry.png")] } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect((save as HTMLButtonElement).disabled).toBe(false);
  });

  it("preserves the current gallery rate-limit message and releases the upload action", async () => {
    mockActions();
    renderAdminBook();
    vi.mocked(uploadBfgFile).mockRejectedValueOnce(new BfgUploadError("UPLOAD_RATE_LIMITED", 17));
    const input = screen.getByLabelText("Pilih file gambar galeri");
    const save = screen.getByRole("button", { name: "Simpan gambar" });
    fireEvent.change(input, { target: { files: [imageFile("gallery.png")] } });
    fireEvent.click(save);

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Unggah gambar galeri sementara dibatasi. Coba lagi dalam 17 detik.",
      ),
    );
    expect(save.getAttribute("data-loading")).toBeNull();
  });

  it.each([1, 5, 10, 30])("leaves the gallery action usable after %i sequential local uploads", async (count) => {
    const attachGallery = vi.fn().mockResolvedValue("storage-gallery");
    mockActions({ attachGallery });
    renderAdminBook();
    vi.mocked(uploadBfgFile).mockImplementation(async (file) => `storage-${file.name}` as never);
    const input = screen.getByLabelText("Pilih file gambar galeri");

    for (let index = 0; index < count; index += 1) {
      const file = imageFile(`gallery-${index}.png`);
      fireEvent.change(input, { target: { files: [file] } });
      const save = screen.getByRole("button", { name: "Simpan gambar" });
      fireEvent.click(save);
      await waitFor(() => expect(screen.getByText("Gambar galeri tersimpan.")).toBeTruthy());
      expect(save.getAttribute("data-loading")).toBeNull();
      expect((input as HTMLInputElement).disabled).toBe(false);
    }

    expect(uploadBfgFile).toHaveBeenCalledTimes(count);
    expect(attachGallery).toHaveBeenCalledTimes(count);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("confirms removal and reflects the refreshed gallery list", async () => {
    const first = galleryImage(0, "First page");
    const second = galleryImage(1, "Second page");
    const removeGallery = vi.fn().mockImplementation(async ({ mediaId }: { mediaId: string }) => {
      state.currentBook = {
        ...state.currentBook,
        gallery: state.currentBook.gallery.filter((image) => image.mediaId !== mediaId),
      };
    });
    mockActions({ removeGallery });
    const { state, view } = renderAdminBook({ ...baseBook, gallery: [first, second] });
    const rows = document.querySelectorAll<HTMLElement>(".product-media-row");
    fireEvent.click(within(rows[1]!).getByRole("button", { name: "Hapus gambar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hapus gambar" }));

    await waitFor(() => expect(removeGallery).toHaveBeenCalledWith({ mediaId: second.mediaId }));
    view.rerender(<AdminBookDetail bookId="book-1" />);
    await waitFor(() => expect(screen.queryByText("Second page")).toBeNull());
    expect(screen.getByText("Gambar galeri dihapus.")).toBeTruthy();
    expect(state.currentBook.gallery).toHaveLength(1);
  });

  it("persists gallery reorder and renders the refreshed order", async () => {
    const first = galleryImage(0, "First page");
    const second = galleryImage(1, "Second page");
    const moveGallery = vi.fn().mockImplementation(async ({ mediaId }: { mediaId: string }) => {
      const gallery = [...state.currentBook.gallery];
      const index = gallery.findIndex((image) => image.mediaId === mediaId);
      [gallery[index - 1], gallery[index]] = [gallery[index], gallery[index - 1]];
      state.currentBook = {
        ...state.currentBook,
        gallery: gallery.map((image, displayOrder) => ({ ...image, displayOrder })),
      };
    });
    mockActions({ moveGallery });
    const { state, view } = renderAdminBook({ ...baseBook, gallery: [first, second] });
    fireEvent.click(screen.getByRole("button", { name: "Naikkan gambar 2" }));

    await waitFor(() => expect(moveGallery).toHaveBeenCalledWith({ mediaId: second.mediaId, direction: "up" }));
    view.rerender(<AdminBookDetail bookId="book-1" />);
    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll<HTMLElement>(".product-media-row")).map(
          (row) => row.querySelector("small")?.textContent,
        ),
      ).toEqual(["Second page", "First page"]),
    );
    expect(state.currentBook.gallery[0]?.displayOrder).toBe(0);
    expect(screen.getByRole("img", { name: "Second page" }).getAttribute("src")).toBe(storageUrl("gallery-2"));
  });

  it("disables gallery selection and save at the current eight-image limit", () => {
    mockActions();
    renderAdminBook({ ...baseBook, gallery: Array.from({ length: 8 }, (_, index) => galleryImage(index)) });

    expect(screen.getByText("8/8")).toBeTruthy();
    expect((screen.getByLabelText("Pilih file gambar galeri") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Simpan gambar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("guards external preview with HTTPS before saving and preserves the current success copy", async () => {
    const updateExternalPreview = vi.fn().mockResolvedValue(undefined);
    mockActions({ updateExternalPreview });
    renderAdminBook();
    fireEvent.change(screen.getByLabelText("Label tautan"), { target: { value: "Preview Amazon" } });
    const url = screen.getByLabelText("URL HTTPS");
    fireEvent.change(url, { target: { value: "http://example.com/book" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan pratinjau" }));

    expect(screen.getByRole("alert").textContent).toBe("Pratinjau eksternal harus menggunakan HTTPS.");
    expect(updateExternalPreview).not.toHaveBeenCalled();

    fireEvent.change(url, { target: { value: "https://example.com/book" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan pratinjau" }));
    await waitFor(() => expect(screen.getByText("Pratinjau eksternal tersimpan.")).toBeTruthy());
    expect(updateExternalPreview).toHaveBeenCalledWith({
      bookId: "book-1",
      label: "Preview Amazon",
      url: "https://example.com/book",
    });
  });
});

describe("shared ProductGallery behavior", () => {
  const images = [
    { mediaId: "one", url: storageUrl("one"), altText: "First page", displayOrder: 0 },
    { mediaId: "two", url: storageUrl("two"), altText: "Second page", displayOrder: 1 },
    { mediaId: "three", url: storageUrl("three"), altText: "Third page", displayOrder: 2 },
  ];

  it("renders empty state without a modal", () => {
    render(<ProductGallery title="Media Book" images={[]} />);

    expect(screen.getByText("Belum ada gambar tambahan.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the first image selected, supports next/previous and thumbnails, and clamps after shrink", () => {
    const { rerender } = render(<ProductGallery title="Media Book" images={images} />);
    const stage = () => screen.getByRole("img", { name: /page/ });

    expect(stage().getAttribute("src")).toBe(storageUrl("one"));
    expect((screen.getByRole("button", { name: "Gambar galeri sebelumnya" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Gambar galeri berikutnya" }));
    expect(stage().getAttribute("src")).toBe(storageUrl("two"));
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan gambar 3" }));
    expect(stage().getAttribute("src")).toBe(storageUrl("three"));
    expect((screen.getByRole("button", { name: "Gambar galeri berikutnya" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<ProductGallery title="Media Book" images={images.slice(0, 1)} />);
    expect(stage().getAttribute("src")).toBe(storageUrl("one"));
    expect(screen.queryByRole("button", { name: "Gambar galeri berikutnya" })).toBeNull();
  });
});

describe("BFGFilePicker same-file behavior", () => {
  it("clears the native value before allowing the same file to be selected again", () => {
    const onFileChange = vi.fn();
    function ControlledPicker() {
      const [file, setFile] = useState<File | null>(null);
      return (
        <BFGFilePicker
          ariaLabel="Pilih file"
          changeLabel="Ganti file"
          file={file}
          onFileChange={(nextFile) => {
            onFileChange(nextFile);
            setFile(nextFile);
          }}
        />
      );
    }

    render(<ControlledPicker />);
    const input = screen.getByLabelText("Pilih file") as HTMLInputElement;
    const file = imageFile("same.png");
    fireEvent.change(input, { target: { files: [file] } });
    Object.defineProperty(input, "value", { configurable: true, value: "C:\\fakepath\\same.png", writable: true });

    fireEvent.click(screen.getByRole("button", { name: "Ganti file" }));
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileChange).toHaveBeenCalledTimes(2);
    expect(onFileChange).toHaveBeenLastCalledWith(file);
  });
});
