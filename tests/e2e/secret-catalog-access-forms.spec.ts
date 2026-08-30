import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

test.describe("@admin Secret Catalog form alignment", () => {
  test("keeps Catalog and Access fields aligned at mobile, tablet, and desktop widths", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the form alignment matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}</style>
        <div class="admin-shell">
          <main class="page">
            <section class="card form-card">
              <div class="form-grid form-grid-wide catalog-settings-grid">
                <label class="field"><span class="field-label">Nama</span><input class="input" /></label>
                <label class="field"><span class="field-label">Batas pemesanan</span><span class="field-hint">Customer dapat melakukan preorder sampai tanggal ini.</span><input class="input" type="date" /></label>
                <label class="field"><span class="field-label">Estimasi kedatangan</span><span class="field-hint">Bulan dan tahun perkiraan tiba untuk Customer.</span><input class="input" type="month" /></label>
              </div>
              <div class="catalog-access-code-section">
                <div class="catalog-access-code-form">
                  <label class="field"><span class="field-label">Berlaku sampai</span><input class="input" type="datetime-local" /></label>
                  <div class="action-group action-group-responsive">
                    <button class="button button-primary">Buat kode akses</button>
                    <button class="button button-danger">Cabut kode aktif</button>
                  </div>
                </div>
              </div>
              <form class="form-actions catalog-member-form">
                <label class="field"><span class="field-label">Pelanggan</span><button class="select bfg-select-trigger" type="button" role="combobox" aria-label="Pelanggan"><span class="bfg-select-value">Member</span><span class="bfg-select-trailing"><span class="bfg-select-chevron"></span></span></button></label>
                <label class="field"><span class="field-label">Berlaku sampai</span><input class="input" type="datetime-local" /></label>
                <button class="button button-primary">Berikan akses</button>
              </form>
            </section>
          </main>
        </div>
      `);

      const geometry = await page.locator(".admin-shell").evaluate((shell) => {
        const element = (selector: string) => {
          const found = shell.querySelector<HTMLElement>(selector);
          if (!found) throw new Error(`Missing ${selector}`);
          return found;
        };
        const fields = (selector: string) => [...shell.querySelectorAll<HTMLElement>(selector)];
        const bottom = (item: HTMLElement) => item.getBoundingClientRect().bottom;
        const settings = element(".catalog-settings-grid");
        const access = element(".catalog-access-code-form");
        const member = element(".catalog-member-form");
        const settingsFields = fields(".catalog-settings-grid > .field");
        const settingsControls = fields(".catalog-settings-grid > .field > .input");
        const accessField = element(".catalog-access-code-form > .field");
        const accessActions = element(".catalog-access-code-form > .action-group");
        const memberFields = fields(".catalog-member-form > .field");
        const memberButton = element(".catalog-member-form > .button");
        const memberControls = fields(
          ".catalog-member-form .input, .catalog-member-form .bfg-select-trigger, .catalog-member-form > .button",
        );
        const rectTop = (item: HTMLElement) => item.getBoundingClientRect().top;
        const rectHeight = (item: HTMLElement) => item.getBoundingClientRect().height;
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          settingsColumns: getComputedStyle(settings).gridTemplateColumns.split(" ").length,
          settingsLefts: new Set(settingsFields.map((field) => Math.round(field.getBoundingClientRect().left))).size,
          settingsControlTopDelta:
            Math.max(...settingsControls.map(rectTop)) - Math.min(...settingsControls.map(rectTop)),
          settingsControlBottomDelta:
            Math.max(...settingsControls.map((control) => control.getBoundingClientRect().bottom)) -
            Math.min(...settingsControls.map((control) => control.getBoundingClientRect().bottom)),
          accessColumns: getComputedStyle(access).gridTemplateColumns.split(" ").length,
          accessBottomDelta: Math.abs(bottom(accessField) - bottom(accessActions)),
          memberColumns: getComputedStyle(member).gridTemplateColumns.split(" ").length,
          memberBottomDelta:
            Math.max(...[...memberFields, memberButton].map(bottom)) -
            Math.min(...[...memberFields, memberButton].map(bottom)),
          memberControlHeightDelta:
            Math.max(...memberControls.map(rectHeight)) - Math.min(...memberControls.map(rectHeight)),
          memberFieldLefts: new Set(memberFields.map((field) => Math.round(field.getBoundingClientRect().left))).size,
        };
      });

      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
      if (viewport.width <= 640) {
        expect(geometry.settingsColumns).toBe(1);
        expect(geometry.settingsLefts).toBe(1);
        expect(geometry.accessColumns).toBe(1);
        expect(geometry.memberColumns).toBe(1);
        expect(geometry.memberFieldLefts).toBe(1);
      } else {
        expect(geometry.settingsColumns).toBe(3);
        expect(geometry.settingsLefts).toBe(3);
        expect(geometry.settingsControlTopDelta).toBeLessThanOrEqual(1);
        expect(geometry.settingsControlBottomDelta).toBeLessThanOrEqual(1);
        expect(geometry.accessColumns).toBe(2);
        expect(geometry.accessBottomDelta).toBeLessThanOrEqual(1);
        expect(geometry.memberColumns).toBe(3);
        expect(geometry.memberBottomDelta).toBeLessThanOrEqual(1);
        expect(geometry.memberControlHeightDelta).toBeLessThanOrEqual(1);
      }
      await page.screenshot({
        path: testInfo.outputPath(`catalog-access-forms-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });
});
