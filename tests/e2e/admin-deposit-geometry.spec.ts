import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const viewportMatrix = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 402, height: 874 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 834, height: 1112 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const fixture = `
  <main class="admin-shell">
    <section class="card deposit-topup-card">
      <span class="card-kicker">Antrian top-up</span>
      <h2>Bukti menunggu verifikasi</h2>
      <div class="summary-line deposit-topup-row" data-state="submitted">
        <span class="deposit-topup-summary"><strong>Customer with a deliberately long operational email label</strong><br /><span class="money">Rp255.000</span> · BANK-255000</span>
        <span class="form-actions deposit-topup-actions">
          <a class="button button-secondary" href="#">Lihat bukti</a>
          <span class="status-badge">submitted</span>
          <button class="button button-primary" type="button">Tinjau</button>
        </span>
      </div>
      <div class="summary-line deposit-topup-row" data-state="under_review">
        <span class="deposit-topup-summary"><strong>Customer B</strong><br /><span class="money">Rp100.000</span> · BANK-100000</span>
        <span class="form-actions deposit-topup-actions">
          <a class="button button-secondary" href="#">Lihat bukti</a>
          <span class="status-badge">under_review</span>
          <button class="button button-primary" type="button">Setujui</button>
          <button class="button button-danger" type="button">Tolak</button>
        </span>
      </div>
      <div class="summary-line deposit-topup-row" data-state="approved">
        <span class="deposit-topup-summary"><strong>Customer A</strong><br /><span class="money">Rp50.000</span> · tanpa referensi</span>
        <span class="form-actions deposit-topup-actions">
          <a class="button button-secondary" href="#">Lihat bukti</a>
          <span class="status-badge">approved</span>
        </span>
      </div>
    </section>
  </main>`;

test.describe("@admin Deposit action geometry", () => {
  test("keeps finance actions equal, contained, and readable", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the Deposit geometry matrix once.");

    for (const viewport of viewportMatrix) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}</style>${fixture}`,
      );

      const geometry = await page.locator(".deposit-topup-card").evaluate((card) => {
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
        };
        const rows = [...card.querySelectorAll<HTMLElement>(".deposit-topup-row")];
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          rows: rows.map((row) => {
            const summary = row.querySelector<HTMLElement>(".deposit-topup-summary");
            const rail = row.querySelector<HTMLElement>(".deposit-topup-actions");
            if (!summary || !rail) throw new Error("Incomplete Deposit geometry fixture");
            const controls = [...rail.querySelectorAll<HTMLElement>(":scope > .button, :scope > a.button")].map(box);
            return { state: row.dataset.state, row: box(row), summary: box(summary), rail: box(rail), controls };
          }),
        };
      });

      expect(geometry.documentWidth, `${viewport.width}px page overflow`).toBeLessThanOrEqual(viewport.width + 1);
      const actionWidths = geometry.rows.flatMap((row) => row.controls.map((control) => control.width));
      const railWidths = geometry.rows.map((row) => row.rail.width);
      for (const width of actionWidths) {
        expect(Math.abs(width - actionWidths[0]), `${viewport.width}px action width`).toBeLessThanOrEqual(1);
      }
      for (const width of railWidths) {
        expect(Math.abs(width - railWidths[0]), `${viewport.width}px action rail width`).toBeLessThanOrEqual(1);
      }
      for (const row of geometry.rows) {
        expect(row.row.right, `${viewport.width}px row containment`).toBeLessThanOrEqual(viewport.width + 1);
        expect(row.rail.right, `${viewport.width}px rail containment`).toBeLessThanOrEqual(row.row.right + 1);
        for (const control of row.controls) {
          expect(control.right, `${viewport.width}px control containment`).toBeLessThanOrEqual(row.rail.right + 1);
        }
        if (viewport.width > 640) {
          expect(row.summary.right, `${viewport.width}px information/action collision`).toBeLessThanOrEqual(
            row.rail.left + 1,
          );
        } else {
          expect(row.rail.top, `${viewport.width}px stacked action rail`).toBeGreaterThanOrEqual(
            row.summary.bottom - 1,
          );
        }
      }
    }
  });
});
