import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

test.describe("@admin Batch pagination responsive surface", () => {
  test("keeps bounded pagination controls readable at mobile, tablet, and desktop widths", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the pagination matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}
          .admin-shell .page { width: min(calc(100% - 48px), 1400px); margin: 0 auto; }
        </style>
        <div class="admin-shell">
          <main class="page">
            <section class="card">
              <div class="admin-pagination" aria-label="Paginasi">
                <span class="subtle">Menampilkan 1–25</span>
                <div class="admin-pagination-controls">
                  <button class="button button-secondary button-compact" type="button" disabled>Sebelumnya</button>
                  <button class="button button-secondary button-compact" type="button">Berikutnya</button>
                  <label class="admin-pagination-size">
                    <span class="subtle">Tampilkan</span>
                    <button class="select bfg-select-trigger" type="button" role="combobox" aria-label="Jumlah per halaman">
                      <span class="bfg-select-value">25</span><span class="bfg-select-trailing"><span class="bfg-select-chevron"></span></span>
                    </button>
                    <span class="subtle">per halaman</span>
                  </label>
                </div>
              </div>
            </section>
          </main>
        </div>
      `);

      const geometry = await page.locator(".admin-pagination").evaluate((pagination) => {
        const controls = [...pagination.querySelectorAll<HTMLElement>(".admin-pagination-controls > .button")];
        const select = pagination.querySelector<HTMLElement>(".admin-pagination-size .bfg-select-trigger");
        if (!select) throw new Error("Missing BFG page-size trigger");
        const rect = pagination.getBoundingClientRect();
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          left: rect.left,
          right: rect.right,
          display: getComputedStyle(pagination).flexDirection,
          controlsDisplay: getComputedStyle(pagination.querySelector<HTMLElement>(".admin-pagination-controls")!)
            .flexDirection,
          buttonWidths: controls.map((button) => button.getBoundingClientRect().width),
          selectWidth: select.getBoundingClientRect().width,
          selectTag: select.tagName,
        };
      });

      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.selectTag).toBe("BUTTON");
      if (viewport.width <= 640) {
        expect(geometry.display).toBe("column");
        expect(geometry.controlsDisplay).toBe("column");
        expect(geometry.buttonWidths[0]).toBeGreaterThanOrEqual(geometry.selectWidth - 1);
      } else {
        expect(geometry.display).toBe("row");
        expect(geometry.controlsDisplay).toBe("row");
      }
      if ([390, 1440].includes(viewport.width)) {
        await page.screenshot({ path: testInfo.outputPath(`batch-pagination-${viewport.width}.png`), fullPage: true });
      }
    }
  });
});
