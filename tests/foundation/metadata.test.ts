import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const image = readFileSync("public/opengraphimageBFG.png");

function pngDimensions(buffer: Buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") throw new Error("Expected a PNG asset");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("homepage social metadata contract", () => {
  it("uses the approved BFG image and canonical social metadata", () => {
    expect(layout).toContain('metadataBase: new URL("https://www.blessingforgood.com")');
    expect(layout).toContain('const SITE_TITLE = "Blessing For Goods — Imported Bookstore & Community"');
    expect(layout).toContain(
      '"Blessing For Goods adalah community-led imported bookstore untuk menemukan Ready Stock, preorder, dan curated titles pilihan."',
    );
    expect(layout).toContain('canonical: "/"');
    expect(layout).toContain('type: "website"');
    expect(layout).toContain('siteName: "Blessing For Goods"');
    expect(layout).toContain('url: "/opengraphimageBFG.png"');
    expect(layout).toContain('card: "summary_large_image"');
    expect(layout).toContain('images: [{ url: "/opengraphimageBFG.png", alt: SOCIAL_IMAGE_ALT }]');
    expect(pngDimensions(image)).toEqual({ width: 1672, height: 941 });
  });
});
