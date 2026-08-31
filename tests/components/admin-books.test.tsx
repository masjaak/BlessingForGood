import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "convex/react";
import { AdminBooks } from "@/components/admin-books";
import { useProduct } from "@/domain/prototype/store";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav aria-label="Admin navigation" />,
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: vi.fn(),
}));

const draftBook = {
  _id: "book-1",
  title: "Unused Draft Book",
  slug: "unused-draft-book",
  author: "Test Author",
  categories: [],
  publisherName: "Test Publisher",
  publicationStatus: "draft",
  variants: [],
  stockQuantity: 0,
  isListed: false,
};

function mockList(book = draftBook, getBooks: () => (typeof draftBook)[] = () => [book]) {
  vi.mocked(useProduct).mockReturnValue({ dataSource: "convex" } as never);
  vi.mocked(useQuery).mockImplementation(((reference: unknown, args: unknown) => {
    if (args && typeof args === "object" && "paginationOpts" in args) return { page: [] };
    if (args && typeof args === "object" && "search" in args) return getBooks();
    return [];
  }) as never);
}

describe("Admin Books list actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  it("keeps Edit and Hapus visible in the same action cell", () => {
    mockList();
    vi.mocked(useMutation).mockReturnValue(vi.fn() as never);

    render(<AdminBooks />);

    const row = screen.getByRole("row", { name: /Unused Draft Book/ });
    const actions = row.querySelector(".admin-book-row-actions");
    const edit = within(row).getByRole("link", { name: "Edit" });
    const deleteButton = within(row).getByRole("button", { name: "Hapus" });

    expect(screen.getByRole("columnheader", { name: "Aksi" })).toBeTruthy();
    expect(actions?.contains(edit)).toBe(true);
    expect(actions?.contains(deleteButton)).toBe(true);
    expect(deleteButton.className).toContain("button-danger");
  });

  it("uses the canonical delete mutation after the list confirmation", async () => {
    mockList();
    const removeBook = vi.fn().mockResolvedValue({ removed: true });
    vi.mocked(useMutation).mockReturnValue(removeBook as never);

    render(<AdminBooks />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));
    expect(screen.getByRole("heading", { name: "Hapus buku secara permanen?" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hapus buku" }));

    await waitFor(() => expect(removeBook).toHaveBeenCalledWith({ bookId: "book-1" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("removes the deleted row without a browser reload", async () => {
    let listedBooks: (typeof draftBook)[] = [draftBook];
    mockList(draftBook, () => listedBooks);
    let refresh = () => {};
    const removeBook = vi.fn().mockImplementation(async () => {
      listedBooks = [];
      refresh();
    });
    vi.mocked(useMutation).mockReturnValue(removeBook as never);

    const view = render(<AdminBooks />);
    refresh = () => view.rerender(<AdminBooks />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus buku" }));

    await waitFor(() => expect(screen.queryByRole("row", { name: /Unused Draft Book/ })).toBeNull());
  });

  it("keeps a failed hard delete safe", async () => {
    mockList({ ...draftBook, publicationStatus: "published" });
    const removeBook = vi.fn().mockRejectedValue({ data: { code: "ENTITY_IN_USE" } });
    vi.mocked(useMutation).mockReturnValue(removeBook as never);

    render(<AdminBooks />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus buku" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByRole("heading", { name: "Buku tidak dapat dihapus" })).toBeNull();
    expect(screen.queryByText("ENTITY_IN_USE")).toBeNull();
  });
});
