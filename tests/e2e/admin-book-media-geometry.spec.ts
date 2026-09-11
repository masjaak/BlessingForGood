import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const viewports = [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const image = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><rect width="100%" height="100%" fill="#1c563f"/></svg>',
)}`;
const longAltText =
  "A long gallery alt text that must wrap without pushing the media actions outside the Book Detail content.";

const fixture = `
  <main class="media-qa">
    <section class="card admin-book-detail-card">
      <form class="form-card">
        <section class="cover-upload-field">
          <div class="cover-upload-preview">
            <div class="book-cover"><img class="book-cover-image" src="${image}" alt="Media Book cover preview" /></div>
          </div>
          <div class="cover-upload-controls">
            <div class="cover-upload-heading"><span class="card-kicker">COVER BUKU</span><h2>Unggah cover</h2></div>
            <div class="bfg-file-picker"><span class="field-label">File cover</span><div class="bfg-file-picker-control"><button class="button button-secondary" type="button">Pilih gambar</button><span>cover.png</span></div></div>
            <div class="cover-upload-actions"><button class="button button-primary" type="button">Simpan cover</button></div>
          </div>
        </section>
        <section class="admin-book-detail-section product-media-admin-section">
          <div class="split-heading"><div><span class="card-kicker">GALERI PRODUK</span><h2>Gambar tambahan</h2></div><span class="subtle">2/8</span></div>
          <section class="product-gallery" aria-label="Galeri produk Media Book">
            <div class="product-gallery-stage"><img src="${image}" alt="Gallery page" /></div>
            <div class="product-gallery-controls"><button class="button button-secondary button-icon" type="button">←</button><div class="product-gallery-thumbnails" role="list"><button class="button button-secondary product-gallery-thumbnail" type="button"><img src="${image}" alt="" /></button><button class="button button-secondary product-gallery-thumbnail" type="button"><img src="${image}" alt="" /></button></div><button class="button button-secondary button-icon" type="button">→</button></div>
          </section>
          <div class="product-media-list">
            <div class="product-media-row"><span><strong>Gambar 1</strong><small>${longAltText}</small></span><span class="form-actions"><button class="button button-tertiary" type="button">↑</button><button class="button button-tertiary" type="button">↓</button><button class="button button-danger" type="button">Hapus gambar</button></span></div>
          </div>
          <div class="form-grid product-media-upload-grid">
            <label class="field"><span class="field-label">Alt text gambar</span><input class="input" value="Media Book" /></label>
            <div class="bfg-file-picker"><span class="field-label">Pilih gambar</span><div class="bfg-file-picker-control"><button class="button button-secondary" type="button">Pilih gambar</button><span>gallery.png</span></div></div>
          </div>
          <div class="form-actions product-media-action-row"><button class="button button-secondary" type="button">Simpan gambar</button><span class="subtle">File siap diunggah.</span></div>
        </section>
        <section class="admin-book-detail-section">
          <div class="form-grid external-preview-field-grid"><span class="field-label external-preview-label-field">Label tautan</span><span class="field-label external-preview-url-field">URL HTTPS</span><input class="input external-preview-label-control" value="Preview" /><input class="input external-preview-url-control" value="https://example.com" /><div class="external-preview-support"><span class="field-hint">BFG tidak mengambil isi tautan.</span></div></div>
        </section>
      </form>
    </section>
  </main>`;

test.describe("@native-control Admin Book media geometry", () => {
  test("keeps current media controls contained across supported widths", async ({ page }, testInfo) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}</style>${fixture}`,
      );
      await page.evaluate(() => document.fonts?.ready);

      const metrics = await page.locator(".media-qa").evaluate((root) => {
        const rootBox = root.getBoundingClientRect();
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        };
        const contained = (element: Element) => {
          const box = element.getBoundingClientRect();
          return box.left >= rootBox.left - 1 && box.right <= rootBox.right + 1;
        };
        const rows = [...root.querySelectorAll<HTMLElement>(".product-media-row")];
        const rowCollisions = rows.filter((row) => {
          const text = row.firstElementChild?.getBoundingClientRect();
          const actions = row.lastElementChild?.getBoundingClientRect();
          return Boolean(
            text &&
            actions &&
            Math.min(text.right, actions.right) - Math.max(text.left, actions.left) > 1 &&
            Math.min(text.bottom, actions.bottom) - Math.max(text.top, actions.top) > 1,
          );
        }).length;
        const controls = [
          ...root.querySelectorAll<HTMLElement>(
            ".cover-upload-field, .product-gallery-stage, .product-gallery-controls, .product-media-row, .product-media-upload-grid, .product-media-action-row, .external-preview-field-grid",
          ),
        ];
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          rootWidth: rootBox.width,
          controlsContained: controls.every(contained),
          controlRects: controls.map(rect),
          rowCollisions,
        };
      });

      expect(metrics.documentWidth, `${viewport.width}px page overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(metrics.controlsContained, `${viewport.width}px media containment`).toBe(true);
      expect(metrics.rowCollisions, `${viewport.width}px media row collision`).toBe(0);
      expect(metrics.rootWidth).toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath(`admin-book-media-${viewport.width}.png`), fullPage: true });
    }
  });
});
