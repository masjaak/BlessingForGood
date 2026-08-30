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
                <label class="field"><span class="field-label">Batas pemesanan</span><input class="input" type="date" /></label>
                <label class="field"><span class="field-label">Estimasi kedatangan</span><input class="input" type="month" /></label>
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
                <label class="field"><span class="field-label">Pelanggan</span><select class="select"><option>Member</option></select></label>
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
        const accessField = element(".catalog-access-code-form > .field");
        const accessActions = element(".catalog-access-code-form > .action-group");
        const memberFields = fields(".catalog-member-form > .field");
        const memberButton = element(".catalog-member-form > .button");
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          settingsColumns: getComputedStyle(settings).gridTemplateColumns.split(" ").length,
          settingsLefts: new Set(settingsFields.map((field) => Math.round(field.getBoundingClientRect().left))).size,
          accessColumns: getComputedStyle(access).gridTemplateColumns.split(" ").length,
          accessBottomDelta: Math.abs(bottom(accessField) - bottom(accessActions)),
          memberColumns: getComputedStyle(member).gridTemplateColumns.split(" ").length,
          memberBottomDelta:
            Math.max(...[...memberFields, memberButton].map(bottom)) -
            Math.min(...[...memberFields, memberButton].map(bottom)),
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
        expect(geometry.accessColumns).toBe(2);
        expect(geometry.accessBottomDelta).toBeLessThanOrEqual(1);
        expect(geometry.memberColumns).toBe(3);
        expect(geometry.memberBottomDelta).toBeLessThanOrEqual(1);
      }
      await page.screenshot({
        path: testInfo.outputPath(`catalog-access-forms-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });
});
