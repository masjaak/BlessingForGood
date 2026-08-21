import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BFGFilePicker } from "@/components/bfg-file-picker";

describe("BFGFilePicker", () => {
  it("keeps the native input accessible behind one custom control", () => {
    const onFileChange = vi.fn();
    const { rerender } = render(
      <BFGFilePicker
        accept="image/jpeg,image/png,image/webp"
        ariaLabel="Pilih file gambar"
        buttonLabel="Pilih gambar"
        changeLabel="Ganti gambar"
        file={null}
        helper="JPG, PNG, atau WebP. Maksimal 5 MB."
        onFileChange={onFileChange}
        required
      />,
    );

    const input = screen.getByLabelText("Pilih file gambar") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Pilih gambar" }));

    expect(click).toHaveBeenCalledOnce();
    expect(input.className).toContain("bfg-file-picker-input");
    expect(input.required).toBe(true);
    expect(screen.queryByText("Choose File")).toBeNull();
    expect(screen.queryByText("No file chosen")).toBeNull();

    const file = new File(["image"], "gallery.webp", { type: "image/webp" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileChange).toHaveBeenCalledWith(file);
    rerender(
      <BFGFilePicker
        accept="image/jpeg,image/png,image/webp"
        ariaLabel="Pilih file gambar"
        buttonLabel="Pilih gambar"
        changeLabel="Ganti gambar"
        file={file}
        helper="JPG, PNG, atau WebP. Maksimal 5 MB."
        onFileChange={onFileChange}
      />,
    );
    expect(screen.getByText("gallery.webp")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ganti gambar" })).toBeTruthy();
  });

  it("keeps validation feedback in the custom field", () => {
    render(
      <BFGFilePicker
        ariaLabel="Pilih file"
        file={null}
        onFileChange={vi.fn()}
        validateFile={() => "Jenis file tidak didukung."}
      />,
    );

    fireEvent.change(screen.getByLabelText("Pilih file"), {
      target: { files: [new File(["bad"], "cover.gif", { type: "image/gif" })] },
    });

    expect(screen.getByRole("alert").textContent).toContain("Jenis file tidak didukung.");
  });
});
