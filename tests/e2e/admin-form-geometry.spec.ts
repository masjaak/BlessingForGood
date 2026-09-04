import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const viewportMatrix = [
  { width: 768, height: 1024, label: "768" },
  { width: 834, height: 1112, label: "834" },
  { width: 1024, height: 768, label: "1024" },
  { width: 1180, height: 820, label: "1180" },
  { width: 1280, height: 800, label: "1280" },
  { width: 1366, height: 768, label: "1366" },
  { width: 1440, height: 900, label: "1440" },
  { width: 430, height: 932, label: "430" },
];

const fixture = `
  <div class="admin-shell">
    <main>
      <div class="admin-form-geometry-page">
        <section class="card" data-geometry-card="batch">
          <form class="form-card admin-batch-create-form" data-geometry-form="batch">
            <div class="form-grid" data-geometry-grid>
              <label class="field"><span class="field-label">Nama</span><input class="input" value="September" /></label>
              <label class="field"><span class="field-label">Kode referensi</span><input class="input" value="BFG-BAT-001" /></label>
              <label class="field"><span class="field-label">Deadline PO</span><span class="field-hint">Batas finalisasi roster sebelum PO dikunci.</span><input class="input" type="date" value="2026-09-01" /></label>
              <label class="field"><span class="field-label">ETA Cargo</span><span class="field-hint">Estimasi tiba dalam format bulan dan tahun.</span><input class="input" type="month" value="2026-10" /></label>
            </div>
            <label class="field" data-geometry-description><span class="field-label">Deskripsi</span><textarea class="textarea">September cycle</textarea></label>
            <div class="form-actions" data-geometry-actions><button class="button button-primary" type="button"><span class="button-label">Buat batch</span></button></div>
          </form>
        </section>
        <section class="card frame-form form-card" data-geometry-card="catalog-create">
          <form class="form-card admin-catalog-create-form" data-geometry-form="catalog-create">
            <div class="form-grid" data-geometry-grid>
              <label class="field"><span class="field-label">Nama katalog</span><span class="field-hint">Nama singkat untuk membedakan katalog.</span><input class="input" value="Bacaan musim gugur" /></label>
              <label class="field"><span class="field-label">Batas pemesanan</span><span class="field-hint">Customer dapat melakukan preorder sampai tanggal ini.</span><input class="input" type="date" value="2026-09-30" /></label>
            </div>
            <label class="field" data-geometry-description><span class="field-label">Deskripsi</span><span class="field-hint">Opsional</span><textarea class="textarea">Katalog September</textarea></label>
            <button class="button button-primary" type="button"><span class="button-label">Buat draf katalog</span></button>
          </form>
        </section>
        <section class="card frame-form" data-geometry-card="catalog-detail">
          <form class="form-card admin-catalog-detail-form" data-geometry-form="catalog-detail">
            <div class="form-grid form-grid-wide catalog-settings-grid" data-geometry-grid>
              <label class="field"><span class="field-label">Nama</span><input class="input" value="September" /></label>
              <label class="field"><span class="field-label">Batas pemesanan</span><span class="field-hint">Customer dapat melakukan preorder sampai tanggal ini.</span><input class="input" type="date" value="2026-09-30" /></label>
              <label class="field"><span class="field-label">Estimasi kedatangan</span><span class="field-hint">Bulan dan tahun perkiraan tiba untuk Customer.</span><input class="input" type="month" value="2026-10" /></label>
            </div>
            <label class="field" data-geometry-description><span class="field-label">Deskripsi</span><textarea class="textarea">Katalog September</textarea></label>
            <div class="form-actions" data-geometry-actions>
              <button class="button button-primary" type="button"><span class="button-label">Simpan</span></button>
              <button class="button button-secondary" type="button"><span class="button-label">Buka kembali</span></button>
              <button class="button button-danger" type="button"><span class="button-label">Arsipkan katalog</span></button>
            </div>
          </form>
        </section>
      </div>
    </main>
  </div>`;

test.describe("@admin target form geometry", () => {
  test("keeps Batch and Catalog fields separated across the responsive matrix", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the Admin form geometry matrix once.");

    for (const viewport of viewportMatrix) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}</style>${fixture}`,
      );

      const geometry = await page.locator(".admin-form-geometry-page").evaluate((pageRoot) => {
        const rect = (element: Element) => {
          const box = (element as HTMLElement).getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
        };
        const contentRect = (element: HTMLElement) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            left: box.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft),
            right: box.right - Number.parseFloat(style.borderRightWidth) - Number.parseFloat(style.paddingRight),
          };
        };
        const forms = [...pageRoot.querySelectorAll<HTMLElement>("[data-geometry-form]")];
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          forms: forms.map((form) => {
            const grid = form.querySelector<HTMLElement>("[data-geometry-grid]");
            const description = form.querySelector<HTMLElement>("[data-geometry-description]");
            const actions = form.querySelector<HTMLElement>("[data-geometry-actions], .button");
            const card = form.closest<HTMLElement>("[data-geometry-card]");
            if (!grid || !description || !actions || !card) throw new Error("Incomplete geometry fixture");
            const gridFields = [...grid.querySelectorAll<HTMLElement>(".field")];
            const firstRowTop = Math.min(...gridFields.map((field) => field.getBoundingClientRect().top));
            const firstRow = gridFields
              .filter((field) => Math.abs(field.getBoundingClientRect().top - firstRowTop) < 1)
              .sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left);
            const controls = [...form.querySelectorAll<HTMLElement>(".input, .textarea")];
            const actionButtons = actions.matches(".button")
              ? [actions]
              : [...actions.querySelectorAll<HTMLElement>(".button")];
            const cardContent = contentRect(card);
            return {
              name: form.dataset.geometryForm,
              columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
              horizontalGap:
                firstRow.length > 1
                  ? firstRow[1].getBoundingClientRect().left - firstRow[0].getBoundingClientRect().right
                  : null,
              descriptionGap: description.getBoundingClientRect().top - grid.getBoundingClientRect().bottom,
              actionGap: actions.getBoundingClientRect().top - description.getBoundingClientRect().bottom,
              descriptionWidth: description.getBoundingClientRect().width,
              contentWidth: cardContent.right - cardContent.left,
              cardContent,
              controls: controls.map(rect),
              actionButtons: actionButtons.map(rect),
            };
          }),
        };
      });

      expect(geometry.documentWidth, `${viewport.label}px page overflow`).toBeLessThanOrEqual(viewport.width + 1);
      for (const form of geometry.forms) {
        expect(
          Math.abs(form.descriptionWidth - form.contentWidth),
          `${viewport.label}px ${form.name} description width`,
        ).toBeLessThanOrEqual(1);
        for (const control of form.controls) {
          expect(control.left, `${viewport.label}px ${form.name} control left`).toBeGreaterThanOrEqual(
            form.cardContent.left - 1,
          );
          expect(control.right, `${viewport.label}px ${form.name} control right`).toBeLessThanOrEqual(
            form.cardContent.right + 1,
          );
        }
        for (const button of form.actionButtons) {
          expect(button.left, `${viewport.label}px ${form.name} action left`).toBeGreaterThanOrEqual(
            form.cardContent.left - 1,
          );
          expect(button.right, `${viewport.label}px ${form.name} action right`).toBeLessThanOrEqual(
            form.cardContent.right + 1,
          );
        }
        for (let index = 1; index < form.actionButtons.length; index += 1) {
          const previous = form.actionButtons[index - 1];
          const current = form.actionButtons[index];
          if (Math.abs(current.top - previous.top) < 1) {
            expect(current.left, `${viewport.label}px ${form.name} action overlap`).toBeGreaterThanOrEqual(
              previous.right - 1,
            );
          } else {
            expect(current.top, `${viewport.label}px ${form.name} action row overlap`).toBeGreaterThanOrEqual(
              previous.bottom - 1,
            );
          }
        }
        expect(form.descriptionGap, `${viewport.label}px ${form.name} metadata/description gap`).toBeGreaterThanOrEqual(
          24,
        );
        expect(form.actionGap, `${viewport.label}px ${form.name} description/action gap`).toBeGreaterThanOrEqual(24);
        if (viewport.width > 800) {
          expect(form.horizontalGap, `${viewport.label}px ${form.name} column gap`).toBeGreaterThanOrEqual(24);
        }
      }

      const expectedColumns = viewport.width > 640 ? [2, 2, 3] : [1, 1, 1];
      expect(
        geometry.forms.map((form) => form.columns),
        `${viewport.label}px grid columns`,
      ).toEqual(expectedColumns);
      await page.screenshot({ path: testInfo.outputPath(`admin-form-geometry-${viewport.label}.png`), fullPage: true });
    }
  });
});
