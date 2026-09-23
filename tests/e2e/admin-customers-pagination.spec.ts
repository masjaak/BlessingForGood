import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

test.describe("@admin Admin Pelanggan pagination layout", () => {
  test("keeps the directory controls visible and table scrolling internal", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1280") test.skip(true, "Run the Admin viewport matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}
          .admin-shell .admin-page { width: min(calc(100% - 40px), 1360px); margin: 0 auto; }
        </style>
        <div class="admin-shell">
          <div class="page admin-page">
            <header class="page-header"><span class="eyebrow">Operasional pelanggan</span><h1>Pelanggan aktif</h1></header>
            <div class="admin-workspace">
              <nav class="admin-nav"><a>Pelanggan</a></nav>
              <main class="admin-content">
                <div class="customer-directory-controls">
                  <label>Cari pelanggan<input class="input" type="search" value="Maria" /></label>
                  <div class="catalog-result-toolbar">
                    <p class="catalog-result-count">Menampilkan 1–25 dari 61 pelanggan</p>
                    <label class="catalog-page-size"><span>Tampilkan</span><select class="select"><option>25</option><option>50</option><option>100</option></select><span>per halaman</span></label>
                  </div>
                </div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>Email</th><th>Aksi</th></tr></thead><tbody>
                  ${Array.from({ length: 25 }, (_, index) => `<tr><td><strong>Maria Customer ${index + 1}</strong><br /><span class="subtle">BFG-${index + 1}</span></td><td>maria${index + 1}@example.com</td><td><a class="button button-tertiary">Lihat detail →</a></td></tr>`).join("")}
                </tbody></table></div>
                <nav class="catalog-page-navigation" aria-label="Navigasi halaman pelanggan"><button class="button button-secondary">← Sebelumnya</button><span>Halaman 1 dari 3</span><button class="button button-secondary">Berikutnya →</button></nav>
              </main>
            </div>
          </div>
        </div>
      `);

      const metrics = await page.evaluate(() => {
        const table = document.querySelector<HTMLElement>(".table-wrap");
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          tableWidth: table?.clientWidth ?? 0,
          tableScrollWidth: table?.scrollWidth ?? 0,
          rangeVisible: Boolean(document.querySelector(".catalog-result-count")),
          pageSizeVisible: Boolean(document.querySelector(".catalog-page-size .select")),
          paginationVisible: Boolean(document.querySelector(".catalog-page-navigation")),
        };
      });

      expect(metrics.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(metrics.tableWidth).toBeLessThanOrEqual(viewport.width);
      if (viewport.width <= 430) expect(metrics.tableScrollWidth).toBeGreaterThan(metrics.tableWidth);
      expect(metrics.rangeVisible).toBe(true);
      expect(metrics.pageSizeVisible).toBe(true);
      expect(metrics.paginationVisible).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`admin-customers-${viewport.width}.png`), fullPage: true });
    }
  });
});
