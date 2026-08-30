import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminPagination } from "@/components/admin-pagination";

describe("Admin pagination", () => {
  it("uses bounded page sizes and moves through cursor pages", () => {
    const next = vi.fn();
    const previous = vi.fn();
    const setPageSize = vi.fn();
    render(
      <AdminPagination
        pageNumber={2}
        pageSize={25}
        canGoPrevious
        rowCount={25}
        isDone={false}
        continueCursor="cursor-2"
        next={next}
        previous={previous}
        setPageSize={setPageSize}
      />,
    );

    expect(screen.getByText("Menampilkan 26–50")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sebelumnya" }));
    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(previous).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith("cursor-2");

    fireEvent.click(screen.getByRole("combobox", { name: "Jumlah per halaman" }));
    expect(screen.getByRole("option", { name: "10" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "25" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "50" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "100" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "100" }));
    expect(setPageSize).toHaveBeenCalledWith(100);
  });
});
