import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

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
const longMessage =
  "Angelina Cynthia mengirim permintaan bergabung dengan catatan operasional lengkap untuk ditinjau Admin.";

type ActivityFixtureState = "empty" | "unread" | "read" | "mixed";

async function mountActivityFixture(page: Page, state: ActivityFixtureState = "mixed") {
  await page.setContent(`<style>${globalsCss}</style><main></main>`);
  await page.evaluate(
    ({ longMessage, longReference, state }) => {
      const panelWidth = Math.min(410, window.innerWidth - 24);
      const panelLeft = window.innerWidth - panelWidth - 12;
      const count = state === "empty" ? 0 : state === "mixed" ? 3 : 1;
      const unreadCount = state === "unread" || state === "mixed" ? 1 : 0;
      const rows = Array.from({ length: count }, (_, index) => {
        const isUnread = state === "unread" || (state === "mixed" && index === 0);
        const hasLongReference = state === "mixed" && index === 1;
        return `
                    <section class="card activity-card ${isUnread ? "is-unread" : "is-read"}" data-read-state="${isUnread ? "unread" : "read"}">
                      <div class="activity-card-topline"><span class="activity-type-group"><span class="activity-type">${hasLongReference ? "Pesan BFG" : "Sistem"}</span>${isUnread ? '<span class="activity-unread-marker"><span class="activity-unread-dot"></span><span>Baru · Belum dibaca</span></span>' : ""}</span><time>21/08/2026, 12:34:56</time></div>
                      <h2 class="${isUnread ? "activity-title-unread" : ""}">${isUnread ? "Konfirmasi pembayaran baru" : hasLongReference ? `Pembaruan ${longReference}` : "Pembaruan inventaris berhasil"}</h2>
                      <p>${isUnread ? longMessage : hasLongReference ? `Pesan lengkap ${longReference} tetap dapat dibaca sampai selesai.` : "Pembaruan sistem berhasil diproses."}</p>
                    </section>
                  `;
      }).join("");
      const mount = document.createElement("div");
      mount.className = "admin-shell activity-qa-fixture";
      mount.style.cssText = "position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none;";
      mount.innerHTML = `
      <div class="workspace-activity" style="position: absolute; top: 12px; left: 0; width: 100%; height: 40px; pointer-events: auto;">
        <button aria-expanded="true" class="workspace-activity-trigger" type="button">
          <span>Aktivitas</span>
        </button>
        <div aria-label="Aktivitas" class="workspace-activity-panel" role="dialog" style="top: 48px; left: ${panelLeft}px; right: auto; width: ${panelWidth}px;">
              <div class="activity-panel-content">
                <div class="activity-panel-heading">
                  <div><strong>Aktivitas</strong><span class="subtle">${unreadCount} belum dibaca</span></div>
                  <button aria-label="Tutup Aktivitas" class="activity-panel-close" type="button">×</button>
                </div>
                <div class="content-stack">
                  ${rows || '<div class="empty-state"><strong>Belum ada aktivitas</strong><p>Pembaruan sistem dan pesan operasional BFG akan tampil di sini.</p></div>'}
                </div>
                <a class="activity-panel-footer" href="#">Lihat semua aktivitas</a>
              </div>
        </div>
      </div>
    `;
      document.body.append(mount);
    },
    { longMessage, longReference, state },
  );
}

test.describe("@activity Activity responsive geometry", () => {
  test("keeps the populated Activity surface inside every supported viewport", async ({ page }, testInfo) => {
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
            const body = card.querySelector<HTMLElement>("p");
            return {
              left: rect.left,
              right: rect.right,
              width: rect.width,
              clientWidth: card.clientWidth,
              scrollWidth: card.scrollWidth,
              clientHeight: card.clientHeight,
              scrollHeight: card.scrollHeight,
              bodyClientWidth: body?.clientWidth ?? 0,
              bodyScrollWidth: body?.scrollWidth ?? 0,
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
      expect(geometry.panel.scrollHeight, `${viewport.width}px panel vertical scroll`).toBe(
        geometry.panel.clientHeight,
      );
      expect(
        await page
          .locator(".activity-qa-fixture .workspace-activity-panel")
          .evaluate((panel) => getComputedStyle(panel).maxHeight),
      ).toBe("none");
      expect(
        await page.locator(".activity-qa-fixture .content-stack").evaluate((list) => getComputedStyle(list).overflowY),
      ).not.toMatch(/auto|scroll/);
      expect(geometry.content.left, `${viewport.width}px content left`).toBeGreaterThanOrEqual(geometry.panel.left);
      expect(geometry.content.right, `${viewport.width}px content right`).toBeLessThanOrEqual(geometry.panel.right + 1);
      for (const card of geometry.cards) {
        expect(card.left, `${viewport.width}px card left`).toBeGreaterThanOrEqual(geometry.panel.left);
        expect(card.right, `${viewport.width}px card right`).toBeLessThanOrEqual(geometry.panel.right + 1);
        expect(card.scrollWidth, `${viewport.width}px card horizontal scroll`).toBe(card.clientWidth);
        expect(card.scrollHeight, `${viewport.width}px card vertical clipping`).toBe(card.clientHeight);
        expect(card.bodyScrollWidth, `${viewport.width}px notification body horizontal overflow`).toBe(
          card.bodyClientWidth,
        );
      }
      expect(geometry.bodyScrollWidth, `${viewport.width}px body overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.documentScrollWidth, `${viewport.width}px document overflow`).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      await expect(page.locator(".activity-panel-heading .subtle")).toContainText("1 belum dibaca");
      await expect(page.locator('[data-read-state="unread"]')).toHaveCount(1);
      await expect(page.locator('[data-read-state="read"]')).toHaveCount(2);
      await expect(page.locator(".activity-card").first()).toContainText(longMessage);
      await expect(page.locator(".activity-card").nth(1)).toContainText(longReference);
      await page.screenshot({ path: testInfo.outputPath(`activity-${viewport.width}.png`) });
    }
  });

  test("renders empty, unread, and read preview states without overflow", async ({ page }, testInfo) => {
    const states: ActivityFixtureState[] = ["empty", "unread", "read"];
    const stateViewports = viewportMatrix.filter((viewport) => [375, 390, 430, 1440].includes(viewport.width));

    for (const state of states) {
      for (const viewport of stateViewports) {
        await page.setViewportSize(viewport);
        await mountActivityFixture(page, state);

        const geometry = await page.locator(".activity-qa-fixture .workspace-activity-panel").evaluate((panel) => {
          const rect = panel.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            clientWidth: panel.clientWidth,
            scrollWidth: panel.scrollWidth,
          };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom).toBeLessThanOrEqual(viewport.height + 1);
        expect(geometry.scrollWidth).toBe(geometry.clientWidth);
        expect(await page.locator('.activity-qa-fixture [data-read-state="unread"]').count()).toBe(
          state === "unread" ? 1 : 0,
        );
        expect(await page.locator('.activity-qa-fixture [data-read-state="read"]').count()).toBe(
          state === "read" ? 1 : 0,
        );
        await expect(page.locator(".activity-panel-heading .subtle")).toHaveText(
          state === "unread" ? "1 belum dibaca" : "0 belum dibaca",
        );
        if (state === "empty") await expect(page.locator(".activity-qa-fixture .empty-state")).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`activity-${state}-${viewport.width}.png`) });
      }
    }
  });

  test("keeps Join Request actions separate from feedback and the next card", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`
      <style>${globalsCss}</style>
      <div class="admin-shell">
        <div class="admin-content join-request-spacing-qa">
          <section class="card join-request-card">
            <div class="action-group"><button class="button button-primary">Setujui</button><button class="button button-danger">Tolak</button></div>
            <div class="action-region action-region-feedback"><p class="success-banner">Tinjauan dimulai.</p></div>
          </section>
          <section class="card"><strong>Permintaan berikutnya</strong></section>
        </div>
      </div>
    `);

    const geometry = await page.locator(".join-request-spacing-qa").evaluate((fixture) => {
      const card = fixture.querySelector<HTMLElement>(".join-request-card");
      const actions = card?.querySelector<HTMLElement>(".action-group");
      const feedback = card?.querySelector<HTMLElement>(".action-region-feedback");
      const next = fixture.querySelector<HTMLElement>(".join-request-card + .card");
      if (!card || !actions || !feedback || !next) throw new Error("Join spacing fixture did not render");
      const rect = (element: HTMLElement) => element.getBoundingClientRect();
      return {
        actionFeedbackGap: rect(feedback).top - rect(actions).bottom,
        feedbackNextGap: rect(next).top - rect(feedback).bottom,
        cardNextGap: rect(next).top - rect(card).bottom,
      };
    });

    expect(geometry.actionFeedbackGap).toBeGreaterThanOrEqual(15);
    expect(geometry.feedbackNextGap).toBeGreaterThanOrEqual(20);
    expect(geometry.cardNextGap).toBeGreaterThanOrEqual(23);
    await page.screenshot({ path: testInfo.outputPath("join-requests-spacing-1440.png") });
  });
});
