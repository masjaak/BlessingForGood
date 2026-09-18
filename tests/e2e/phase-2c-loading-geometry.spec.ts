import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const viewportMatrix = [320, 375, 390, 430, 768, 1024, 1440];
const skeletonText = (width: string) => `<span class="bfg-skeleton bfg-skeleton-text" style="width:${width}"></span>`;

function batchTable() {
  return `
    <section class="card workspace-skeleton-batch-table-panel">
      <div class="table-wrap workspace-skeleton-batch-table">
        <div class="workspace-skeleton-table-head">${skeletonText("20%")}${skeletonText("18%")}${skeletonText("16%")}${skeletonText("12%")}</div>
        <div class="skeleton-table">${Array.from(
          { length: 6 },
          () =>
            `<div class="skeleton-table-row">${skeletonText("32%")}${skeletonText("18%")}${skeletonText("22%")}${skeletonText("12%")}</div>`,
        ).join("")}</div>
      </div>
    </section>`;
}

const batchFixture = `
  <main class="admin-shell">
    <div class="admin-content" style="width:calc(100vw - 32px);margin:0 auto">
      <div class="loading-region">
        <section class="card workspace-skeleton-form"></section>
        <section class="card workspace-skeleton-panel"></section>
        <section class="card workspace-skeleton-panel"></section>
        ${batchTable()}
        <section class="card workspace-skeleton-panel"></section>
        ${batchTable()}
        <section class="card workspace-skeleton-panel"></section>
        <section class="card workspace-skeleton-panel"></section>
        <section class="card workspace-skeleton-panel"></section>
      </div>
    </div>
  </main>`;

function depositTopUpRow() {
  return `
    <div class="summary-line deposit-topup-row workspace-skeleton-deposit-topup-row">
      <span class="deposit-topup-summary workspace-skeleton-deposit-topup-summary">${skeletonText("76%")}${skeletonText("58%")}</span>
      <span class="form-actions deposit-topup-actions">
        <span class="bfg-skeleton deposit-skeleton-action"></span>
        <span class="bfg-skeleton deposit-skeleton-status"></span>
        <span class="bfg-skeleton deposit-skeleton-action"></span>
      </span>
    </div>`;
}

function historyRow() {
  return `
    <div class="deposit-history-row">
      <div class="deposit-history-primary">${skeletonText("88%")}${skeletonText("76%")}${skeletonText("52%")}</div>
      <div class="deposit-history-amount">${skeletonText("62%")}${skeletonText("86%")}</div>
      <div class="deposit-history-description">${skeletonText("72%")}${skeletonText("94%")}</div>
      <div class="deposit-history-context">${skeletonText("84%")}${skeletonText("78%")}${skeletonText("88%")}</div>
    </div>`;
}

const depositsFixture = `
  <main class="admin-shell">
    <div class="admin-content" style="width:calc(100vw - 32px);margin:0 auto">
      <section class="card deposit-topup-card">
        <div class="loading-region">${depositTopUpRow()}${depositTopUpRow()}${depositTopUpRow()}</div>
      </section>
      <section class="card deposit-history-card">
        <div class="loading-region">
          <div class="deposit-history-list workspace-skeleton-deposit-history">
            <div class="deposit-history-heading">${skeletonText("78%")}${skeletonText("72%")}${skeletonText("74%")}${skeletonText("68%")}</div>
            ${Array.from({ length: 5 }, historyRow).join("")}
          </div>
        </div>
      </section>
    </div>
  </main>`;

async function setFixture(page: Page, fixture: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(
    `<meta name="viewport" content="width=device-width, initial-scale=1" /><style>${globalsCss}</style>${fixture}`,
  );
}

test.describe("@admin Phase 2C loading geometry", () => {
  test("keeps Batch Detail loading regions aligned and contained", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the loading matrix once.");

    for (const width of viewportMatrix) {
      await setFixture(page, batchFixture, width);
      const geometry = await page.locator(".admin-content").evaluate((content) => {
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        };
        const tables = [...content.querySelectorAll<HTMLElement>(".workspace-skeleton-batch-table")];
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          content: box(content),
          cards: content.querySelectorAll(".loading-region > .card").length,
          tableScrollWidths: tables.map((table) => ({
            scrollWidth: table.scrollWidth,
            clientWidth: table.clientWidth,
          })),
        };
      });

      expect(geometry.cards, `${width}px Batch card count`).toBe(9);
      expect(geometry.documentWidth, `${width}px page overflow`).toBeLessThanOrEqual(width + 1);
      expect(geometry.content.right, `${width}px content containment`).toBeLessThanOrEqual(width + 1);
      for (const table of geometry.tableScrollWidths) {
        expect(table.scrollWidth, `${width}px table min-width contract`).toBeGreaterThanOrEqual(700);
      }
    }
  });

  test("keeps Deposit queue and history rows on the resolved responsive rails", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "admin-1440") test.skip(true, "Run the loading matrix once.");

    for (const width of viewportMatrix) {
      await setFixture(page, depositsFixture, width);
      const geometry = await page.locator(".admin-content").evaluate((content) => {
        const rows = [...content.querySelectorAll<HTMLElement>(".deposit-topup-row")];
        const historyRows = [...content.querySelectorAll<HTMLElement>(".deposit-history-row")];
        const rect = (element: Element) => {
          const bounds = element.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
        };
        const gridTracks = (element: HTMLElement) => getComputedStyle(element).gridTemplateColumns.split(" ").length;
        return {
          documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          topUp: rows.map((row) => {
            const summary = row.querySelector<HTMLElement>(".deposit-topup-summary")!;
            const actions = row.querySelector<HTMLElement>(".deposit-topup-actions")!;
            return { summary: rect(summary), actions: rect(actions), tracks: gridTracks(row) };
          }),
          historyTracks: historyRows.map(gridTracks),
        };
      });

      expect(geometry.documentWidth, `${width}px page overflow`).toBeLessThanOrEqual(width + 1);
      for (const row of geometry.topUp) {
        if (width <= 640) expect(row.actions.top).toBeGreaterThanOrEqual(row.summary.bottom - 1);
        else expect(row.summary.right).toBeLessThanOrEqual(row.actions.left + 1);
      }
      const expectedHistoryTracks = width <= 640 ? 1 : width <= 900 ? 2 : 4;
      expect(geometry.historyTracks, `${width}px history columns`).toEqual(
        Array.from({ length: 5 }, () => expectedHistoryTracks),
      );
    }
  });
});
