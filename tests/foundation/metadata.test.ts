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
    expect(layout).toContain('const SITE_TITLE = "Blessing For Good — Imported Bookstore & Community"');
    expect(layout).toContain(
      '"Blessing For Good adalah community-led imported bookstore untuk menemukan Ready Stock, preorder, dan curated titles pilihan."',
    );
    expect(layout).toContain('canonical: "/"');
    expect(layout).toContain('type: "website"');
    expect(layout).toContain('siteName: "Blessing For Good"');
    expect(layout).toContain('url: "/opengraphimageBFG.png"');
    expect(layout).toContain('card: "summary_large_image"');
    expect(layout).toContain('images: [{ url: "/opengraphimageBFG.png", alt: SOCIAL_IMAGE_ALT }]');
    expect(pngDimensions(image)).toEqual({ width: 1672, height: 941 });
  });

  it("keeps the search-facing brand entity singular", () => {
    for (const file of [
      "src/app/layout.tsx",
      "src/app/accept-invitation/page.tsx",
      "src/app/account/layout.tsx",
      "src/app/admin/layout.tsx",
      "src/app/catalog/layout.tsx",
      "src/app/community/layout.tsx",
      "src/app/help/layout.tsx",
      "src/app/how-to-order/layout.tsx",
      "src/app/join/layout.tsx",
      "src/app/ready-stock/[slug]/page.tsx",
      "src/app/ready-stock/page.tsx",
      "src/app/sign-in/[[...sign-in]]/page.tsx",
      "src/app/sign-up/[[...sign-up]]/page.tsx",
      "src/lib/seo.ts",
    ]) {
      expect(readFileSync(file, "utf8"), file).not.toContain("Blessing For Goods");
    }
  });
});
