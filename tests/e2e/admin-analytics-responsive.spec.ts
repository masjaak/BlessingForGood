import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 834, height: 1112 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const navGroups = [
  ["Ikhtisar", "Dasbor", "Analytics", "Konten"],
  ["Pelanggan", "Permintaan bergabung", "Pelanggan"],
  ["Katalog", "Buku", "Katalog", "Ready Stock"],
  ["Operasional", "Pesanan", "Batch PO", "Masalah pesanan"],
  ["Keuangan", "Tagihan & Deposit", "Deposit & Top-up", "Pembayaran", "Pengembalian", "Laporan & analitik"],
];

function navMarkup() {
  return navGroups
    .map(
      ([label, ...links]) => `<div class="admin-nav-group">
        <span class="admin-nav-group-label">${label}</span>
        ${links.map((link) => `<a class="admin-nav-link${link === "Analytics" ? " is-current" : ""}" href="#">${link}</a>`).join("")}
      </div>`,
    )
    .join("");
}

function metricMarkup(label: string, value: number) {
  return `<article class="card metric analytics-metric-card">
    <span class="card-kicker">${label}</span>
    <strong class="metric-value">${value}</strong>
    <p>Intent buku yang tercatat pada periode ini.</p>
    <div class="analytics-trend-chart"><svg viewBox="0 0 240 52" preserveAspectRatio="none"><polyline points="0,44 120,20 240,32"></polyline><circle cx="120" cy="20" r="2.5"></circle></svg></div>
  </article>`;
}

function analyticsFixture() {
  return `<meta name="viewport" content="width=device-width, initial-scale=1" />
    <div class="site-shell admin-shell">
      <header class="admin-topbar"><span class="brand-logo-link">BFG</span><div class="admin-brand-copy"><strong>Operasional BFG</strong></div><div class="admin-account"><a href="#">Lihat sisi pelanggan</a><span class="admin-shell-skeleton-avatar" style="display:block;background:var(--accent);color:var(--surface);text-align:center;line-height:34px;">A</span></div></header>
      <main>
        <div class="admin-layout-workspace">
          <nav class="admin-nav" aria-label="Navigasi admin">${navMarkup()}<a class="admin-nav-external" href="#">Lihat sisi pelanggan →</a></nav>
          <div class="admin-layout-route">
            <div class="page admin-page admin-operational-page analytics-route">
              <header class="page-header"><div><span class="eyebrow">Analytics</span><h1>Analytics</h1><p class="lede">Lihat minat Customer dari aktivitas keranjang sebelum menjadi pesanan.</p></div></header>
              <div class="admin-workspace"><div class="admin-content admin-operational-content">
                <section class="card analytics-period-filter"><label class="field"><span class="field-label">Periode</span><button class="select bfg-select-trigger" aria-label="Periode analytics"><span class="bfg-select-value">30 hari terakhir</span><span class="bfg-select-trailing"></span></button></label></section>
                <p class="subtle analytics-tracking-note">Cohort memakai bukti pertama nyata dari event atau Cart line; Cart lama di luar periode tidak dihitung.</p>
                <section class="account-metrics analytics-metric-grid" aria-label="Ringkasan minat Customer">
                  ${metricMarkup("Add ke keranjang", 3)}
                  ${metricMarkup("Customer berminat", 2)}
                  ${metricMarkup("Belum checkout", 2)}
                  ${metricMarkup("Menjadi pesanan", 1)}
                </section>
                <section class="admin-dashboard-section analytics-books-section"><div class="admin-section-heading"><div><span class="card-kicker">Minat &amp; keranjang</span><h2>Buku paling diminati</h2></div><p>Semua intent buku · Total 3 intent.</p></div><div class="table-wrap"><table class="data-table"><tbody><tr><td>Buku A</td><td>PB</td><td>3</td><td>2</td><td>2</td><td>1</td><td>33%</td></tr></tbody></table></div></section>
                <section class="admin-dashboard-section analytics-customers-section"><div class="admin-section-heading"><div><span class="card-kicker">Customer</span><h2>Aktivitas Customer</h2></div><p>Nama dan Member Code saja untuk evaluasi operasional.</p></div><div class="table-wrap"><table class="data-table"><tbody><tr><td>Customer A</td><td>BFG-001</td><td>Buku A · 1</td><td>22/09/2026</td><td>Masih di keranjang</td></tr></tbody></table></div></section>
              </div></div>
            </div>
          </div>
        </div>
      </main>
    </div>`;
}

test.describe("@admin Admin Analytics responsive composition", () => {
  test("keeps the mobile shell compact and the desktop grid intact", async ({ page }, testInfo) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.setContent(`<style>${globalsCss}</style>${analyticsFixture()}`);

      const geometry = await page.locator(".analytics-route").evaluate((route) => {
        const rect = (selector: string) => {
          const element = route.matches(selector) ? route : route.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`Missing ${selector}`);
          const box = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          return {
            left: box.left,
            right: box.right,
            width: box.width,
            height: box.height,
            display: styles.display,
            gridTemplateColumns: styles.gridTemplateColumns,
            overflowY: styles.overflowY,
          };
        };
        const cards = [...route.querySelectorAll<HTMLElement>(".analytics-metric-card")].map((card) => {
          const box = card.getBoundingClientRect();
          return { top: box.top, width: box.width, height: box.height };
        });
        const charts = [...route.querySelectorAll<HTMLElement>(".analytics-trend-chart")].map((chart) => ({
          height: chart.getBoundingClientRect().height,
          svgHeight: chart.querySelector("svg")?.getBoundingClientRect().height ?? 0,
        }));
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          route: rect(".analytics-route"),
          nav: (() => {
            const nav = document.querySelector<HTMLElement>(".admin-layout-workspace > .admin-nav");
            if (!nav) throw new Error("Missing persistent admin nav");
            const box = nav.getBoundingClientRect();
            const styles = getComputedStyle(nav);
            return { height: box.height, width: box.width, display: styles.display, overflowY: styles.overflowY };
          })(),
          filter: rect(".analytics-period-filter"),
          select: rect(".analytics-period-filter .select"),
          grid: rect(".analytics-metric-grid"),
          cards,
          charts,
          tableFrames: [...route.querySelectorAll<HTMLElement>(".table-wrap")].map((table) => {
            const box = table.getBoundingClientRect();
            return { left: box.left, right: box.right, width: box.width, scrollWidth: table.scrollWidth };
          }),
        };
      });

      expect(geometry.documentWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.route.left, `${viewport.width}px route left`).toBeGreaterThanOrEqual(0);
      expect(geometry.route.right, `${viewport.width}px route right`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.filter.width, `${viewport.width}px filter width`).toBeLessThanOrEqual(geometry.route.width + 1);
      expect(geometry.cards).toHaveLength(4);
      expect(geometry.charts).toHaveLength(4);
      for (const card of geometry.cards) {
        expect(card.width, `${viewport.width}px card width`).toBeLessThanOrEqual(geometry.grid.width + 1);
      }
      for (const chart of geometry.charts) {
        expect(chart.height, `${viewport.width}px chart height`).toBeLessThanOrEqual(60);
        expect(chart.svgHeight, `${viewport.width}px SVG height`).toBeLessThanOrEqual(60);
      }
      for (const table of geometry.tableFrames) {
        expect(table.right, `${viewport.width}px table frame`).toBeLessThanOrEqual(geometry.route.right + 1);
        expect(table.scrollWidth, `${viewport.width}px table overflow stays internal`).toBeGreaterThanOrEqual(
          table.width - 2,
        );
      }

      if (viewport.width <= 900) {
        expect(geometry.nav.display, `${viewport.width}px compact nav`).toBe("flex");
        expect(geometry.nav.height, `${viewport.width}px nav height`).toBeLessThanOrEqual(72);
        expect(geometry.nav.overflowY, `${viewport.width}px nav vertical overflow`).toBe("hidden");
        expect(geometry.cards.every((card) => card.height >= 145 && card.height <= 205)).toBe(true);
      }

      if (viewport.width <= 640) {
        expect(new Set(geometry.cards.map((card) => card.top)).size).toBe(4);
      } else if (viewport.width <= 900) {
        expect(new Set(geometry.cards.map((card) => card.top)).size).toBe(2);
      } else {
        expect(new Set(geometry.cards.map((card) => card.top)).size).toBe(1);
      }

      if ([390, 430, 768, 1280].includes(viewport.width)) {
        await page.screenshot({ path: testInfo.outputPath(`analytics-${viewport.width}.png`), fullPage: true });
      }
    }
  });
});
