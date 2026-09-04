import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const formats = ["BB", "HB", "PB", "Boxset PB", "Boxset HB", "Slipcase PB", "Slipcase HB", "Cards", "Pack"];

function catalogFilterMarkup(state: "closed" | "format" | "publisher", viewport = { height: 900 }) {
  const triggerBottom = state === "publisher" ? 271 : 185;
  const panelTop = triggerBottom + 6;
  const panelMaxHeight = Math.min(320, Math.max(80, viewport.height - triggerBottom - 18));
  const formatMenu =
    state === "format"
      ? `<div class="bfg-select-menu bfg-multi-select-menu" role="dialog" aria-label="Format" style="top:${panelTop}px;left:12px;width:calc(100vw - 24px);max-height:${panelMaxHeight}px">
          <button class="bfg-multi-select-reset is-selected" type="button" aria-pressed="true">Semua Format</button>
          ${formats.map((format) => `<label class="bfg-multi-select-option"><input type="checkbox" /><span>${format}</span></label>`).join("")}
        </div>`
      : "";
  const publisherMenu =
    state === "publisher"
      ? `<div class="bfg-select-menu bfg-multi-select-menu" role="dialog" aria-label="Publisher" style="top:${panelTop}px;left:12px;width:calc(100vw - 24px);max-height:${panelMaxHeight}px">
          <button class="bfg-multi-select-reset is-selected" type="button" aria-pressed="true">Semua Publisher</button>
          ${Array.from({ length: 40 }, (_, index) => `<label class="bfg-multi-select-option"><input type="checkbox" /><span>Publisher ${String(index + 1).padStart(2, "0")} with a long canonical name</span></label>`).join("")}
        </div>`
      : "";

  return `<style>${globalsCss}
    .customer-shell .page { width: min(calc(100% - 32px), 1180px); margin: 0 auto; }
  </style>
  <div class="customer-shell">
    <main class="page">
      <section class="catalog-discovery" aria-label="Cari buku di katalog">
        <div class="catalog-discovery-controls customer-catalog-discovery-controls">
          <label class="field"><span class="field-label">Cari buku</span><input class="input" type="search" aria-label="Cari judul atau ISBN" value="Harry Potter"></label>
          <div class="catalog-filter-row">
            <label class="field"><span class="field-label">Format</span><button class="select bfg-select-trigger bfg-multi-select-trigger" type="button" aria-label="Format" aria-expanded="${state === "format"}"><span class="bfg-select-value">Semua Format</span><span class="bfg-select-trailing"><span class="bfg-select-chevron"></span></span></button></label>
            <label class="field"><span class="field-label">Publisher</span><button class="select bfg-select-trigger bfg-multi-select-trigger" type="button" aria-label="Publisher" aria-expanded="${state === "publisher"}"><span class="bfg-select-value">Semua Publisher</span><span class="bfg-select-trailing"><span class="bfg-select-chevron"></span></span></button></label>
          </div>
        </div>
        <p class="catalog-result-count">123 buku tersedia</p>
      </section>
    </main>
  </div>
  ${formatMenu}${publisherMenu}`;
}

test.describe("@customer Secret Catalog multi-filter geometry", () => {
  test("keeps collapsed filters compact and open panels inside every supported viewport", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "customer-1440") test.skip(true, "Run the Catalog filter matrix once.");

    const viewports = [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.setContent(catalogFilterMarkup("closed", viewport));
      const closed = await page.locator(".customer-shell").evaluate((shell) => {
        const fields = [...shell.querySelectorAll<HTMLElement>(".catalog-filter-row > .field")];
        const rects = fields.map((field) => field.getBoundingClientRect());
        return {
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          oldFormatGrid: shell.querySelectorAll(".catalog-format-options").length,
          optionCount: shell.querySelectorAll(".bfg-multi-select-option").length,
          formatRight: rects[0]?.right || 0,
          publisherRight: rects[1]?.right || 0,
          fieldTopDelta: Math.abs((rects[0]?.top || 0) - (rects[1]?.top || 0)),
        };
      });
      expect(closed.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(closed.oldFormatGrid).toBe(0);
      expect(closed.optionCount).toBe(0);
      expect(closed.formatRight).toBeLessThanOrEqual(viewport.width + 1);
      expect(closed.publisherRight).toBeLessThanOrEqual(viewport.width + 1);
      if (viewport.width <= 430) expect(closed.fieldTopDelta).toBeGreaterThan(8);
      if (viewport.width >= 768) expect(closed.fieldTopDelta).toBeLessThanOrEqual(1);

      for (const state of ["format", "publisher"] as const) {
        await page.setContent(catalogFilterMarkup(state, viewport));
        const open = await page.locator(`[role="dialog"]`).evaluate((menu) => {
          const rect = menu.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            scrollHeight: menu.scrollHeight,
            clientHeight: menu.clientHeight,
            checkboxCount: menu.querySelectorAll("input[type='checkbox']").length,
          };
        });
        expect(open.left).toBeGreaterThanOrEqual(0);
        expect(open.right).toBeLessThanOrEqual(open.viewportWidth + 1);
        expect(open.bottom).toBeLessThanOrEqual(open.viewportHeight + 1);
        expect(open.scrollHeight).toBeGreaterThan(open.clientHeight);
        expect(open.checkboxCount).toBe(state === "format" ? 9 : 40);
        expect(
          await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)),
        ).toBeLessThanOrEqual(viewport.width + 1);
        if (viewport.width === 390) {
          await page.screenshot({
            path: testInfo.outputPath(`customer-catalog-multi-filter-${state}-open.png`),
            fullPage: true,
          });
        }
      }

      if ([320, 390, 430, 1440].includes(viewport.width)) {
        await page.setContent(catalogFilterMarkup("closed", viewport));
        await page.screenshot({
          path: testInfo.outputPath(`customer-catalog-multi-filter-${viewport.width}.png`),
          fullPage: true,
        });
      }
    }
  });
});
