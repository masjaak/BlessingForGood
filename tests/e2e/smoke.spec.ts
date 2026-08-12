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
  "/admin/ready-stock",
  "/admin/join-requests",
  "/admin/orders",
  "/admin/batches",
  "/admin/invoices",
  "/admin/payments",
  "/admin/exceptions",
  "/admin/refunds",
  "/admin/customers",
  "/admin/users",
];

const publicShellRoutes = new Set([
  "/",
  "/community",
  "/how-to-order",
  "/help",
  "/ready-stock",
  "/join",
  "/catalog",
  "/account",
  "/account/orders",
  "/account/invoices",
  "/account/profile",
  "/account/addresses",
]);
const authRoutes = new Set(["/sign-in"]);
const protectedRoutes = new Set(adminRoutes);
const screenshotRoutes = new Set([
  "/",
  "/community",
  "/how-to-order",
  "/ready-stock",
  "/catalog",
  "/join",
  "/sign-in",
  "/account",
  "/account/orders",
  "/account/invoices",
]);
const prohibitedCopy =
  /Prototype Preview|Prototype v0\.1|Prototype mode|Prototype boundary|Admin prototype|Data is stored only in this browser|production ownership is not enabled yet|local prototype|local storage|never seeds applicant records|dummy data/i;

async function verifyRoute(route: string, page: Page, project: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const isDevToolsCaretHydrationWarning =
      text.startsWith("A tree hydrated but some attributes") && text.includes('caret-color:"transparent"');
    if (message.type() === "error" && !isDevToolsCaretHydrationWarning) consoleErrors.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  // Clerk/Convex maintain reactive requests after the shell is rendered, so
  // networkidle is not a reliable page-readiness signal for these routes.
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} response`).toBeLessThan(400);
  await expect(page.locator("body")).not.toHaveText("");
  await expect(page.locator("body")).not.toContainText(prohibitedCopy);
  if (route === "/ready-stock") await expect(page.getByText("Memuat Ready Stock…")).toBeHidden({ timeout: 15_000 });
  if (route === "/" || route === "/how-to-order") {
    await expect(page.locator('.site-header img[src*="Logo-1"]')).toHaveCount(1);
    if (route === "/") {
      const storyLogo = page.locator('.story-card-logo img[src*="Logo-1"]');
      await expect(storyLogo).toHaveCount(1);
      await expect
        .poll(() => storyLogo.evaluate((image) => (image as HTMLImageElement).naturalWidth), { timeout: 5_000 })
        .toBeGreaterThan(0);
    }
    await expect(page.locator(".order-step-icon")).toHaveCount(route === "/" ? 3 : 8);
  }

  if (publicShellRoutes.has(route)) {
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    if ((page.viewportSize()?.width || 0) <= 800) {
      await expect(page.getByRole("navigation", { name: "Navigasi customer" })).toBeVisible();
      await expect(page.locator('summary[aria-label="Buka menu"]')).toHaveCount(0);
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Blessing For Goods home" }).getByRole("img")).toBeVisible();
  } else if (authRoutes.has(route)) {
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("img", { name: "Blessing For Goods" })).toBeVisible();
    await expect(page.getByText(/khusus Blessfriends/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-clerk-component]")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/sign up|buat akun/i)).toBeHidden();
  } else {
    if (protectedRoutes.has(route)) {
      await expect(page).toHaveURL(/\/sign-in/);
      if (route === "/account/invoices") {
        expect(new URL(page.url()).searchParams.get("redirect_url")).toMatch(/\/account\/invoices$/);
      }
    }
    await expect(page.getByRole("img", { name: "Blessing For Goods" })).toBeVisible();
    await expect(page.locator("[data-clerk-component]")).toBeVisible({ timeout: 15_000 });
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth + 1),
  );

  if (screenshotRoutes.has(route)) {
    await expect(page.locator(".bfg-splash")).toBeHidden({ timeout: 2_500 });
    await page.screenshot({
      path: `artifacts/browser-qa/${project}-${route === "/" ? "home" : route.slice(1)}.png`,
      fullPage: true,
    });
    if (route === "/") {
      await page.locator(".story-card-logo").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/browser-qa/${project}-story-logo-patch.png` });
    }
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

  test("signed-out navigation shows customer states before authentication", async ({ page }) => {
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
    await expect(page.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/sign-in");

    for (const [route, copy] of [
      ["/catalog", "Kode akses katalog"],
      ["/account/orders", "Belum ada buku yang bisa ditampilkan."],
      ["/account/invoices", "Tagihanmu akan muncul di sini."],
      ["/account", "Akun Blessfriend"],
    ] as const) {
      // Reactive Clerk/Convex traffic can keep a signed-out shell from reaching
      // networkidle even after the route is fully rendered.
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/sign-in/);
      await expect(page.getByText(copy)).toBeVisible();
    }
    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main").getByRole("link", { name: "Masuk" })).toHaveAttribute(
      "href",
      "/sign-in?redirect_url=/account",
    );
    await expect(page.getByRole("link", { name: "Join Blessfriends" })).toHaveAttribute("href", "/join");
    await page.getByRole("main").getByRole("link", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Faccount|\/sign-in\?redirect_url=\/account/);
    await page.getByRole("button", { name: "Kembali" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("blocks public sign-up while keeping the route available for invitations", async ({ page }) => {
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
