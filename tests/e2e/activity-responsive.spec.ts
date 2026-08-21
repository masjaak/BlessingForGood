import { expect, test, type Page } from "@playwright/test";

const viewportMatrix = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 834, height: 900 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const longReference = "BFG-202608-M576XVKCXZBXSAJXZVXMJWVX118CQD87";
const longExplanation =
  "Sistem dan pesan BFG tampil dalam satu urutan waktu. Makna dan riwayat sumbernya tetap terjaga.";

async function mountActivityFixture(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ longExplanation, longReference }) => {
      const panelWidth = Math.min(380, window.innerWidth - 24);
      const panelLeft = window.innerWidth - panelWidth - 12;
      const mount = document.createElement("div");
      mount.className = "admin-shell activity-qa-fixture";
      mount.style.cssText = "position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none;";
      mount.innerHTML = `
      <div class="workspace-activity" style="position: absolute; top: 12px; left: 0; width: 100%; height: 40px; pointer-events: auto;">
        <button aria-expanded="true" class="workspace-activity-trigger" type="button">
          <span>Aktivitas</span>
        </button>
        <div aria-label="Aktivitas" class="workspace-activity-panel" role="dialog" style="top: 48px; left: ${panelLeft}px; right: auto; width: ${panelWidth}px; max-height: min(560px, calc(100dvh - 72px));">
              <div class="activity-panel-content">
                <div class="activity-panel-heading">
                  <div><strong>Aktivitas</strong><span class="subtle">Pembaruan terbaru</span></div>
                  <button aria-label="Tutup Aktivitas" class="activity-panel-close" type="button">×</button>
                </div>
                <p class="activity-explanation">${longExplanation}</p>
                <div class="content-stack">
                  ${Array.from(
                    { length: 3 },
                    (_, index) => `
                    <section class="card activity-card">
                      <div class="activity-card-topline"><span class="activity-type">${index === 1 ? "Pesan BFG" : "Sistem"}</span><time>21/08/2026, 12:34:56</time></div>
                      <h2>${index === 0 ? "Konfirmasi pembayaran baru" : `Pembaruan ${longReference}`}</h2>
                      <p>${index === 0 ? `Konfirmasi pembayaran untuk ${longReference} memerlukan pemeriksaan.` : `${longExplanation} Referensi ${longReference} tetap terkait dengan akunmu.`}</p>
                      <a class="button button-secondary" href="#">Buka detail</a>
                    </section>
                  `,
                  ).join("")}
                </div>
                <a class="activity-panel-footer" href="#">Lihat semua aktivitas</a>
              </div>
        </div>
      </div>
    `;
      document.body.append(mount);
    },
    { longExplanation, longReference },
  );
}

test.describe("@activity Activity responsive geometry", () => {
  test("keeps the populated Activity surface inside every supported viewport", async ({ page }) => {
    for (const viewport of viewportMatrix) {
      await page.setViewportSize(viewport);
      await mountActivityFixture(page);

      const geometry = await page.locator(".activity-qa-fixture").evaluate((fixture) => {
        const panel = fixture.querySelector<HTMLElement>(".workspace-activity-panel");
        const content = fixture.querySelector<HTMLElement>(".activity-panel-content");
        const cards = [...fixture.querySelectorAll<HTMLElement>(".activity-card")];
        if (!panel || !content) throw new Error("Activity fixture did not render");
        const panelRect = panel.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        return {
          panel: {
            left: panelRect.left,
            right: panelRect.right,
            top: panelRect.top,
            bottom: panelRect.bottom,
            clientWidth: panel.clientWidth,
            scrollWidth: panel.scrollWidth,
            scrollHeight: panel.scrollHeight,
            clientHeight: panel.clientHeight,
          },
          content: { left: contentRect.left, right: contentRect.right },
          cards: cards.map((card) => {
            const rect = card.getBoundingClientRect();
            return {
              left: rect.left,
              right: rect.right,
              width: rect.width,
              clientWidth: card.clientWidth,
              scrollWidth: card.scrollWidth,
              clientHeight: card.clientHeight,
              scrollHeight: card.scrollHeight,
            };
          }),
          bodyScrollWidth: document.body.scrollWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        };
      });

      expect(geometry.panel.left, `${viewport.width}px panel left`).toBeGreaterThanOrEqual(0);
      expect(geometry.panel.right, `${viewport.width}px panel right`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.panel.top, `${viewport.width}px panel top`).toBeGreaterThanOrEqual(0);
      expect(geometry.panel.bottom, `${viewport.width}px panel bottom`).toBeLessThanOrEqual(viewport.height + 1);
      expect(geometry.panel.scrollWidth, `${viewport.width}px panel horizontal scroll`).toBe(
        geometry.panel.clientWidth,
      );
      expect(geometry.content.left, `${viewport.width}px content left`).toBeGreaterThanOrEqual(geometry.panel.left);
      expect(geometry.content.right, `${viewport.width}px content right`).toBeLessThanOrEqual(geometry.panel.right + 1);
      for (const card of geometry.cards) {
        expect(card.left, `${viewport.width}px card left`).toBeGreaterThanOrEqual(geometry.panel.left);
        expect(card.right, `${viewport.width}px card right`).toBeLessThanOrEqual(geometry.panel.right + 1);
        expect(card.scrollWidth, `${viewport.width}px card horizontal scroll`).toBe(card.clientWidth);
        expect(card.scrollHeight, `${viewport.width}px card vertical clipping`).toBe(card.clientHeight);
      }
      expect(geometry.bodyScrollWidth, `${viewport.width}px body overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.documentScrollWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      await expect(page.locator(".activity-explanation")).toContainText(longExplanation);
      await expect(page.locator(".activity-card").nth(1)).toContainText(longReference);
    }
  });
});
