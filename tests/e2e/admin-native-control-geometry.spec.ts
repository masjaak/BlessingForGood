import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const viewports = [
  { width: 320, height: 700 },
  { width: 360, height: 780 },
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

type NativeControlType = "date" | "month" | "datetime-local";

type RouteFixture = {
  route: string;
  content: string;
  labels: string[];
};

function field(label: string, type: NativeControlType, value: string, hint?: string) {
  return `<label class="field">
    <span class="field-label">${label}</span>
    ${hint ? `<span class="field-hint">${hint}</span>` : ""}
    <input class="input" type="${type}" value="${value}" />
  </label>`;
}

function routeFrame(route: string, content: string) {
  return `<div class="site-shell admin-shell">
    <header class="admin-topbar"></header>
    <main>
      <div class="admin-layout-workspace">
        <nav class="admin-nav" aria-label="Admin navigation"></nav>
        <div class="admin-layout-route">
          <div class="page admin-page">
            <div class="admin-workspace">
              <div class="admin-content">
                <div data-geometry-route="${route}">${content}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>`;
}

const routeFixtures: RouteFixture[] = [
  {
    route: "/admin/catalogs",
    labels: ["Batas pemesanan"],
    content: `<section class="card frame-form form-card">
      <form class="form-card admin-catalog-create-form">
        <div class="form-grid">
          <label class="field"><span class="field-label">Nama katalog</span><input class="input" value="Bacaan musim gugur" /></label>
          ${field("Batas pemesanan", "date", "2026-09-30", "Customer dapat melakukan preorder sampai tanggal ini.")}
        </div>
        <label class="field"><span class="field-label">Deskripsi</span><textarea class="textarea">Katalog September</textarea></label>
        <button class="button button-primary" type="button">Buat draf katalog</button>
      </form>
    </section>`,
  },
  {
    route: "/admin/catalogs/[catalogId]",
    labels: ["Batas pemesanan", "Estimasi kedatangan"],
    content: `<section class="card frame-form">
      <form class="form-card admin-catalog-detail-form">
        <div class="form-grid form-grid-wide catalog-settings-grid">
          <label class="field"><span class="field-label">Nama</span><input class="input" value="September" /></label>
          ${field("Batas pemesanan", "date", "2026-09-30", "Customer dapat melakukan preorder sampai tanggal ini.")}
          ${field("Estimasi kedatangan", "month", "2026-10", "Bulan dan tahun perkiraan tiba untuk Customer.")}
        </div>
        <label class="field"><span class="field-label">Deskripsi</span><textarea class="textarea">Katalog September</textarea></label>
        <div class="form-actions"><button class="button button-primary" type="button">Simpan</button></div>
      </form>
    </section>`,
  },
  {
    route: "/admin/batches",
    labels: ["Deadline PO", "ETA Cargo"],
    content: `<section class="card">
      <form class="form-card admin-batch-create-form">
        <div class="form-grid">
          <label class="field"><span class="field-label">Nama</span><input class="input" value="September" /></label>
          <label class="field"><span class="field-label">Kode referensi</span><input class="input" value="BFG-BAT-001" /></label>
          ${field("Deadline PO", "date", "2026-09-01", "Batas finalisasi roster dan jumlah pembelian sebelum PO dikunci.")}
          ${field("ETA Cargo", "month", "2026-10", "Estimasi tiba dalam format bulan dan tahun.")}
        </div>
        <label class="field"><span class="field-label">Deskripsi</span><textarea class="textarea">September cycle</textarea></label>
        <div class="form-actions"><button class="button button-primary" type="button">Buat batch</button></div>
      </form>
    </section>`,
  },
  {
    route: "/admin/batches/[batchId]",
    labels: ["Deadline PO", "Bulan ETA Cargo"],
    content: `<section class="card">
      <form class="form-card">
        <div class="form-grid">
          <label class="field"><span class="field-label">Nama</span><input class="input" value="September" /></label>
          ${field("Deadline PO", "date", "2026-09-01", "Batas finalisasi roster dan jumlah pembelian sebelum PO dikunci.")}
        </div>
        <label class="field"><span class="field-label">Deskripsi</span><textarea class="textarea">September cycle</textarea></label>
        <div class="form-actions"><button class="button button-primary" type="button">Simpan informasi Batch</button></div>
      </form>
    </section>
    <section class="card">
      <form class="form-actions">
        ${field("Bulan ETA Cargo", "month", "2026-10")}
        <button class="button button-primary" type="button">Simpan ETA Cargo</button>
      </form>
    </section>`,
  },
  {
    route: "/admin/reports",
    labels: ["Dari", "Sampai"],
    content: `<section class="card admin-book-filters">
      ${field("Dari", "date", "2026-09-01")}
      ${field("Sampai", "date", "2026-09-30")}
      <label class="field"><span class="field-label">Cari pesanan</span><input class="input" type="search" value="" /></label>
    </section>`,
  },
  {
    route: "/admin/catalogs/[catalogId]/access",
    labels: ["Berlaku sampai (opsional)", "Berlaku sampai"],
    content: `<section class="card frame-form">
      <div class="catalog-access-code-form">
        ${field("Berlaku sampai (opsional)", "datetime-local", "2026-09-30T18:00")}
        <div class="action-group"><button class="button button-primary" type="button">Buat kode akses</button></div>
      </div>
    </section>
    <section class="card frame-list">
      <form class="form-actions catalog-member-form">
        <label class="field"><span class="field-label">Pelanggan</span><select class="select"><option>Pilih pelanggan</option></select></label>
        ${field("Berlaku sampai", "datetime-local", "2026-09-30T18:00")}
        <button class="button button-primary" type="button">Berikan akses</button>
      </form>
    </section>`,
  },
].map((fixture) => ({ ...fixture, content: routeFrame(fixture.route, fixture.content) }));

test.describe("@native-control Admin temporal control geometry", () => {
  test("contains every Admin date/month-style control inside its field and card", async ({ page }, testInfo) => {
    test.slow();

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}</style>${routeFixtures
          .map(({ content }) => content)
          .join("")}`,
      );
      await page.evaluate(() => document.fonts?.ready);

      const measurements = await page.locator("[data-geometry-route]").evaluateAll((routes) => {
        const rect = (element: Element) => {
          const box = (element as HTMLElement).getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
        };
        const contentRect = (element: HTMLElement) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            left: box.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft),
            right: box.right - Number.parseFloat(style.borderRightWidth) - Number.parseFloat(style.paddingRight),
          };
        };

        return routes.map((routeRoot) => {
          const controls = [
            ...routeRoot.querySelectorAll<HTMLInputElement>(
              'input.input[type="date"], input.input[type="month"], input.input[type="datetime-local"]',
            ),
          ].map((control) => {
            const fieldElement = control.closest<HTMLElement>(".field");
            const cardElement = control.closest<HTMLElement>(".card");
            if (!fieldElement || !cardElement) throw new Error("Temporal control lost its Field/Card owner");
            return {
              label: fieldElement.querySelector(".field-label")?.textContent?.trim(),
              type: control.getAttribute("type"),
              control: rect(control),
              field: contentRect(fieldElement),
              card: contentRect(cardElement),
              appearance: getComputedStyle(control).appearance,
              webkitAppearance: getComputedStyle(control).webkitAppearance,
              boxSizing: getComputedStyle(control).boxSizing,
            };
          });
          const fields = [...routeRoot.querySelectorAll<HTMLElement>(".field")].map((fieldElement) => ({
            label: fieldElement.querySelector(".field-label")?.textContent?.trim(),
            box: rect(fieldElement),
          }));
          const overlaps: string[] = [];
          for (let first = 0; first < fields.length; first += 1) {
            for (let second = first + 1; second < fields.length; second += 1) {
              const left = Math.max(fields[first].box.left, fields[second].box.left);
              const right = Math.min(fields[first].box.right, fields[second].box.right);
              const top = Math.max(fields[first].box.top, fields[second].box.top);
              const bottom = Math.min(fields[first].box.bottom, fields[second].box.bottom);
              if (right - left > 1 && bottom - top > 1) {
                overlaps.push(`${fields[first].label}/${fields[second].label}`);
              }
            }
          }

          return {
            route: routeRoot.dataset.geometryRoute,
            controls,
            fieldOverlaps: overlaps,
          };
        });
      });

      const expectedControls = routeFixtures.flatMap(({ route, labels }) => labels.map((label) => ({ route, label })));
      const actualControls = measurements.flatMap(({ route, controls }) =>
        controls.map(({ label }) => ({ route, label })),
      );
      expect(actualControls, `${viewport.width}px control inventory`).toEqual(expectedControls);

      for (const routeMeasurement of measurements) {
        expect(routeMeasurement.fieldOverlaps, `${viewport.width}px ${routeMeasurement.route} field overlap`).toEqual(
          [],
        );
        for (const control of routeMeasurement.controls) {
          const tolerance = 1;
          expect(control.type, `${viewport.width}px ${routeMeasurement.route} ${control.label} type`).toMatch(
            /^(date|month|datetime-local)$/,
          );
          expect(control.appearance, `${viewport.width}px ${routeMeasurement.route} ${control.label} appearance`).toBe(
            "none",
          );
          expect(
            control.webkitAppearance,
            `${viewport.width}px ${routeMeasurement.route} ${control.label} WebKit appearance`,
          ).toBe("none");
          expect(control.boxSizing, `${viewport.width}px ${routeMeasurement.route} ${control.label} box sizing`).toBe(
            "border-box",
          );
          expect(
            control.control.left,
            `${viewport.width}px ${routeMeasurement.route} ${control.label} left`,
          ).toBeGreaterThanOrEqual(control.field.left - tolerance);
          expect(
            control.control.right,
            `${viewport.width}px ${routeMeasurement.route} ${control.label} field right`,
          ).toBeLessThanOrEqual(control.field.right + tolerance);
          expect(
            control.control.right,
            `${viewport.width}px ${routeMeasurement.route} ${control.label} card right`,
          ).toBeLessThanOrEqual(control.card.right + tolerance);
          expect(
            control.control.width,
            `${viewport.width}px ${routeMeasurement.route} ${control.label} width`,
          ).toBeLessThanOrEqual(control.field.right - control.field.left + tolerance);
        }
      }

      const documentWidth = await page.evaluate(() =>
        Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      );
      expect(documentWidth, `${viewport.width}px page overflow`).toBeLessThanOrEqual(viewport.width + 1);
      await page.screenshot({
        path: testInfo.outputPath(`admin-native-control-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });
});
