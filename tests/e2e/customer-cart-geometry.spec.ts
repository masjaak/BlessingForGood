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
  const group = (name: string, index: number) => `
    <section class="sections" aria-labelledby="cart-group-${index}">
      <div class="sectionHeading"><div><span class="card-kicker">SECRET CATALOG</span><h2 id="cart-group-${index}">${name}</h2></div><span class="count">1 buku</span></div>
      <div class="layout">
        <div class="sections">
          <section class="card sectionCard"><div class="sectionHeading"><div><span class="card-kicker">AKTIF</span><h3>Buku yang bisa dipesan</h3></div><span class="count">1 pilihan</span></div><div class="lineList">${line(`Buku ${index}`, 1)}</div></section>
        </div>
        <aside><section class="card summary"><div><span class="card-kicker">RINGKASAN</span><h3>Pesanan katalog ini</h3></div><div class="summaryRows"><div><span>Buku aktif</span><strong>1</strong></div><div><span>Subtotal aktif</span><strong>Rp 125.000</strong></div></div><p class="summaryNote">Semua buku siap dibuat menjadi satu pesanan.</p><button class="button button-primary checkoutButton" type="button">Buat pesanan</button></section></aside>
      </div>
    </section>`;
  return `
    <div class="site-shell customer-shell">
      <header class="site-header"><span>Blessing For Good</span></header>
      <main>
        <div class="miniCartRegion" data-testid="customer-mini-cart">
          <a class="miniCart" href="/account/cart" aria-label="Buka keranjang, 4 buku tersimpan">
            <span class="miniCartIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l1.5 10.5h9.75L19 8H7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" /><circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="17" cy="19" r="1" fill="currentColor" /></svg></span>
            <span class="miniCartCopy"><strong>Keranjang</strong><span>4 buku</span></span>
            <span class="miniCartArrow" aria-hidden="true">→</span>
          </a>
        </div>
        <div class="page">
          <header class="page-header"><div><span class="eyebrow">Keranjang</span><h1>Keranjang</h1><p class="lede">Periksa buku yang masih bisa dipesan.</p></div></header>
          <div class="context"><div><strong>3 buku tersimpan</strong></div><p>3 katalog · Satu pesanan untuk setiap katalog.</p></div>
          <div class="sections">${group("CARGO 1", 1)}${group("CARGO 2", 2)}${group("CARGO 3", 3)}</div>
          <button class="button button-tertiary" type="button">Kosongkan keranjang</button>
        </div>
      </main>
      <nav class="customer-bottom-nav" aria-label="Navigasi pelanggan"><a href="/">Beranda</a><a href="/catalog">Katalog</a><a href="/account/orders">Buku Saya</a><a href="/account/invoices">Tagihan</a><a href="/account">Akun</a></nav>
      <aside class="floating-blessy" data-testid="floating-blessy" aria-hidden="true"><div class="floating-blessy__visual"></div></aside>
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
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}\n${cartCss}</style>${cartFixture()}`,
      );
      await expect(page.getByRole("heading", { name: "CARGO 1", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "CARGO 2", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "CARGO 3", exact: true })).toBeVisible();

      const geometry = await page.locator(".customer-shell").evaluate((shell) => {
        const layout = shell.querySelector<HTMLElement>(".layout");
        const sections = shell.querySelector<HTMLElement>(".page > .sections");
        const summary = shell.querySelector<HTMLElement>(".summary");
        const miniCart = shell.querySelector<HTMLElement>(".miniCartRegion");
        const miniCartLink = shell.querySelector<HTMLAnchorElement>(".miniCart");
        const checkoutButton = shell.querySelector<HTMLElement>(".checkoutButton");
        const nav = shell.querySelector<HTMLElement>(".customer-bottom-nav");
        const blessy = shell.querySelector<HTMLElement>(".floating-blessy");
        const main = shell.querySelector<HTMLElement>("main");
        if (
          !layout ||
          !sections ||
          !summary ||
          !miniCart ||
          !miniCartLink ||
          !checkoutButton ||
          !nav ||
          !blessy ||
          !main
        ) {
          throw new Error("Cart fixture is incomplete");
        }
        const rect = (element: HTMLElement) => {
          const bounds = element.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
        };
        const miniCartRect = rect(miniCart);
        const checkoutRect = rect(checkoutButton);
        const pageRect = rect(shell.querySelector<HTMLElement>(".page")!);
        const navRect = rect(nav);
        const blessyRect = rect(blessy);
        const overlaps = (
          first: { left: number; right: number; top: number; bottom: number },
          second: { left: number; right: number; top: number; bottom: number },
        ) =>
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top;
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
          miniCartPosition: getComputedStyle(miniCart).position,
          miniCartLinkHeight: miniCartLink.getBoundingClientRect().height,
          checkoutPosition: getComputedStyle(checkoutButton).position,
          checkoutButtonHeight: checkoutButton.getBoundingClientRect().height,
          checkoutWithinContentRail: checkoutRect.left >= pageRect.left - 1 && checkoutRect.right <= pageRect.right + 1,
          checkoutOverlapsBottomNav: overlaps(checkoutRect, navRect),
          checkoutOverlapsBlessy: overlaps(checkoutRect, blessyRect),
          miniCartWithinContentRail: miniCartRect.left >= pageRect.left - 1 && miniCartRect.right <= pageRect.right + 1,
          miniCartOverlapsBottomNav: overlaps(miniCartRect, navRect),
          miniCartOverlapsBlessy: overlaps(miniCartRect, blessyRect),
        };
      });

      expect(geometry.documentWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.lineOverflowDetails, `${viewport.width}px line overflow`).toEqual([]);
      expect(geometry.miniCartPosition, `${viewport.width}px mini-cart flow`).toBe("sticky");
      expect(geometry.miniCartLinkHeight, `${viewport.width}px mini-cart touch target`).toBeGreaterThanOrEqual(44);
      expect(geometry.checkoutPosition, `${viewport.width}px checkout flow`).toBe("static");
      expect(geometry.checkoutButtonHeight, `${viewport.width}px checkout touch target`).toBeGreaterThanOrEqual(44);
      expect(geometry.checkoutWithinContentRail, `${viewport.width}px checkout rail alignment`).toBe(true);
      expect(geometry.checkoutOverlapsBottomNav, `${viewport.width}px checkout/nav overlap`).toBe(false);
      expect(geometry.checkoutOverlapsBlessy, `${viewport.width}px checkout/Blessy overlap`).toBe(false);
      expect(geometry.miniCartWithinContentRail, `${viewport.width}px mini-cart rail alignment`).toBe(true);
      expect(geometry.miniCartOverlapsBottomNav, `${viewport.width}px mini-cart/nav overlap`).toBe(false);
      expect(geometry.miniCartOverlapsBlessy, `${viewport.width}px mini-cart/Blessy overlap`).toBe(false);

      await page.evaluate(() => window.scrollTo(0, Math.min(240, document.documentElement.scrollHeight)));
      const scrolledMiniCart = await page.locator(".miniCartRegion").evaluate((mini) => {
        const miniBounds = mini.getBoundingClientRect();
        const navBounds = mini
          .closest(".customer-shell")
          ?.querySelector(".customer-bottom-nav")
          ?.getBoundingClientRect();
        const blessyBounds = mini
          .closest(".customer-shell")
          ?.querySelector(".floating-blessy")
          ?.getBoundingClientRect();
        const overlaps = (first: DOMRect, second?: DOMRect) =>
          Boolean(
            second &&
            first.left < second.right &&
            first.right > second.left &&
            first.top < second.bottom &&
            first.bottom > second.top,
          );
        return {
          inViewport: miniBounds.top >= 0 && miniBounds.bottom <= window.innerHeight,
          overlapsBottomNav: overlaps(miniBounds, navBounds),
          overlapsBlessy: overlaps(miniBounds, blessyBounds),
        };
      });
      expect(scrolledMiniCart.inViewport, `${viewport.width}px mini-cart reachable while scrolling`).toBe(true);
      expect(scrolledMiniCart.overlapsBottomNav, `${viewport.width}px scrolled mini-cart/nav overlap`).toBe(false);
      expect(scrolledMiniCart.overlapsBlessy, `${viewport.width}px scrolled mini-cart/Blessy overlap`).toBe(false);
      await page.evaluate(() => window.scrollTo(0, 0));
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
