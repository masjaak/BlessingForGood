import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminBulkImport } from "@/components/admin-bulk-import";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
}));

vi.mock("@/domain/prototype/store", () => ({
  useProduct: () => ({ dataSource: "convex" }),
}));

describe("AdminBulkImport", () => {
  it("uses a custom accessible CSV trigger and exposes the upload constraints", () => {
    render(<AdminBulkImport />);

    expect(screen.getByText(/CSV saja/)).toBeTruthy();
    expect(screen.getByText(/maksimal 2 MiB/)).toBeTruthy();
    const input = screen.getByLabelText("Pilih file CSV") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Pilih file CSV" }));
    expect(click).toHaveBeenCalledOnce();
    expect(input.classList.contains("bulk-import-file-input")).toBe(true);
    expect(screen.queryByText("Choose File")).toBeNull();
    expect(screen.queryByText("No file chosen")).toBeNull();
  });
});
