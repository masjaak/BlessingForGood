import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

function svgDataUri(width: number, height: number, color: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`,
  )}`;
}

test.describe("@customer product media presentation", () => {
  test("keeps covers at their intrinsic ratios and thumbnail widths proportional at supported widths", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "customer-390") test.skip(true, "Run the product media matrix once.");

    const images = {
      standardPortrait: svgDataUri(200, 300, "#1c563f"),
      widerPortrait: svgDataUri(684, 937, "#356c52"),
      tallPortrait: svgDataUri(600, 1000, "#5f8f78"),
      square: svgDataUri(800, 800, "#d4a763"),
      landscape: svgDataUri(1200, 700, "#e8b7a4"),
    };
    const coverFixtures = [
      ["standard portrait", images.standardPortrait],
      ["wider portrait", images.widerPortrait],
      ["tall portrait", images.tallPortrait],
      ["square", images.square],
      ["landscape", images.landscape],
    ] as const;

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}
          .media-qa { width: min(calc(100% - 32px), 920px); margin: 0 auto; }
          .media-qa-covers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        </style>
        <main class="media-qa">
          <div class="media-qa-covers">
            ${coverFixtures
              .map(
                ([label, src]) =>
                  `<div class="book-cover"><img class="book-cover-image" src="${src}" alt="${label} cover" /></div>`,
              )
              .join("")}
          </div>
          <section class="product-gallery" aria-label="Galeri produk fixture">
            <div class="product-gallery-controls">
              <button class="button button-secondary button-icon" type="button">←</button>
              <div class="product-gallery-thumbnails" role="list">
                <button class="button button-secondary product-gallery-thumbnail" type="button"><span class="button-label"><img src="${images.standardPortrait}" alt="" /></span></button>
                <button class="button button-secondary product-gallery-thumbnail" type="button"><span class="button-label"><img src="${images.square}" alt="" /></span></button>
                <button class="button button-secondary product-gallery-thumbnail" type="button"><span class="button-label"><img src="${images.landscape}" alt="" /></span></button>
              </div>
              <button class="button button-secondary button-icon" type="button">→</button>
            </div>
          </section>
        </main>
      `);

      await expect(page.locator(".media-qa .book-cover img")).toHaveCount(coverFixtures.length);
      await expect
        .poll(() =>
          page.locator(".media-qa img").evaluateAll((items) =>
            items.every((item) => {
              const image = item as HTMLImageElement;
              return image.complete && image.naturalWidth > 0;
            }),
          ),
        )
        .toBe(true);

      const metrics = await page.locator(".media-qa").evaluate((root) => {
        const covers = [...root.querySelectorAll<HTMLElement>(".book-cover")];
        const coverImages = [...root.querySelectorAll<HTMLImageElement>(".book-cover > img")];
        const thumbnails = [...root.querySelectorAll<HTMLElement>(".product-gallery-thumbnail")];
        return {
          coverGeometry: covers.map((cover, index) => {
            const image = coverImages[index];
            const frame = cover.getBoundingClientRect();
            const artwork = image.getBoundingClientRect();
            const style = getComputedStyle(cover);
            const borderLeft = Number.parseFloat(style.borderLeftWidth);
            const borderTop = Number.parseFloat(style.borderTopWidth);
            const borderRight = Number.parseFloat(style.borderRightWidth);
            const borderBottom = Number.parseFloat(style.borderBottomWidth);
            return {
              intrinsicRatio: image.naturalWidth / image.naturalHeight,
              frameRatio: frame.width / frame.height,
              imageRatio: artwork.width / artwork.height,
              topGap: artwork.top - (frame.top + borderTop),
              rightGap: frame.right - borderRight - artwork.right,
              bottomGap: frame.bottom - borderBottom - artwork.bottom,
              leftGap: artwork.left - (frame.left + borderLeft),
              objectFit: getComputedStyle(image).objectFit,
              transform: getComputedStyle(image).transform,
            };
          }),
          thumbnailWidths: thumbnails.map((thumbnail) => thumbnail.getBoundingClientRect().width),
          thumbnailImageWidths: thumbnails.map(
            (thumbnail) => thumbnail.querySelector("img")?.getBoundingClientRect().width || 0,
          ),
          thumbnailImageHeights: thumbnails.map(
            (thumbnail) => thumbnail.querySelector("img")?.getBoundingClientRect().height || 0,
          ),
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        };
      });

      expect(
        metrics.coverGeometry.every(
          (cover) =>
            Math.abs(cover.frameRatio - cover.intrinsicRatio) < 0.03 &&
            Math.abs(cover.imageRatio - cover.intrinsicRatio) < 0.01 &&
            cover.topGap <= 1 &&
            cover.rightGap <= 1 &&
            cover.bottomGap <= 1 &&
            cover.leftGap <= 1 &&
            cover.objectFit === "contain" &&
            cover.transform === "none",
        ),
      ).toBe(true);
      expect(metrics.thumbnailImageHeights.every((height) => Math.abs(height - 52) <= 1)).toBe(true);
      expect(metrics.thumbnailImageWidths[0]).toBeLessThan(metrics.thumbnailImageWidths[1]);
      expect(metrics.thumbnailImageWidths[1]).toBeLessThan(metrics.thumbnailImageWidths[2]);
      expect(metrics.thumbnailWidths[0] - metrics.thumbnailImageWidths[0]).toBeLessThanOrEqual(10);
      expect(metrics.thumbnailWidths[1] - metrics.thumbnailImageWidths[1]).toBeLessThanOrEqual(10);
      expect(metrics.thumbnailWidths[2] - metrics.thumbnailImageWidths[2]).toBeLessThanOrEqual(10);
      expect(metrics.documentWidth).toBeLessThanOrEqual(viewport.width + 1);

      await page.screenshot({ path: testInfo.outputPath(`product-media-${viewport.width}.png`), fullPage: true });
    }
  });
});
