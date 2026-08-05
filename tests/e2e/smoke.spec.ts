import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/community",
  "/how-to-order",
  "/help",
  "/ready-stock",
  "/catalog",
  "/account/orders",
  "/account/invoices",
  "/admin",
  "/admin/catalogs",
  "/admin/orders",
  "/admin/invoices",
];

const screenshotRoutes = new Set(["/", "/catalog", "/admin"]);

test.describe("BFG public route smoke", () => {
  for (const route of routes) {
    test(`${route} renders without browser errors`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `${route} response`).toBeLessThan(400);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Blessing For Goods home" }).getByRole("img")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => window.innerWidth + 1),
      );

      if (screenshotRoutes.has(route)) {
        await page.screenshot({
          path: `artifacts/browser-qa/${testInfo.project.name}-${route === "/" ? "home" : route.slice(1)}.png`,
          fullPage: true,
        });
      }

      expect(consoleErrors, `${route} console errors`).toEqual([]);
      expect(pageErrors, `${route} page errors`).toEqual([]);
    });
  }
});

test("primary navigation exposes working customer destinations", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const links = await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link")
    .evaluateAll((items) =>
      items.map((item) => ({
        href: (item as HTMLAnchorElement).getAttribute("href"),
        label: item.textContent?.trim(),
      })),
    );
  expect(links.map((link) => link.label)).toEqual(["Home", "Catalog", "Ready Stock", "Orders", "Account"]);

  for (const link of links) {
    if (!link.href) continue;
    const response = await page.goto(link.href, { waitUntil: "networkidle" });
    expect(response?.status(), `${link.label} (${link.href}) response`).toBeLessThan(400);
    await expect(page.locator("h1")).toHaveCount(1);
  }
});
