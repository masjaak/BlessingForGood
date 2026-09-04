import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const viewportMatrix = [
  { width: 320, height: 568, label: "320" },
  { width: 360, height: 800, label: "360" },
  { width: 375, height: 667, label: "375" },
  { width: 390, height: 844, label: "390" },
  { width: 393, height: 852, label: "393" },
  { width: 412, height: 915, label: "412" },
  { width: 430, height: 932, label: "430" },
  { width: 768, height: 1024, label: "768" },
  { width: 1024, height: 768, label: "1024" },
  { width: 1280, height: 800, label: "1280" },
  { width: 1440, height: 900, label: "1440" },
];

const fixture = `
  <div class="site-shell customer-shell customer-shell-signed-in">
    <main>
      <div class="page mobile-form-geometry-page">
        <section class="card my-books-date-range-card" data-geometry-card="date">
          <div class="my-books-date-range-heading"><span class="card-kicker">RENTANG WAKTU</span><span class="subtle">4 Sep 2025 – 4 Sep 2026</span></div>
          <div class="form-grid my-books-date-range-fields">
            <label class="field" data-geometry-field><span class="field-label">Dari</span><input class="input" data-geometry-control type="date" value="2025-09-04" /></label>
            <label class="field" data-geometry-field><span class="field-label">Sampai</span><input class="input" data-geometry-control type="date" value="2026-09-04" /></label>
          </div>
        </section>
        <section class="card form-card mobile-control-card" data-geometry-card="controls">
          <label class="field" data-geometry-field><span class="field-label">Nama pencarian</span><input class="input" data-geometry-control value="A very long realistic Customer value that must remain inside its Card" /></label>
          <label class="field" data-geometry-field><span class="field-label">Jumlah</span><input class="input" data-geometry-control type="number" value="12345678901234567890" /></label>
          <label class="field" data-geometry-field><span class="field-label">Cari buku</span><input class="input" data-geometry-control type="search" value="A long search value for the shared mobile control" /></label>
          <label class="field" data-geometry-field><span class="field-label">Catatan</span><textarea class="textarea" data-geometry-control>A long realistic textarea value that should wrap inside the Card and never widen its parent.</textarea></label>
          <label class="field" data-geometry-field><span class="field-label">Pilihan</span><select class="select" data-geometry-control><option>Long readable option value</option></select></label>
          <label class="field" data-geometry-field><span class="field-label">Pelanggan</span><button class="select bfg-select-trigger" data-geometry-control type="button" role="combobox" aria-label="Pelanggan"><span class="bfg-select-value">A long selected Customer identity value</span><span class="bfg-select-trailing"><span class="bfg-select-chevron"></span></span></button></label>
          <div class="field" data-geometry-field><span class="field-label">Bukti</span><div class="bfg-file-picker-control" data-geometry-control><button class="button button-secondary" type="button"><span class="button-label">Pilih file</span></button><span class="bfg-file-picker-name">A-very-long-realistic-upload-filename-that-must-not-widen-the-control.pdf</span></div></div>
          <div class="form-actions" data-geometry-control><button class="button button-primary" type="button"><span class="button-label">Simpan perubahan dengan label panjang</span></button><button class="button button-secondary" type="button"><span class="button-label">Batalkan</span></button></div>
        </section>
        <section class="card form-card mobile-grid-card" data-geometry-card="grid">
          <div class="form-grid">
            <label class="field" data-geometry-field><span class="field-label">Field A</span><input class="input" data-geometry-control type="date" value="2025-09-04" /></label>
            <label class="field" data-geometry-field><span class="field-label">Field B</span><input class="input" data-geometry-control value="Long grid value that must shrink safely" /></label>
          </div>
          <button class="button button-primary mobile-geometry-tail-control" type="button">Akhiri formulir</button>
        </section>
      </div>
    </main>
    <nav class="customer-bottom-nav" aria-label="Navigasi pelanggan"><a href="#">Beranda</a><a href="#">Katalog</a><a href="#">Buku Saya</a><a href="#">Tagihan</a><a href="#">Akun</a></nav>
  </div>`;

test.describe("@customer mobile shared form geometry", () => {
  test("keeps every shared form control inside its Card across the viewport matrix", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-1440") test.skip(true, "Run the mobile form geometry matrix once.");

    for (const viewport of viewportMatrix) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}</style>${fixture}`,
      );

      const geometry = await page.locator(".mobile-form-geometry-page").evaluate((pageRoot) => {
        const rect = (element: Element) => {
          const box = (element as HTMLElement).getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
            width: box.width,
            height: box.height,
          };
        };
        const contentRect = (card: HTMLElement) => {
          const box = card.getBoundingClientRect();
          const style = getComputedStyle(card);
          return {
            left: box.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft),
            right: box.right - Number.parseFloat(style.borderRightWidth) - Number.parseFloat(style.paddingRight),
          };
        };
        const cards = [...pageRoot.querySelectorAll<HTMLElement>("[data-geometry-card]")];
        const controls = [...pageRoot.querySelectorAll<HTMLElement>("[data-geometry-control]")];
        const fields = [...pageRoot.querySelectorAll<HTMLElement>("[data-geometry-field]")];
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          cards: cards.map((card) => ({
            name: card.dataset.geometryCard,
            rect: rect(card),
            content: contentRect(card),
          })),
          controls: controls.map((control) => ({
            className: control.className,
            rect: rect(control),
            card: contentRect(control.closest<HTMLElement>("[data-geometry-card]")!),
          })),
          fields: fields.map((field) => ({
            rect: rect(field),
            card: contentRect(field.closest<HTMLElement>("[data-geometry-card]")!),
          })),
          dateStyles: [...pageRoot.querySelectorAll<HTMLInputElement>("input[type='date']")].map((input) => {
            const style = getComputedStyle(input);
            return { boxSizing: style.boxSizing, minWidth: style.minWidth, maxWidth: style.maxWidth };
          }),
          buttonLabels: [...pageRoot.querySelectorAll<HTMLElement>(".mobile-control-card .button")].map((button) => {
            const label = button.querySelector<HTMLElement>(".button-label");
            if (!label) throw new Error("Shared button label anatomy is incomplete");
            const buttonRect = button.getBoundingClientRect();
            const labelRect = label.getBoundingClientRect();
            return {
              button: { left: buttonRect.left, right: buttonRect.right },
              label: { left: labelRect.left, right: labelRect.right },
              clientWidth: button.clientWidth,
              scrollWidth: button.scrollWidth,
            };
          }),
          gridColumns: getComputedStyle(pageRoot.querySelector<HTMLElement>(".mobile-grid-card .form-grid")!)
            .gridTemplateColumns,
        };
      });

      expect(geometry.documentWidth, `${viewport.label}px page overflow`).toBeLessThanOrEqual(viewport.width + 1);
      for (const item of [...geometry.controls, ...geometry.fields]) {
        expect(item.rect.left, `${viewport.label}px left inset`).toBeGreaterThanOrEqual(item.card.left - 1);
        expect(item.rect.right, `${viewport.label}px control/card containment`).toBeLessThanOrEqual(
          item.card.right + 1,
        );
      }
      for (const style of geometry.dateStyles) {
        expect(style.boxSizing, `${viewport.label}px date box sizing`).toBe("border-box");
        expect(style.minWidth, `${viewport.label}px date shrinkability`).toBe("0px");
        expect(style.maxWidth, `${viewport.label}px date max width`).toBe("100%");
      }
      for (const button of geometry.buttonLabels) {
        expect(button.label.left, `${viewport.label}px button label left`).toBeGreaterThanOrEqual(
          button.button.left - 1,
        );
        expect(button.label.right, `${viewport.label}px button label right`).toBeLessThanOrEqual(
          button.button.right + 1,
        );
        expect(button.scrollWidth, `${viewport.label}px button content overflow`).toBeLessThanOrEqual(
          button.clientWidth,
        );
      }
      if (viewport.width <= 800) expect(geometry.gridColumns.split(" ")).toHaveLength(1);
      if (viewport.width >= 1024) expect(geometry.gridColumns.split(" ")).toHaveLength(2);

      if (viewport.width <= 800) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const clearance = await page.locator(".mobile-geometry-tail-control").evaluate((tail) => {
          const nav = document.querySelector<HTMLElement>(".customer-bottom-nav");
          if (!nav) throw new Error("Missing Customer bottom navigation");
          return nav.getBoundingClientRect().top - tail.getBoundingClientRect().bottom;
        });
        expect(clearance, `${viewport.label}px final control/nav clearance`).toBeGreaterThanOrEqual(70);
      }

      if ([320, 390, 430, 1440].includes(viewport.width)) {
        await page.screenshot({
          path: testInfo.outputPath(`mobile-form-geometry-${viewport.label}.png`),
          fullPage: true,
        });
      }
    }
  });
});
