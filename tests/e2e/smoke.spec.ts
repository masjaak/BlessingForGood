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
      await expect(page.getByRole("navigation", { name: "Navigasi customer" })).toBeVisible();
      await expect(page.locator('summary[aria-label="Buka menu"]')).toHaveCount(0);
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Blessing For Goods home" }).getByRole("img")).toBeVisible();
  } else {
    if (protectedRoutes.has(route)) {
      await expect(page).toHaveURL(/\/sign-in/);
      if (route === "/account/invoices") {
        expect(new URL(page.url()).searchParams.get("redirect_url")).toMatch(/\/account\/invoices$/);
      }
    }
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
    const links = await page
      .getByRole("navigation", {
        name: (page.viewportSize()?.width || 0) <= 800 ? "Navigasi customer" : "Primary navigation",
      })
      .getByRole("link")
      .evaluateAll((items) =>
        items.map((item) => ({
          href: (item as HTMLAnchorElement).getAttribute("href"),
          label: item.textContent?.trim(),
        })),
      );
    if ((page.viewportSize()?.width || 0) <= 800) {
      expect(links.map((link) => link.label)).toEqual(["Beranda", "Katalog", "Buku Saya", "Tagihan", "Akun"]);
      await expect(page.locator('summary[aria-label="Buka menu"]')).toHaveCount(0);
    } else {
      expect(links.map((link) => link.label)).toEqual([
        "Beranda",
        "Ready Stock",
        "Komunitas",
        "Cara memesan",
        "Secret Catalog",
        "Gabung",
      ]);
    }
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });

  test("blocks public sign-up while keeping the route available for invitations", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/create account|buat akun|sign up/i)).toHaveCount(0);
  });
});

test.describe("@admin BFG admin route smoke", () => {
  for (const route of adminRoutes) {
    test(`${route} enforces sign-in without browser errors`, async ({ page }, testInfo) => {
      await verifyRoute(route, page, testInfo.project.name);
    });
  }
});
