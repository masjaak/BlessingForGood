import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoverUploadField, validateCoverFile } from "@/components/cover-upload-field";

describe("CoverUploadField", () => {
  it("keeps the native picker functional without exposing its browser chrome", () => {
    const onFileChange = vi.fn();
    const onUpload = vi.fn();

    render(
      <CoverUploadField
        file={null}
        onFileChange={onFileChange}
        onUpload={onUpload}
        publisher="BFG"
        title="A Quiet Book"
      />,
    );

    const input = screen.getByLabelText("Pilih file cover") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Pilih gambar" }));

    expect(click).toHaveBeenCalledOnce();
    expect(input.classList.contains("cover-upload-file-input")).toBe(true);
    expect(screen.queryByText("Choose File")).toBeNull();
    expect(screen.queryByText("No file chosen")).toBeNull();
  });

  it("renders the selected file state and delegates upload", () => {
    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const onFileChange = vi.fn();
    const onUpload = vi.fn();

    const { rerender } = render(
      <CoverUploadField
        file={null}
        onFileChange={onFileChange}
        onUpload={onUpload}
        publisher="BFG"
        title="A Quiet Book"
      />,
    );

    fireEvent.change(screen.getByLabelText("Pilih file cover"), { target: { files: [file] } });
    expect(onFileChange).toHaveBeenCalledWith(file);

    rerender(
      <CoverUploadField
        file={file}
        onFileChange={onFileChange}
        onUpload={onUpload}
        publisher="BFG"
        title="A Quiet Book"
      />,
    );
    expect(screen.getByText("cover.png")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Simpan cover" }));
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it("rejects unsupported types and files over the server limit early", () => {
    expect(validateCoverFile(new File(["gif"], "cover.gif", { type: "image/gif" }))).toMatch(/JPG, PNG, atau WebP/);
    expect(validateCoverFile(new File(["jpg"], "IMG-20260819-WA0166.jpg", { type: "image/pjpeg" }))).toBeNull();
    expect(validateCoverFile(new File(["large"], "cover.png", { type: "image/png" }))).toBeNull();

    const oversized = new File(["cover"], "cover.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 5_000_001 });
    expect(validateCoverFile(oversized)).toMatch(/5 MB/);
  });

  it("lets Admin adjust and reset the customer-facing cover framing", () => {
    const onFileChange = vi.fn();
    const onUpload = vi.fn();

    render(
      <CoverUploadField
        currentSrc="https://clean-eel-522.convex.cloud/api/storage/cover"
        file={null}
        onFileChange={onFileChange}
        onUpload={onUpload}
        publisher="BFG"
        title="A Quiet Book"
      />,
    );

    const zoom = screen.getByLabelText("Zoom cover");
    const horizontal = screen.getByLabelText("Posisi horizontal cover");
    const vertical = screen.getByLabelText("Posisi vertikal cover");
    fireEvent.change(zoom, { target: { value: "1.4" } });
    fireEvent.change(horizontal, { target: { value: "18" } });
    fireEvent.change(vertical, { target: { value: "-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan tampilan" }));

    expect(onUpload).toHaveBeenCalledWith({ zoom: 1.4, x: 18, y: -12 });

    fireEvent.click(screen.getByRole("button", { name: "Reset tampilan" }));
    expect((zoom as HTMLInputElement).value).toBe("1");
    expect((horizontal as HTMLInputElement).value).toBe("0");
    expect((vertical as HTMLInputElement).value).toBe("0");
  });
});
