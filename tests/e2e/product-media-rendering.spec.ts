import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

function svgDataUri(width: number, height: number, color: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`,
  )}`;
}

test.describe("@customer product media presentation", () => {
  test("keeps covers contained and thumbnail widths proportional at supported widths", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-390") test.skip(true, "Run the product media matrix once.");

    const images = {
      portrait: svgDataUri(200, 300, "#1c563f"),
      square: svgDataUri(300, 300, "#d4a763"),
      landscape: svgDataUri(420, 240, "#e8b7a4"),
    };

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
            <div class="book-cover"><img class="book-cover-image" src="${images.portrait}" alt="Portrait cover" /></div>
            <div class="book-cover"><img class="book-cover-image" src="${images.square}" alt="Square cover" /></div>
            <div class="book-cover"><img class="book-cover-image is-positioned" style="--cover-zoom:1.35;--cover-x:18%;--cover-y:-12%" src="${images.landscape}" alt="Legacy-positioned cover" /></div>
          </div>
          <section class="product-gallery" aria-label="Galeri produk fixture">
            <div class="product-gallery-controls">
              <button class="button button-secondary button-icon" type="button">←</button>
              <div class="product-gallery-thumbnails" role="list">
                <button class="button button-secondary product-gallery-thumbnail" type="button"><span class="button-label"><img src="${images.portrait}" alt="" /></span></button>
                <button class="button button-secondary product-gallery-thumbnail" type="button"><span class="button-label"><img src="${images.square}" alt="" /></span></button>
                <button class="button button-secondary product-gallery-thumbnail" type="button"><span class="button-label"><img src="${images.landscape}" alt="" /></span></button>
              </div>
              <button class="button button-secondary button-icon" type="button">→</button>
            </div>
          </section>
        </main>
      `);

      await expect(page.locator(".media-qa .book-cover img")).toHaveCount(3);
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
          frameWidths: covers.map((cover) => cover.getBoundingClientRect().width),
          frameHeights: covers.map((cover) => cover.getBoundingClientRect().height),
          coverImages: coverImages.map((image) => ({
            objectFit: getComputedStyle(image).objectFit,
            transform: getComputedStyle(image).transform,
          })),
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

      expect(Math.max(...metrics.frameWidths) - Math.min(...metrics.frameWidths)).toBeLessThanOrEqual(1);
      expect(
        metrics.frameHeights.every((height, index) => Math.abs(height / metrics.frameWidths[index] - 1.5) < 0.02),
      ).toBe(true);
      expect(metrics.coverImages.every((image) => image.objectFit === "contain" && image.transform === "none")).toBe(
        true,
      );
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
