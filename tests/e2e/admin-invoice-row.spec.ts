import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

test.describe("@admin Admin invoice row", () => {
  test("keeps row rhythm, framed actions, and status alignment across viewports", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the invoice row matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}
          .invoice-row-qa { width: min(calc(100vw - 32px), 1200px); margin: 0 auto; }
        </style>
        <main class="admin-shell">
          <section class="card frame-list invoice-row-qa">
            <div class="content-stack">
                        <div class="invoice-issue-row" data-testid="invoice-issue-row">
                          <label class="invoice-issue-select"><input type="checkbox" aria-label="Pilih Customer A · Thunder" /></label>
                          <div class="invoice-issue-main">
                            <strong>Customer A</strong>
                            <span class="subtle">BFG-A · Thunder · 2 buku · <span class="money">Rp 100.000</span></span>
                          </div>
                          <div class="invoice-issue-status"><span class="status-badge status-warning">Perlu ditinjau</span></div>
                          <div class="invoice-issue-action">
                            <button class="button button-primary" type="button"><span class="button-label">Terbitkan invoice</span></button>
                          </div>
                        </div>
                        <div class="invoice-issue-row" data-testid="invoice-issue-row">
                          <label class="invoice-issue-select"><input type="checkbox" aria-label="Pilih Customer B · September Cargo" /></label>
                          <div class="invoice-issue-main">
                            <strong>Customer B</strong>
                            <span class="subtle">BFG-B · September Cargo · 1 buku · <span class="money">Rp 50.000</span></span>
                          </div>
                          <div class="invoice-issue-status"><span class="status-badge status-positive">Sudah terbit</span></div>
                          <div class="invoice-issue-action">
                            <a class="button button-secondary" href="/admin/invoices/invoice-b"><span class="button-label">Buka invoice</span></a>
                          </div>
                        </div>
            </div>
          </section>
        </main>
      `);

      const geometry = await page.locator(".invoice-row-qa").evaluate((fixture) => {
        const rows = [...fixture.querySelectorAll<HTMLElement>("[data-testid='invoice-issue-row']")];
        const read = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            columnGap: style.columnGap,
            rowGap: style.rowGap,
          };
        };
        return {
          viewportWidth: window.innerWidth,
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          rows: rows.map((row) => {
            const main = row.querySelector<HTMLElement>(".invoice-issue-main");
            const status = row.querySelector<HTMLElement>(".invoice-issue-status");
            const action = row.querySelector<HTMLElement>(".invoice-issue-action");
            const button = row.querySelector<HTMLElement>(
              ".invoice-issue-action > .button, .invoice-issue-action > a.button",
            );
            if (!main || !status || !action || !button) throw new Error("Invoice row anatomy is incomplete");
            return {
              row: read(row),
              main: read(main),
              status: read(status),
              action: read(action),
              button: { ...read(button), borderStyle: getComputedStyle(button).borderStyle },
            };
          }),
        };
      });

      expect(geometry.documentWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(viewport.width + 1);
      for (const row of geometry.rows) {
        expect(row.row.scrollWidth, `${viewport.width}px row overflow`).toBeLessThanOrEqual(row.row.clientWidth);
        expect(row.button.height, `${viewport.width}px button height`).toBeGreaterThanOrEqual(44);
        expect(row.button.borderStyle, `${viewport.width}px button frame`).toBe("solid");
        expect(row.button.left, `${viewport.width}px button left`).toBeGreaterThanOrEqual(row.action.left - 1);
        expect(row.button.right, `${viewport.width}px button right`).toBeLessThanOrEqual(row.action.right + 1);
        expect(row.status.height, `${viewport.width}px status region`).toBeGreaterThanOrEqual(44);
        expect(row.action.height, `${viewport.width}px action region`).toBeGreaterThanOrEqual(44);
        if (viewport.width <= 900) {
          expect(row.main.bottom, `${viewport.width}px main/status separation`).toBeLessThanOrEqual(row.status.top);
          expect(row.status.bottom, `${viewport.width}px status/action separation`).toBeLessThanOrEqual(row.action.top);
          expect(row.row.columnGap, `${viewport.width}px column gap`).toBe("16px");
          expect(row.row.rowGap, `${viewport.width}px row gap`).toBe("12px");
        } else {
          expect(row.main.right, `${viewport.width}px main/status separation`).toBeLessThanOrEqual(row.status.left);
          expect(row.status.right, `${viewport.width}px status/action separation`).toBeLessThanOrEqual(row.action.left);
          expect(row.row.columnGap, `${viewport.width}px column gap`).toBe("16px");
          expect(row.row.rowGap, `${viewport.width}px row gap`).toBe("12px");
        }
      }

      const actions = await page
        .locator(".invoice-row-qa .invoice-issue-action > .button")
        .evaluateAll((buttons) =>
          buttons.map((button) => ({ text: button.textContent?.trim(), classes: [...button.classList] })),
        );
      expect(actions).toEqual([
        expect.objectContaining({ text: "Terbitkan invoice", classes: expect.arrayContaining(["button-primary"]) }),
        expect.objectContaining({ text: "Buka invoice", classes: expect.arrayContaining(["button-secondary"]) }),
      ]);

      if ([390, 1440].includes(viewport.width)) {
        await page.screenshot({ path: testInfo.outputPath(`admin-invoice-row-${viewport.width}.png`), fullPage: true });
      }
    }
  });
});
