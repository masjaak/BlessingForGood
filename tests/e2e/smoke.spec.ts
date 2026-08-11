import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const customerRoutes = [
  "/",
  "/community",
  "/how-to-order",
  "/help",
  "/ready-stock",
  "/join",
  "/sign-in",
  "/sign-up",
  "/catalog",
  "/account",
  "/account/orders",
  "/account/invoices",
  "/account/profile",
  "/account/addresses",
];

const adminRoutes = [
  "/admin",
  "/admin/books",
  "/admin/catalogs",
  "/admin/join-requests",
  "/admin/orders",
  "/admin/batches",
  "/admin/invoices",
  "/admin/payments",
  "/admin/exceptions",
  "/admin/customers",
  "/admin/users",
];

const publicShellRoutes = new Set(["/", "/community", "/how-to-order", "/help", "/ready-stock", "/join"]);
const protectedRoutes = new Set([
  "/catalog",
  "/account",
  "/account/orders",
  "/account/invoices",
  "/account/profile",
  "/account/addresses",
  ...adminRoutes,
]);
const screenshotRoutes = new Set(["/", "/community", "/how-to-order", "/ready-stock", "/catalog", "/join", "/sign-in"]);
const prohibitedCopy =
  /Prototype Preview|Prototype v0\.1|Prototype mode|Prototype boundary|Admin prototype|Data is stored only in this browser|production ownership is not enabled yet|local prototype|local storage|never seeds applicant records|dummy data/i;

test.beforeAll(async () => {
  await clerkSetup();
});

async function verifyRoute(route: string, page: Page, project: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await setupClerkTestingToken({ page });

  const response = await page.goto(route, { waitUntil: "networkidle" });
  expect(response?.status(), `${route} response`).toBeLessThan(400);
  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator("body")).not.toContainText(prohibitedCopy);
  if (route === "/ready-stock") await expect(page.getByText("Memuat Ready Stock…")).toBeHidden({ timeout: 15_000 });

  if (publicShellRoutes.has(route)) {
    await expect(page.locator("h1")).toHaveCount(1);
    if ((page.viewportSize()?.width || 0) <= 800) {
      await page.locator('summary[aria-label="Buka menu"]').click();
      await expect(page.getByRole("navigation", { name: "Navigasi mobile" })).toBeVisible();
      await page.locator('summary[aria-label="Buka menu"]').click();
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Blessing For Goods home" }).getByRole("img")).toBeVisible();
  } else {
    if (protectedRoutes.has(route)) await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("img", { name: "Blessing For Goods" })).toBeVisible();
    await expect(page.locator("[data-clerk-component]")).toBeVisible();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth + 1),
  );

  if (screenshotRoutes.has(route)) {
    await page.screenshot({
      path: `artifacts/browser-qa/${project}-${route === "/" ? "home" : route.slice(1)}.png`,
      fullPage: true,
    });
  }

  expect(consoleErrors, `${route} console errors`).toEqual([]);
  expect(pageErrors, `${route} page errors`).toEqual([]);
}

test.describe("@customer BFG customer route smoke", () => {
  for (const route of customerRoutes) {
    test(`${route} renders without browser errors`, async ({ page }, testInfo) => {
      await verifyRoute(route, page, testInfo.project.name);
    });
  }

  test("signed-out navigation keeps protected destinations out of the public shell", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/", { waitUntil: "networkidle" });
    if ((page.viewportSize()?.width || 0) <= 800) await page.locator('summary[aria-label="Buka menu"]').click();
    const links = await page
      .getByRole("navigation", {
        name: (page.viewportSize()?.width || 0) <= 800 ? "Navigasi mobile" : "Primary navigation",
      })
      .getByRole("link")
      .evaluateAll((items) =>
        items.map((item) => ({
          href: (item as HTMLAnchorElement).getAttribute("href"),
          label: item.textContent?.trim(),
        })),
      );
    expect(links.map((link) => link.label)).toEqual([
      "Beranda",
      "Ready Stock",
      "Komunitas",
      "Cara memesan",
      "Secret Catalog",
      "Gabung",
    ]);
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });
});

test.describe("@admin BFG admin route smoke", () => {
  for (const route of adminRoutes) {
    test(`${route} enforces sign-in without browser errors`, async ({ page }, testInfo) => {
      await verifyRoute(route, page, testInfo.project.name);
    });
  }
});
