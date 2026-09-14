import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const cartCss = readFileSync("src/features/customer-cart/cart.module.css", "utf8");

function cartFixture() {
  const line = (title: string, quantity: number) => `
    <section class="card line">
      <div class="cover"><div class="book-cover"><div class="book-cover-fallback"><strong>${title}</strong></div></div></div>
      <div class="body">
        <div class="lineHeading"><div><h3>${title}</h3><p class="meta">PB · BFG Press · ISBN 9780000000001</p></div><span class="status-badge status-positive">Bisa dipesan</span></div>
        <div class="priceRow"><div class="price"><span class="priceLabel">Harga per buku</span><strong>Rp 125.000</strong></div><div class="subtotal"><span class="priceLabel">Subtotal</span><strong>Rp 250.000</strong></div></div>
      </div>
      <div class="actions"><div class="quantity"><span>Jumlah</span><div class="quantityControl"><button class="button button-tertiary button-icon" type="button" aria-label="Kurangi">−</button><output>${quantity}</output><button class="button button-tertiary button-icon" type="button" aria-label="Tambah">+</button></div></div><button class="button button-danger button-icon removeButton" type="button" aria-label="Hapus ${title}">×</button></div>
    </section>`;
  return `
    <div class="site-shell customer-shell">
      <header class="site-header"><span>Blessing For Good</span></header>
      <main>
        <div class="page">
          <header class="page-header"><div><span class="eyebrow">Keranjang</span><h1>Keranjang</h1><p class="lede">Periksa buku yang masih bisa dipesan.</p></div></header>
          <div class="context"><div><span class="card-kicker">SECRET CATALOG</span><strong>September Picks</strong></div><p>Satu keranjang hanya menyimpan pilihan dari satu katalog.</p></div>
          <div class="layout">
            <div class="sections">
              <section class="card sectionCard"><div class="sectionHeading"><div><span class="card-kicker">AKTIF</span><h2>Buku yang bisa dipesan</h2></div><span class="count">2 pilihan</span></div><div class="lineList">${line("Buku Satu", 2)}${line("Buku Dua", 1)}</div></section>
              <section class="card sectionCard"><div class="sectionHeading"><div><span class="card-kicker">PERLU PERHATIAN</span><h2>Belum bisa dipesan</h2></div><span class="count">1 pilihan</span></div><div class="lineList">${line("Buku Tiga", 1)}</div></section>
            </div>
            <aside><section class="card summary"><div><span class="card-kicker">RINGKASAN</span><h2>Keranjangmu</h2></div><div class="summaryRows"><div><span>Buku aktif</span><strong>3</strong></div><div><span>Subtotal aktif</span><strong>Rp 375.000</strong></div></div><p class="summaryNote">Keranjang ini hanya untuk mengelola pilihan buku.</p><button class="button button-danger" type="button">Kosongkan keranjang</button></section></aside>
          </div>
        </div>
      </main>
      <nav class="customer-bottom-nav" aria-label="Navigasi pelanggan"><a href="/">Beranda</a><a href="/catalog">Katalog</a><a href="/account/orders">Buku Saya</a><a href="/account/invoices">Tagihan</a><a href="/account">Akun</a></nav>
    </div>`;
}

test.describe("@customer Customer Cart geometry", () => {
  test("keeps active/retained lines usable from compact mobile to desktop", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "customer-390") test.skip(true, "Run the Cart geometry matrix once.");

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}\n${cartCss}</style>${cartFixture()}`,
      );

      const geometry = await page.locator(".customer-shell").evaluate((shell) => {
        const layout = shell.querySelector<HTMLElement>(".layout");
        const sections = shell.querySelector<HTMLElement>(".sections");
        const summary = shell.querySelector<HTMLElement>(".summary");
        const nav = shell.querySelector<HTMLElement>(".customer-bottom-nav");
        const main = shell.querySelector<HTMLElement>("main");
        if (!layout || !sections || !summary || !nav || !main) throw new Error("Cart fixture is incomplete");
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          layoutColumns: getComputedStyle(layout).gridTemplateColumns,
          lineOverflowDetails: [...shell.querySelectorAll<HTMLElement>(".line")].flatMap((line, index) => {
            const elements = [line, ...line.querySelectorAll<HTMLElement>("*")];
            return elements
              .filter((element) => element.scrollWidth > element.clientWidth)
              .map((element) => ({
                index,
                className: element.className,
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
              }));
          }),
          buttonHeights: [...shell.querySelectorAll<HTMLElement>(".quantityControl .button, .removeButton")].map(
            (button) => button.getBoundingClientRect().height,
          ),
          summaryAfterSections: summary.getBoundingClientRect().top >= sections.getBoundingClientRect().bottom,
          mainPaddingBottom: Number.parseFloat(getComputedStyle(main).paddingBottom),
          navDisplay: getComputedStyle(nav).display,
          navPosition: getComputedStyle(nav).position,
        };
      });

      expect(geometry.documentWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.lineOverflowDetails, `${viewport.width}px line overflow`).toEqual([]);
      expect(
        geometry.buttonHeights.every((height) => height >= 44),
        `${viewport.width}px touch targets`,
      ).toBe(true);
      if (viewport.width <= 900) {
        expect(geometry.layoutColumns.split(" ").length, `${viewport.width}px stacked Cart layout`).toBe(1);
        expect(geometry.summaryAfterSections, `${viewport.width}px summary order`).toBe(true);
      } else {
        expect(geometry.layoutColumns.split(" ").length, "desktop Cart columns").toBe(2);
        expect(geometry.summaryAfterSections, "desktop summary stays beside lines").toBe(false);
      }
      if (viewport.width <= 800) {
        expect(geometry.navDisplay, `${viewport.width}px bottom nav`).toBe("flex");
        expect(geometry.navPosition, `${viewport.width}px bottom nav`).toBe("fixed");
        expect(geometry.mainPaddingBottom, `${viewport.width}px nav clearance`).toBeGreaterThanOrEqual(92);
      }
      if ([320, 390, 430, 1440].includes(viewport.width)) {
        await page.screenshot({ path: testInfo.outputPath(`customer-cart-${viewport.width}.png`), fullPage: true });
      }
    }
  });
});
