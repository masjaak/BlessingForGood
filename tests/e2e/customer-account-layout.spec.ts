import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

test.describe("@customer account layout polish", () => {
  test("keeps summary hierarchy and Batch detail spacing readable", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-1440") test.skip(true, "Run the account layout matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}</style>
        <div class="customer-shell">
          <main class="page my-books-page">
            <header class="page-header"><div><span class="eyebrow">Buku Saya</span><h1>Buku yang sudah kamu fix</h1><p class="lede">Ringkasan pesanan.</p></div></header>
            <section class="card my-books-date-range-card"><div class="my-books-date-range-heading"><span class="card-kicker">Rentang waktu</span><span class="subtle my-books-date-range-display">1 Sep 2030 – 30 Sep 2030</span></div><div class="form-grid"><label class="field"><span class="field-label">Dari</span><input class="input" type="date" value="2030-09-01" /></label><label class="field"><span class="field-label">Sampai</span><input class="input" type="date" value="2030-09-30" /></label></div></section>
            <div class="account-metrics my-books-summary-grid">
              <section class="card frame-summary my-books-summary-card"><span class="card-kicker my-books-summary-label">TOTAL SPENDING</span><strong class="metric-money my-books-summary-value">Rp 325.000</strong><span class="subtle my-books-summary-help">Total tagihan buku yang sudah di-fix</span></section>
              <section class="card frame-summary my-books-summary-card"><span class="card-kicker my-books-summary-label">PENDING PAYMENT</span><strong class="metric-money my-books-summary-value">Rp 125.000</strong><span class="subtle my-books-summary-help">Sisa tagihan keseluruhan dari invoice terbit</span></section>
              <section class="card frame-summary my-books-summary-card"><span class="card-kicker my-books-summary-label">DEPOSIT</span><strong class="metric-money my-books-summary-value">Rp 200.000</strong><span class="subtle my-books-summary-help">Top up credit</span></section>
            </div>
          </main>
          <main class="page customer-batch-detail-page">
            <header class="page-header"><div><span class="eyebrow">BFG-BAT-001</span><h1>September Series</h1></div></header>
            <section class="card customer-batch-detail-roster-card"><span class="card-kicker">Buku milikmu</span><h2>Roster pelanggan</h2><div class="customer-batch-detail-search"><label class="field"><span class="field-label">Cari buku</span><input class="input" type="search" /></label></div><div class="customer-batch-detail-book-list"><div class="book-row customer-batch-book-row"><div class="book-cover"><div class="book-cover-fallback"><strong>Series One</strong></div></div><div class="content-stack customer-batch-book-copy"><strong>Series One</strong><span class="subtle customer-batch-book-meta">BFG Press · PB · ISBN 9780000000001</span><span class="customer-batch-book-price">1 × Rp 125.000</span></div><span class="customer-batch-book-status"><span class="status-badge status-positive">PO Ditutup</span></span></div><div class="book-row customer-batch-book-row"><div class="book-cover"><div class="book-cover-fallback"><strong>Series Two</strong></div></div><div class="content-stack customer-batch-book-copy"><strong>Series Two</strong><span class="subtle customer-batch-book-meta">BFG Press · PB · ISBN 9780000000002</span><span class="customer-batch-book-price">2 × Rp 150.000</span></div><span class="customer-batch-book-status"><span class="status-badge status-positive">PO Ditutup</span></span></div></div></section>
          </main>
        </div>
      `);

      const metrics = await page.locator(".my-books-summary-card").evaluateAll((cards) =>
        cards.map((card) => {
          const parts = [...card.children].map((child) => child.getBoundingClientRect());
          return {
            labelAboveValue: parts[0].bottom <= parts[1].top,
            valueAboveHelp: parts[1].bottom <= parts[2].top,
          };
        }),
      );
      expect(metrics).toEqual([
        { labelAboveValue: true, valueAboveHelp: true },
        { labelAboveValue: true, valueAboveHelp: true },
        { labelAboveValue: true, valueAboveHelp: true },
      ]);

      const accountGeometry = await page.locator(".my-books-page").evaluate((root) => {
        const range = root.querySelector<HTMLElement>(".my-books-date-range-card")?.getBoundingClientRect();
        const summary = root.querySelector<HTMLElement>(".my-books-summary-grid")?.getBoundingClientRect();
        return (summary?.top || 0) - (range?.bottom || 0);
      });
      expect(accountGeometry).toBeGreaterThanOrEqual(16);

      const geometry = await page.locator(".customer-batch-detail-page").evaluate((root) => {
        const search = root.querySelector<HTMLElement>(".customer-batch-detail-search")?.getBoundingClientRect();
        const rows = [...root.querySelectorAll<HTMLElement>(".customer-batch-book-row")];
        const copies = rows.map((row) =>
          row.querySelector<HTMLElement>(".customer-batch-book-copy")?.getBoundingClientRect(),
        );
        return {
          searchToFirstRow: (rows[0]?.getBoundingClientRect().top || 0) - (search?.bottom || 0),
          copyGap: (copies[1]?.top || 0) - (copies[0]?.bottom || 0),
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        };
      });
      expect(geometry.searchToFirstRow).toBeGreaterThanOrEqual(16);
      expect(geometry.copyGap).toBeGreaterThanOrEqual(16);
      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    }
  });
});
