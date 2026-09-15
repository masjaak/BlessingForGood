import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

function catalogMarkup() {
  const books = Array.from(
    { length: 8 },
    (_, index) => `
      <article class="card frame-list book-card">
        <h2>Book ${index + 1}</h2>
        <p>Publisher ${index + 1}</p>
        <output aria-label="Jumlah Book ${index + 1}">${index === 0 ? "1" : "0"}</output>
      </article>`,
  ).join("");

  return `<style>${globalsCss}
    .customer-shell .page { width: min(calc(100% - 28px), var(--content)); margin: 0 auto; }
    .catalog-navigation-harness { display: grid; gap: 18px; }
    .catalog-navigation-harness .catalog-discovery { min-height: 180px; }
    .catalog-navigation-harness .catalog-grid { align-items: start; }
    .catalog-navigation-harness .book-list { min-width: 0; }
    .catalog-navigation-harness .order-summary { min-height: 360px; }
    .catalog-navigation-harness .selection-state { display: grid; gap: 8px; }
    .catalog-navigation-harness .customer-bottom-nav { z-index: 90; }
  </style>
  <div class="customer-shell">
    <main>
      <div class="page catalog-navigation-harness">
        <section class="catalog-discovery" id="catalog-browse" aria-label="Cari buku di katalog">
          <h1>CARGO Navigation</h1>
          <label class="field"><span class="field-label">Cari buku</span><input class="input" aria-label="Cari judul atau ISBN" value="walker" /></label>
          <p class="catalog-result-count">8 buku tersedia</p>
        </section>
        <a class="button button-secondary button-size-compact" id="review-preorder" href="#order-summary">Tinjau preorder</a>
        <div class="catalog-grid">
          <div class="book-list">
            ${books}
          </div>
          <section class="card frame-detail order-summary" id="order-summary">
            <div>
              <span class="card-kicker">Tinjau preorder</span>
              <h2>Pastikan pilihanmu.</h2>
            </div>
            <a class="button button-tertiary button-size-compact" id="return-to-books" href="#catalog-browse">Kembali ke daftar buku</a>
            <div class="selection-state">
              <span>Jumlah buku</span>
              <output aria-label="Jumlah buku terpilih">1</output>
              <strong>Rp&nbsp;125.000</strong>
            </div>
            <button class="button button-primary" type="button">Catat preorder</button>
          </section>
        </div>
      </div>
    </main>
    <nav class="customer-bottom-nav" aria-label="Navigasi pelanggan"><a href="/">Beranda</a><a href="/catalog">Katalog</a><a href="/account">Akun</a></nav>
  </div>`;
}

test.describe("@customer Secret Catalog in-page navigation", () => {
  test("repeats semantic preorder/list jumps and preserves selection state", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-1440") test.skip(true, "Run the Catalog navigation matrix once.");

    const viewports = [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];

    const targetIsUsable = async (selector: string) =>
      page.evaluate((targetSelector) => {
        const target = document.querySelector<HTMLElement>(targetSelector);
        const nav = document.querySelector<HTMLElement>(".customer-bottom-nav");
        if (!target) return false;
        const targetRect = target.getBoundingClientRect();
        const navRect = nav?.getBoundingClientRect();
        const safeBottom = navRect && navRect.height > 0 ? navRect.top : window.innerHeight;
        return targetRect.top < safeBottom && targetRect.bottom > 0;
      }, selector);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.setContent(catalogMarkup());
      await page.evaluate(() => {
        const scrollToCatalogTarget = (targetId: string) => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
        };
        document.getElementById("review-preorder")?.addEventListener("click", (event) => {
          event.preventDefault();
          scrollToCatalogTarget("order-summary");
        });
        document.getElementById("return-to-books")?.addEventListener("click", (event) => {
          event.preventDefault();
          scrollToCatalogTarget("catalog-browse");
        });
      });

      const down = page.getByRole("link", { name: "Tinjau preorder" });
      const up = page.getByRole("link", { name: "Kembali ke daftar buku" });
      await expect(down).toBeVisible();

      for (let cycle = 0; cycle < 3; cycle += 1) {
        await down.click();
        await expect.poll(() => targetIsUsable("#order-summary"), { timeout: 2_000 }).toBe(true);
        await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
        await up.click();
        await expect.poll(() => targetIsUsable("#catalog-browse"), { timeout: 2_000 }).toBe(true);
        await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
        await expect(page.getByLabel("Cari judul atau ISBN")).toHaveValue("walker");
        await expect(page.getByLabel("Jumlah buku terpilih")).toHaveText("1");
        await expect(page.getByText(/125[.]000/)).toBeVisible();
      }

      const geometry = await page.evaluate(() => ({
        documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        downHeight: document.getElementById("review-preorder")?.getBoundingClientRect().height ?? 0,
        upHeight: document.getElementById("return-to-books")?.getBoundingClientRect().height ?? 0,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.downHeight).toBeGreaterThanOrEqual(40);
      expect(geometry.upHeight).toBeGreaterThanOrEqual(40);
    }
  });
});
