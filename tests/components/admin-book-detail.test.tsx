import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
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
});
