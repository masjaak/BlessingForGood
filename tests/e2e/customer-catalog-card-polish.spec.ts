import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

function cardMarkup({
  title,
  bookId,
  format,
  price,
  variants,
}: {
  title: string;
  bookId: string;
  format: string;
  price: string;
  variants: Array<{ id: string; format: string; checked?: boolean }>;
}) {
  const variantMarkup =
    variants.length > 1
      ? `<div class="book-format-selection">
          <span class="book-format-label">Pilih format</span>
          <div class="variant-list" role="radiogroup" aria-label="Format untuk ${title}">
            ${variants
              .map(
                (variant) => `<label class="variant-option">
                  <input type="radio" name="${bookId}" value="${variant.id}"${variant.checked ? " checked" : ""} />
                  <span class="variant-option-format">${variant.format}</span>
                </label>`,
              )
              .join("")}
          </div>
        </div>`
      : `<div class="book-format-summary" aria-label="Format ${format}">
          <span class="book-format-label">Format</span>
          <strong class="book-format-value">${format}</strong>
        </div>`;

  return `<section class="card frame-list book-card">
    <div class="book-card-layout">
      <div class="book-cover is-empty"><div class="book-cover-fallback" role="img" aria-label="Cover placeholder for ${title}">
        <span class="book-cover-format">${format}</span><strong>${title}</strong><span>BFG Press</span>
      </div></div>
      <div class="book-card-details">
        <div class="book-card-header">
          <div class="book-meta">
            <div class="book-card-heading">
              <h2>${title}</h2>
              <p class="book-card-isbn">ISBN: 9780000000000</p>
              <a class="button button-secondary button-size-compact book-detail-action" href="/catalog/catalog-1/${bookId}">
                <span class="button-label">Buka detail buku</span>
              </a>
            </div>
            <div class="book-card-price"><span class="book-card-price-label">Harga</span><span class="money">${price}</span></div>
          </div>
          ${variantMarkup}
          <div class="book-card-category"><span class="book-format-label">Kategori</span><strong>Children Books</strong></div>
        </div>
        <div class="quantity-row"><span>Jumlah</span><div class="quantity-control"><button class="button button-secondary button-icon" aria-label="Kurangi jumlah ${title}"><span class="button-label">−</span></button><output aria-label="Jumlah ${title}">0</output><button class="button button-secondary button-icon" aria-label="Tambah jumlah ${title}"><span class="button-label">+</span></button></div></div>
        <div class="catalog-member-note"><button class="button button-secondary button-size-compact">Tambahkan ke keranjang</button></div>
      </div>
    </div>
  </section>`;
}

test.describe("@customer Secret Catalog card polish", () => {
  test("keeps single and multi-format cards quiet, scannable, and responsive", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-1440") test.skip(true, "Run the card presentation matrix once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 834, height: 1112 },
      { width: 1024, height: 768 },
      { width: 1280, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}
          .customer-shell .page { width: min(calc(100% - 32px), 1180px); margin: 0 auto; }
        </style>
        <div class="customer-shell">
          <main class="page">
            <div class="catalog-grid">
              <div class="book-list">
                ${cardMarkup({
                  title: "Penicillin and Other Incredible Mistakes You've (Probably) Never Heard Of",
                  bookId: "book-a",
                  format: "HB",
                  price: "Rp 325.000",
                  variants: [{ id: "variant-hb", format: "HB" }],
                })}
                ${cardMarkup({
                  title: "Book B",
                  bookId: "book-b",
                  format: "HB",
                  price: "Rp 325.000",
                  variants: [
                    { id: "variant-hb", format: "HB", checked: true },
                    { id: "variant-pb", format: "PB" },
                    { id: "variant-bb", format: "BB" },
                  ],
                })}
              </div>
            </div>
          </main>
        </div>
      `);

      const metrics = await page.locator(".customer-shell").evaluate((shell) => {
        const cards = [...shell.querySelectorAll<HTMLElement>(".book-card")];
        const single = cards[0];
        const multi = cards[1];
        const bottoms = (items: HTMLElement[]) =>
          Math.max(...items.map((item) => item.getBoundingClientRect().bottom)) -
          Math.min(...items.map((item) => item.getBoundingClientRect().bottom));
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          layoutWidth: single.querySelector<HTMLElement>(".book-card-layout")?.getBoundingClientRect().width ?? 0,
          coverWidth: single.querySelector<HTMLElement>(".book-cover")?.getBoundingClientRect().width ?? 0,
          coverCenterDelta: (() => {
            const layout = single.querySelector<HTMLElement>(".book-card-layout")?.getBoundingClientRect();
            const cover = single.querySelector<HTMLElement>(".book-cover")?.getBoundingClientRect();
            return layout && cover
              ? Math.abs(layout.left + layout.width / 2 - (cover.left + cover.width / 2))
              : Infinity;
          })(),
          titleTop: single.querySelector<HTMLElement>(".book-card-heading h2")?.getBoundingClientRect().top ?? 0,
          coverBottom: single.querySelector<HTMLElement>(".book-cover")?.getBoundingClientRect().bottom ?? 0,
          detailActionWidth:
            single.querySelector<HTMLElement>(".book-detail-action")?.getBoundingClientRect().width ?? 0,
          cartActionWidth:
            single.querySelector<HTMLElement>(".catalog-member-note .button")?.getBoundingClientRect().width ?? 0,
          categoryVisible: Boolean(
            single.querySelector(".book-card-category") &&
            getComputedStyle(single.querySelector(".book-card-category")!).display !== "none",
          ),
          singleHasSelector: Boolean(single.querySelector(".variant-list, input[type='radio']")),
          singleFormat: single.querySelector(".book-format-value")?.textContent,
          singleDetailClass: single.querySelector(".book-detail-action")?.className || "",
          singlePriceCount: single.querySelectorAll(".book-card-price .money").length,
          multiRadioCount: multi.querySelectorAll("input[type='radio']").length,
          multiOptionHeight: Math.max(
            ...[...multi.querySelectorAll<HTMLElement>(".variant-option")].map(
              (item) => item.getBoundingClientRect().height,
            ),
          ),
          multiOptionPriceCount: multi.querySelectorAll(".variant-option .money").length,
          multiControlBottomDelta: bottoms([...multi.querySelectorAll<HTMLElement>(".variant-option")]),
        };
      });

      console.info(
        `Catalog ${viewport.width}px: cover ${Math.round(metrics.coverWidth)}px / ${Math.round(metrics.layoutWidth)}px content`,
      );

      expect(metrics.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
      if (viewport.width <= 430) {
        expect(metrics.coverWidth).toBeGreaterThanOrEqual(190);
        expect(metrics.coverWidth / metrics.layoutWidth).toBeGreaterThanOrEqual(0.55);
        expect(metrics.coverWidth / metrics.layoutWidth).toBeLessThanOrEqual(0.72);
        expect(metrics.coverCenterDelta).toBeLessThanOrEqual(1);
        expect(metrics.titleTop).toBeGreaterThanOrEqual(metrics.coverBottom);
        expect(metrics.detailActionWidth).toBeGreaterThanOrEqual(metrics.layoutWidth - 2);
        expect(metrics.cartActionWidth).toBeGreaterThanOrEqual(metrics.layoutWidth - 2);
        expect(metrics.categoryVisible).toBe(true);
      } else {
        expect(metrics.coverWidth).toBeGreaterThanOrEqual(150);
      }
      if (viewport.width > 430 && viewport.width <= 900) expect(metrics.categoryVisible).toBe(true);
      expect(metrics.singleHasSelector).toBe(false);
      expect(metrics.singleFormat).toBe("HB");
      expect(metrics.singleDetailClass).toContain("button-secondary");
      expect(metrics.singlePriceCount).toBe(1);
      expect(metrics.multiRadioCount).toBe(3);
      expect(metrics.multiOptionHeight).toBeLessThanOrEqual(48);
      expect(metrics.multiOptionPriceCount).toBe(0);
      expect(metrics.multiControlBottomDelta).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: testInfo.outputPath(`customer-catalog-card-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });

  test("keeps the bottom result navigation clear of Blessy and the fixed Customer nav", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-1440") test.skip(true, "Run the mobile collision check once.");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}
          .customer-shell .page { width: min(calc(100% - 32px), 1180px); margin: 0 auto; }
        </style>
        <div class="customer-shell">
          <main><div class="page">
            <div class="catalog-grid"><div style="height: 1400px"></div></div>
            <nav class="catalog-page-navigation" aria-label="Navigasi halaman buku">
              <button class="button button-secondary">← Sebelumnya</button>
              <span>Halaman 6 dari 6</span>
              <button class="button button-secondary">Berikutnya →</button>
            </nav>
          </div></main>
          <nav class="customer-bottom-nav" aria-label="Navigasi pelanggan">
            <a>Beranda</a><a>Katalog</a><a>Buku Saya</a><a>Tagihan</a><a>Akun</a>
          </nav>
          <aside class="floating-blessy" aria-hidden="true"></aside>
        </div>
      `);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.scrollTo(0, document.documentElement.scrollHeight);
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );
      const metrics = await page.evaluate(() => {
        const box = (element: Element | null) => {
          const rect = element?.getBoundingClientRect();
          return rect
            ? {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }
            : null;
        };
        return {
          pagination: box(document.querySelector(".catalog-page-navigation")),
          blessy: box(document.querySelector(".floating-blessy")),
          bottomNav: box(document.querySelector(".customer-bottom-nav")),
        };
      });
      const overlaps = (a: typeof metrics.pagination, b: typeof metrics.pagination) =>
        Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      console.info(`Catalog pagination overlays ${viewport.width}px: ${JSON.stringify(metrics)}`);
      expect(metrics.bottomNav?.height).toBeGreaterThan(0);
      expect(overlaps(metrics.pagination, metrics.blessy)).toBe(false);
      expect(overlaps(metrics.pagination, metrics.bottomNav)).toBe(false);
      await page.screenshot({ path: testInfo.outputPath(`customer-pagination-mobile-${viewport.width}.png`) });
    }
  });
});
