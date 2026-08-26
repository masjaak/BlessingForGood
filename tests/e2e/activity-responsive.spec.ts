import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const successMascot = readFileSync("public/brand/mascot/Mascott-3.png").toString("base64");

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

async function mountActivityFixture(
  page: Page,
  state: ActivityFixtureState = "mixed",
  workspace: "admin" | "customer" = "admin",
) {
  await page.setContent(`<style>${globalsCss}</style><main></main>`);
  await page.evaluate(
    ({ longMessage, longReference, state, workspace }) => {
      const panelWidth = Math.min(410, window.innerWidth - 24);
      const panelLeft = window.innerWidth - panelWidth - 12;
      const count = state === "empty" ? 0 : state === "mixed" ? 3 : 1;
      const unreadCount = state === "unread" || state === "mixed" ? 1 : 0;
      const rows = Array.from({ length: count }, (_, index) => {
        const isUnread = state === "unread" || (state === "mixed" && index === 0);
        const hasLongReference = state === "mixed" && index === 1;
        return `
                    <li><a class="activity-preview-row ${isUnread ? "is-unread" : "is-read"}" data-read-state="${isUnread ? "unread" : "read"}" href="#">
                      <span class="activity-preview-row-meta"><span><span class="activity-type">${hasLongReference ? "Pesan BFG" : "Sistem"}</span>${isUnread ? '<span class="activity-preview-unread"><span class="activity-unread-dot"></span><span>Baru · Belum dibaca</span></span>' : ""}</span><time>21/08/2026, 12:34:56</time></span>
                      <strong class="activity-preview-row-title">${isUnread ? "Konfirmasi pembayaran baru" : hasLongReference ? `Pembaruan ${longReference}` : "Pembaruan inventaris berhasil"}</strong>
                      <span class="activity-preview-row-description">${isUnread ? longMessage : hasLongReference ? `Pesan lengkap ${longReference} tetap dapat dibaca sampai selesai.` : "Pembaruan sistem berhasil diproses."}</span>
                    </a></li>
                  `;
      }).join("");
      const mount = document.createElement("div");
      mount.className = `${workspace}-shell activity-qa-fixture`;
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
                  ${rows ? `<ul class="activity-preview-list">${rows}</ul>` : '<div class="empty-state"><strong>Belum ada aktivitas</strong><p>Pembaruan sistem dan pesan operasional BFG akan tampil di sini.</p></div>'}
                </div>
                <a class="activity-panel-footer" href="#">Lihat semua aktivitas</a>
              </div>
        </div>
      </div>
    `;
      document.body.append(mount);
    },
    { longMessage, longReference, state, workspace },
  );
}

test.describe("@activity Activity responsive geometry", () => {
  test("keeps the populated Activity surface inside every supported viewport", async ({ page }, testInfo) => {
    for (const workspace of ["admin", "customer"] as const) {
      for (const viewport of viewportMatrix) {
        await page.setViewportSize(viewport);
        await mountActivityFixture(page, "mixed", workspace);

        const geometry = await page.locator(".activity-qa-fixture").evaluate((fixture) => {
          const panel = fixture.querySelector<HTMLElement>(".workspace-activity-panel");
          const content = fixture.querySelector<HTMLElement>(".activity-panel-content");
          const rows = [...fixture.querySelectorAll<HTMLElement>(".activity-preview-row")];
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
            rows: rows.map((row) => {
              const rect = row.getBoundingClientRect();
              const body = row.querySelector<HTMLElement>(".activity-preview-row-description");
              return {
                left: rect.left,
                right: rect.right,
                width: rect.width,
                clientWidth: row.clientWidth,
                scrollWidth: row.scrollWidth,
                clientHeight: row.clientHeight,
                scrollHeight: row.scrollHeight,
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

        expect(geometry.panel.left, `${workspace} ${viewport.width}px panel left`).toBeGreaterThanOrEqual(0);
        expect(geometry.panel.right, `${workspace} ${viewport.width}px panel right`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
        expect(geometry.panel.top, `${workspace} ${viewport.width}px panel top`).toBeGreaterThanOrEqual(0);
        expect(geometry.panel.bottom, `${workspace} ${viewport.width}px panel bottom`).toBeLessThanOrEqual(
          viewport.height + 1,
        );
        expect(geometry.panel.scrollWidth, `${workspace} ${viewport.width}px panel horizontal scroll`).toBe(
          geometry.panel.clientWidth,
        );
        expect(geometry.panel.scrollHeight, `${workspace} ${viewport.width}px panel vertical scroll`).toBe(
          geometry.panel.clientHeight,
        );
        expect(
          await page
            .locator(".activity-qa-fixture .workspace-activity-panel")
            .evaluate((panel) => getComputedStyle(panel).maxHeight),
        ).toBe("none");
        expect(
          await page
            .locator(".activity-qa-fixture .content-stack")
            .evaluate((list) => getComputedStyle(list).overflowY),
        ).not.toMatch(/auto|scroll/);
        expect(geometry.content.left, `${workspace} ${viewport.width}px content left`).toBeGreaterThanOrEqual(
          geometry.panel.left,
        );
        expect(geometry.content.right, `${workspace} ${viewport.width}px content right`).toBeLessThanOrEqual(
          geometry.panel.right + 1,
        );
        expect(await page.locator(".activity-qa-fixture .activity-card")).toHaveCount(0);
        expect(await page.locator(".activity-qa-fixture .activity-preview-row")).toHaveCount(3);
        for (const row of geometry.rows) {
          expect(row.left, `${workspace} ${viewport.width}px row left`).toBeGreaterThanOrEqual(geometry.panel.left);
          expect(row.right, `${workspace} ${viewport.width}px row right`).toBeLessThanOrEqual(geometry.panel.right + 1);
          expect(row.scrollWidth, `${workspace} ${viewport.width}px row horizontal scroll`).toBe(row.clientWidth);
          expect(row.scrollHeight, `${workspace} ${viewport.width}px row vertical clipping`).toBe(row.clientHeight);
          expect(row.bodyScrollWidth, `${workspace} ${viewport.width}px notification body horizontal overflow`).toBe(
            row.bodyClientWidth,
          );
        }
        expect(geometry.bodyScrollWidth, `${workspace} ${viewport.width}px body overflow`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
        expect(geometry.documentScrollWidth, `${workspace} ${viewport.width}px document overflow`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
        await expect(page.locator(".activity-panel-heading .subtle")).toContainText("1 belum dibaca");
        await expect(page.locator('[data-read-state="unread"]')).toHaveCount(1);
        await expect(page.locator('[data-read-state="read"]')).toHaveCount(2);
        await expect(page.locator(".activity-preview-row").first()).toContainText(longMessage);
        await expect(page.locator(".activity-preview-row").nth(1)).toContainText(longReference);
        if ([390, 1440].includes(viewport.width)) {
          await page.screenshot({ path: testInfo.outputPath(`activity-${workspace}-${viewport.width}.png`) });
        }
      }
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

  test("keeps the Join success mascot outside the success copy", async ({ page }, testInfo) => {
    for (const viewport of viewportMatrix.filter((item) => [375, 390, 430, 768, 1024, 1440].includes(item.width))) {
      await page.setViewportSize(viewport);
      await page.setContent(`
        <style>${globalsCss}</style>
        <div class="customer-shell">
          <main>
            <div class="page narrow-page">
              <section class="card success-card join-success-card">
                <img class="brand-mascot success-mascot" src="data:image/png;base64,${successMascot}" alt="" />
                <div class="join-success-content">
                  <span class="card-kicker">Permintaan diterima</span>
                  <h2>Permintaanmu sudah dikirim.</h2>
                  <p>Tim BFG akan meninjaunya terlebih dahulu.</p>
                  <p class="success-banner">Permintaanmu sudah kami terima.</p>
                  <div class="actions"><a class="button button-secondary" href="#">Kembali</a></div>
                </div>
              </section>
            </div>
          </main>
        </div>
      `);

      const geometry = await page.locator(".join-success-card").evaluate((card) => {
        const mascot = card.querySelector<HTMLElement>(".success-mascot");
        const headline = card.querySelector<HTMLElement>("h2");
        const body = card.querySelector<HTMLElement>(".join-success-content > p");
        const actions = card.querySelector<HTMLElement>(".actions");
        if (!mascot || !headline || !body || !actions) throw new Error("Join success fixture did not render");
        const box = (element: HTMLElement) => {
          const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
          return { left, right, top, bottom, width, height };
        };
        return {
          mascot: box(mascot),
          headline: box(headline),
          body: box(body),
          actions: box(actions),
          contentScrollWidth: card.querySelector<HTMLElement>(".join-success-content")?.scrollWidth,
          contentClientWidth: card.querySelector<HTMLElement>(".join-success-content")?.clientWidth,
        };
      });

      const overlaps = (
        left: { left: number; right: number; top: number; bottom: number },
        right: { left: number; right: number; top: number; bottom: number },
      ) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
      expect(overlaps(geometry.mascot, geometry.headline), `${viewport.width}px mascot/headline overlap`).toBe(false);
      expect(overlaps(geometry.mascot, geometry.body), `${viewport.width}px mascot/body overlap`).toBe(false);
      expect(overlaps(geometry.mascot, geometry.actions), `${viewport.width}px mascot/actions overlap`).toBe(false);
      expect(geometry.mascot.width).toBeGreaterThanOrEqual(viewport.width <= 640 ? 132 : 168);
      if (viewport.width <= 640) {
        expect(geometry.mascot.top, `${viewport.width}px mascot lower art row`).toBeGreaterThan(
          geometry.actions.bottom,
        );
      } else {
        expect(geometry.mascot.bottom, `${viewport.width}px mascot reaches lower content rhythm`).toBeGreaterThan(
          geometry.body.bottom,
        );
      }
      expect(geometry.contentScrollWidth).toBe(geometry.contentClientWidth);
      await expect(page.locator(".join-success-card h2")).toBeVisible();
      await expect(page.locator(".join-success-card p").first()).toBeVisible();
      if ([375, 390, 430, 1440].includes(viewport.width)) {
        await page.screenshot({ path: testInfo.outputPath(`join-success-${viewport.width}.png`) });
      }
    }
  });

  test("gives approved feedback semantic top and bottom spacing", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`
      <style>${globalsCss}</style>
      <div class="admin-shell">
        <div class="admin-content approved-feedback-qa">
          <section class="card join-request-card">
            <div class="summary-line"><span>Dikirim</span><span>22/08/2026</span></div>
            <div class="content-stack approved-feedback-section">
              <p class="success-banner">Disetujui. Buat undangan Clerk secara manual untuk identitas baru.</p>
            </div>
            <p class="subtle review-metadata">Ditinjau 22/08/2026</p>
          </section>
        </div>
      </div>
    `);

    const geometry = await page.locator(".approved-feedback-qa").evaluate((fixture) => {
      const divider = fixture.querySelector<HTMLElement>(".summary-line");
      const feedback = fixture.querySelector<HTMLElement>(".approved-feedback-section .success-banner");
      const metadata = fixture.querySelector<HTMLElement>(".review-metadata");
      if (!divider || !feedback || !metadata) throw new Error("Approved feedback fixture did not render");
      const rect = (element: HTMLElement) => element.getBoundingClientRect();
      return {
        topGap: rect(feedback).top - rect(divider).bottom,
        bottomGap: rect(metadata).top - rect(feedback).bottom,
      };
    });

    expect(geometry.topGap).toBeGreaterThanOrEqual(16);
    expect(geometry.topGap).toBeLessThanOrEqual(20);
    expect(geometry.bottomGap).toBeGreaterThanOrEqual(16);
    expect(geometry.bottomGap).toBeLessThanOrEqual(20);
    await page.screenshot({ path: testInfo.outputPath("approved-feedback-1440.png") });
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
