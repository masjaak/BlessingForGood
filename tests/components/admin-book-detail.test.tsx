import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { AdminBookDetail } from "@/components/admin-book-detail";
import { useProduct } from "@/domain/prototype/store";

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn()),
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(),
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

vi.mock("@/components/bfg-file-picker", () => ({
  BFGFilePicker: () => null,
}));

vi.mock("@/components/cover-upload-field", () => ({
  CoverUploadField: () => null,
  validateCoverFile: vi.fn(),
}));

vi.mock("@/components/product-gallery", () => ({
  ProductGallery: () => null,
}));

const draftBook = {
  _id: "book-1",
  publisherId: "publisher-1",
  title: "Unused Draft Book",
  slug: "unused-draft-book",
  author: null,
  description: null,
  categories: [],
  publicationStatus: "draft",
  isActive: true,
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
  coverImageUrl: null,
  coverPresentation: null,
  gallery: [],
  externalPreviewLabel: null,
  externalPreviewUrl: null,
  publisher: { name: "Test Publisher" },
  variants: [],
};

function mockBook(book = draftBook) {
  vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
  vi.mocked(useAuth).mockReturnValue({ getToken: vi.fn(), sessionClaims: {} } as never);
  vi.mocked(useQuery)
    .mockReturnValueOnce(book as never)
    .mockReturnValueOnce({ page: [] } as never);
}

describe("Admin Book Detail lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("renders Edit and the destructive draft action together in the page header", () => {
    mockBook();

    render(<AdminBookDetail bookId="book-1" />);

    const edit = screen.getByRole("link", { name: "Edit" });
    const deleteButton = screen.getByRole("button", { name: "Hapus buku" });
    const actionRegion = edit.closest(".page-header-actions");

    expect(actionRegion).toBeTruthy();
    expect(actionRegion?.contains(deleteButton)).toBe(true);
    expect(deleteButton.className).toContain("button-danger");
  });

  it("opens the shared confirmation dialog before deleting a draft", () => {
    mockBook();

    render(<AdminBookDetail bookId="book-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus buku" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hapus buku ini?" })).toBeTruthy();
    expect(screen.getByText(/belum memiliki pesanan atau riwayat operasional/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows an explicit archive fallback for a protected lifecycle state", () => {
    mockBook({ ...draftBook, publicationStatus: "published" });

    render(<AdminBookDetail bookId="book-1" />);

    expect(screen.getByRole("link", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Arsipkan buku" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hapus buku" })).toBeNull();
  });

  it("accepts decimal pounds and keeps the variant creation grid aligned", async () => {
    const mutation = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useMutation).mockReturnValue(mutation as never);
    mockBook({
      ...draftBook,
      variants: [
        {
          _id: "variant-1",
          format: "PB",
          isbn: "9780000000001",
          priceAmount: 150000,
          supplierPriceGbpMinor: 1999,
          stockQuantity: 0,
          isAvailable: true,
        },
      ],
    } as never);

    render(<AdminBookDetail bookId="book-1" />);

    const existingGbp = screen.getAllByRole("textbox", { name: /Harga GBP \(£\)/ })[0];
    expect(existingGbp.getAttribute("inputmode")).toBe("decimal");
    fireEvent.change(existingGbp, { target: { value: "19,99" } });
    fireEvent.submit(existingGbp.closest("form")!);

    await waitFor(() => {
      expect(mutation).toHaveBeenCalledWith(expect.objectContaining({ supplierPriceGbpMinor: 1999 }));
    });

    const styles = readFileSync("src/app/globals.css", "utf8");
    expect(styles).toContain(
      "grid-template-columns: 100px minmax(180px, 1fr) minmax(150px, 0.7fr) minmax(150px, 0.7fr) auto;",
    );
  });
});
