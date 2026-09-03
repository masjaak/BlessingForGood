import { readFileSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const mobileViewports = [
  { width: 375, height: 667, label: "iPhone SE" },
  { width: 390, height: 844, label: "iPhone 12/13" },
  { width: 393, height: 852, label: "Android compact" },
  { width: 430, height: 932, label: "iPhone Pro Max" },
  { width: 667, height: 375, label: "mobile landscape" },
];

function customerBottomNav() {
  return `
    <nav class="customer-bottom-nav" aria-label="Navigasi pelanggan">
      <a href="/"><span class="customer-nav-icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span><span>Beranda</span></a>
      <a href="/catalog"><span class="customer-nav-icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span><span>Katalog</span></a>
      <a href="/account/orders"><span class="customer-nav-icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span><span>Buku Saya</span></a>
      <a href="/account/invoices"><span class="customer-nav-icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span><span>Tagihan</span></a>
      <a href="/account"><span class="customer-nav-icon-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span><span>Akun</span></a>
    </nav>
  `;
}

async function assertBottomClearance(
  page: Page,
  content: string,
  selector: string,
  testInfo: TestInfo,
  screenshotName: string,
) {
  await page.setContent(`
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${globalsCss}</style>
    <div class="site-shell customer-shell">
      <header class="site-header"><span>Blessing For Goods</span></header>
      <main>${content}</main>
      ${customerBottomNav()}
    </div>
  `);

  const initialNav = await page.locator(".customer-bottom-nav").boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const geometry = await page.locator(".customer-shell").evaluate((shell, targetSelector) => {
    const last = shell.querySelector<HTMLElement>(targetSelector);
    const nav = shell.querySelector<HTMLElement>(".customer-bottom-nav");
    if (!last || !nav) throw new Error("Customer clearance fixture is incomplete");
    const lastRect = last.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      lastBottom: lastRect.bottom,
      navTop: navRect.top,
      clearance: navRect.top - lastRect.bottom,
      navPosition: getComputedStyle(nav).position,
      documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    };
  }, selector);
  const finalNav = await page.locator(".customer-bottom-nav").boundingBox();

  expect(initialNav).not.toBeNull();
  expect(finalNav).not.toBeNull();
  expect(finalNav!.y).toBe(initialNav!.y);
  expect(geometry.navPosition).toBe("fixed");
  expect(geometry.clearance, "last Customer content must clear the fixed nav").toBeGreaterThanOrEqual(80);
  expect(geometry.clearance, "clearance must remain intentional, not oversized").toBeLessThanOrEqual(120);
  expect(geometry.documentWidth).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await page.screenshot({
    path: testInfo.outputPath(`${screenshotName}-${page.viewportSize()!.width}x${page.viewportSize()!.height}.png`),
    fullPage: true,
  });
}

test.describe("@customer @customer-bottom-nav shared mobile bottom-nav clearance", () => {
  test("Buku Saya summary clears the fixed nav at the absolute scroll end", async ({ page }, testInfo) => {
    for (const viewport of mobileViewports) {
      await page.setViewportSize(viewport);
      await assertBottomClearance(
        page,
        `
          <div class="page my-books-page">
            <section class="card my-books-date-range-card"><span class="card-kicker">Rentang waktu</span><input class="input" type="date" /></section>
            <div style="height: 720px"></div>
            <section class="card my-books-summary-card" data-last-customer-content>
              <span class="card-kicker my-books-summary-label">TOTAL SPENDING</span>
              <strong class="my-books-summary-value">Rp 325.000</strong>
              <span class="subtle my-books-summary-help">Total tagihan buku yang sudah di-fix</span>
            </section>
          </div>
        `,
        "[data-last-customer-content]",
        testInfo,
        "buku-saya-bottom",
      );
    }
  });

  test("Tagihan payment confirmation clears its final action and fields", async ({ page }, testInfo) => {
    for (const viewport of mobileViewports) {
      await page.setViewportSize(viewport);
      await assertBottomClearance(
        page,
        `
          <div class="page narrow-page customer-invoice-list-page">
            <section class="card invoice-card" data-last-customer-content>
              <h1>Konfirmasi pembayaran</h1>
              <div style="height: 360px"></div>
              <div class="form-grid">
                <label class="field"><span class="field-label">Jumlah dibayar</span><input class="input" type="number" /></label>
                <label class="field"><span class="field-label">Metode pembayaran</span><input class="input" /></label>
                <label class="field"><span class="field-label">Tanggal pembayaran</span><input class="input" type="date" /></label>
                <label class="field"><span class="field-label">Referensi transfer</span><input class="input" /></label>
              </div>
              <label class="field"><span class="field-label">Bukti pembayaran</span><input class="input" type="file" /></label>
              <label class="field"><span class="field-label">Catatan</span><textarea class="textarea"></textarea></label>
              <div class="form-actions"><button class="button" type="button">Kirim konfirmasi</button></div>
            </section>
          </div>
        `,
        "[data-last-customer-content]",
        testInfo,
        "tagihan-bottom",
      );
    }
  });
});
