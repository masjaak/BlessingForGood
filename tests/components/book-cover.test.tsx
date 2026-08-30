import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookCover } from "@/components/book-cover";

describe("BookCover", () => {
  it("renders a neutral typographic fallback without an image source", () => {
    render(<BookCover title="A Quiet Book" publisher="BFG Press" format="PB" />);

    expect(screen.getByRole("img", { name: "Cover placeholder for A Quiet Book" })).toBeTruthy();
    expect(screen.getByText("A Quiet Book")).toBeTruthy();
    expect(screen.getByText("BFG Press")).toBeTruthy();
    expect(screen.getByText("PB")).toBeTruthy();
  });

  it("falls back when a local cover image fails to load", () => {
    render(<BookCover title="A Quiet Book" publisher="BFG Press" src="/brand/logos/Logo-2.png" />);

    fireEvent.error(screen.getByRole("img", { name: "A Quiet Book cover" }));

    expect(screen.getByRole("img", { name: "Cover placeholder for A Quiet Book" })).toBeTruthy();
  });

  it("does not load external image URLs", () => {
    render(<BookCover title="A Quiet Book" publisher="BFG Press" src="https://example.com/cover.png" />);

    expect(screen.getByRole("img", { name: "Cover placeholder for A Quiet Book" })).toBeTruthy();
  });

  it("renders a trusted Convex storage cover", () => {
    render(
      <BookCover
        title="A Quiet Book"
        publisher="BFG Press"
        src="https://example.convex.cloud/api/storage/example-id"
      />,
    );

    expect(screen.getByRole("img", { name: "A Quiet Book cover" }).getAttribute("src")).toContain("convex.cloud");
  });

  it("renders the selected local preview without allowing arbitrary remote URLs", () => {
    render(<BookCover title="A Quiet Book" publisher="BFG Press" src="blob:http://localhost/preview" />);

    expect(screen.getByRole("img", { name: "A Quiet Book cover" }).getAttribute("src")).toContain("blob:");
  });

  it("keeps the cover image free of manual framing styles", () => {
    render(
      <BookCover
        publisher="BFG Press"
        src="https://example.convex.cloud/api/storage/example-id"
        title="A Quiet Book"
      />,
    );

    const image = screen.getByRole("img", { name: "A Quiet Book cover" });
    expect(image.className).not.toContain("is-positioned");
    expect(image.getAttribute("src")).toContain("example-id");
    expect(image.getAttribute("style")).toBeNull();
  });
});
