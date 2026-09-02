import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

test.describe("@admin Catalog drag ordering", () => {
  test("keeps the drag handle and fallback controls usable across the responsive matrix", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the Catalog ordering matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}</style>
        <main class="admin-shell">
          <div class="admin-content">
            <section class="card frame-list">
              <div class="split-heading"><div><span class="card-kicker">Kurasi produk</span><h2>Buku dalam katalog</h2><p class="subtle catalog-ordering-hint">Geser pegangan di setiap buku untuk mengatur urutan. Tombol Naik dan Turun tetap tersedia sebagai fallback.</p></div></div>
              <div class="content-stack catalog-item-list">
                ${["Series One", "Series Two", "Series Three", "Series Four"]
                  .map(
                    (title, index) => `<div class="catalog-item-row" data-catalog-item-id="item-${index}">
                      <div class="catalog-item-copy"><strong>${title}</strong><small>PB · 978000000000${index + 1}</small></div>
                      <div class="catalog-item-actions">
                        <button class="button button-tertiary button-size-compact catalog-item-drag-handle" data-drag-handle="true" type="button" aria-label="Atur urutan ${title}"><span class="button-label"><svg viewBox="0 0 24 24"><path d="M8 5h.01M8 12h.01M8 19h.01M16 5h.01M16 12h.01M16 19h.01"></path></svg></span></button>
                        <span class="catalog-item-position">Urutan ${index + 1}</span>
                        <button class="button button-tertiary button-size-compact" type="button">Naik</button>
                        <button class="button button-tertiary button-size-compact" type="button">Turun</button>
                      </div>
                    </div>`,
                  )
                  .join("")}
              </div>
            </section>
          </div>
        </main>
      `);

      const geometry = await page.locator(".admin-shell").evaluate((root) => {
        const handles = [...root.querySelectorAll<HTMLElement>("[data-drag-handle]")];
        const rows = [...root.querySelectorAll<HTMLElement>(".catalog-item-row")];
        return {
          handleCount: handles.length,
          handleTouchAction: handles[0] ? getComputedStyle(handles[0]).touchAction : "",
          handleCursor: handles[0] ? getComputedStyle(handles[0]).cursor : "",
          rowIsDraggable: rows.some((row) => row.getAttribute("draggable") !== null),
          actionOverflow: rows.some((row) => row.scrollWidth > row.clientWidth),
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          viewportWidth: window.innerWidth,
        };
      });

      expect(geometry.handleCount).toBe(4);
      expect(geometry.handleTouchAction).toBe("none");
      expect(geometry.handleCursor).toBe("grab");
      expect(geometry.rowIsDraggable).toBe(false);
      expect(geometry.actionOverflow).toBe(false);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
      if (viewport.width === 390 || viewport.width === 1440) {
        await page.screenshot({ path: testInfo.outputPath(`catalog-ordering-${viewport.width}.png`) });
      }
    }
  });
});
