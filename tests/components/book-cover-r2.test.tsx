import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookCover } from "@/components/book-cover";

const original = "https://clean-eel-522.convex.cloud/api/storage/original";
const r2Custom = "https://media.blessingforgood.com/new-cover-key";

function image() {
  return screen.getByRole("img", { name: "Sample cover" }) as HTMLImageElement;
}

describe("BookCover production media URLs", () => {
  it("renders the verified Cloudflare R2 custom domain instead of a placeholder", () => {
    render(<BookCover title="Sample" publisher="BFG" src={r2Custom} />);
    expect(image().getAttribute("src")).toBe(r2Custom);
  });

  it("still supports existing Convex and legacy R2 public cover links", () => {
    const { rerender } = render(<BookCover title="Sample" publisher="BFG" src={original} />);
    expect(image().getAttribute("src")).toBe(original);
    const oldR2 = "https://pub-726660f62a4443c99263aff51b169a30.r2.dev/old-cover";
    rerender(<BookCover title="Sample" publisher="BFG" src={oldR2} />);
    expect(image().getAttribute("src")).toBe(oldR2);
  });

  it("recovers on a changed cover URL after a previously failed image", () => {
    const { rerender } = render(<BookCover title="Sample" publisher="BFG" src={original} />);
    fireEvent.error(image());
    expect(screen.getByRole("img", { name: "Cover placeholder for Sample" })).toBeTruthy();
    rerender(<BookCover title="Sample" publisher="BFG" src={r2Custom} />);
    expect(image().getAttribute("src")).toBe(r2Custom);
  });

  it("does not trust arbitrary external, spoofed, or protocol-relative sources", () => {
    const { rerender } = render(<BookCover title="Sample" publisher="BFG" src="https://media.blessingforgood.com.evil.example/x" />);
    expect(screen.getByRole("img", { name: "Cover placeholder for Sample" })).toBeTruthy();
    for (const src of ["//evil.example/img", "http://media.blessingforgood.com/img", "https://evil.example/img"]) {
      rerender(<BookCover title="Sample" publisher="BFG" src={src} />);
      expect(screen.getByRole("img", { name: "Cover placeholder for Sample" })).toBeTruthy();
    }
  });
});
