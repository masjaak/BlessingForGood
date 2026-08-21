import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for authenticated Clerk QA.`);
  return value;
}

test.beforeAll(async () => {
  await clerkSetup();
});

test.describe("BFG Clerk authenticated Production", () => {
  test("invited customer signs in and receives protected Convex access", async ({ page }) => {
    await page.goto("/");
    await clerk.signIn({ emailAddress: required("BFG_E2E_CUSTOMER_EMAIL"), page });
    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Semua yang perlu kamu ikuti, dalam satu tempat." })).toBeVisible();
    await expect(page.locator(".loading-region")).toHaveCount(0);
    const customerViewportWidth = page.viewportSize()?.width ?? 1440;
    if (customerViewportWidth <= 800) {
      await expect(page.locator(".customer-shell .site-auth")).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Navigasi pelanggan" }).getByRole("link")).toHaveText([
        "Beranda",
        "Katalog",
        "Buku Saya",
        "Tagihan",
        "Akun",
      ]);
    }
    await page.getByRole("link", { name: "Buka Aktivitas" }).click();
    await expect(page).toHaveURL(/\/account\/notifications$/);
    await expect(page.getByRole("heading", { name: "Aktivitas" })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)))
      .toBeLessThanOrEqual(customerViewportWidth + 1);
    await page.goto("/account/orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Ikuti langkah berikutnya dengan mudah." })).toBeVisible();
    await expect(page.locator(".loading-region")).toHaveCount(0);
    await page.goto("/account/invoices", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Lihat jumlah yang perlu diselesaikan." })).toBeVisible();
    await expect(page.locator(".loading-region")).toHaveCount(0);
    await page.goto("/catalog", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/catalog/);
    await expect(page.getByLabel("Catalog access code")).toBeVisible();
    await page.goto("/account/profile", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Profil Blessfriend" })).toBeVisible();
    await page.goto("/account/addresses", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Alamat pengiriman" })).toBeVisible();
    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Halaman ini tidak tersedia untuk akunmu" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Buka ruang kerja Admin" })).toHaveCount(0);
    await clerk.signOut({ page });
    await page.goto("/account/orders", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("owner reaches user management while customer access is denied", async ({ page, browser }) => {
    await page.goto("/");
    await clerk.signIn({ emailAddress: required("BFG_E2E_OWNER_EMAIL"), page });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pekerjaan penting hari ini." })).toBeVisible();
    await expect(page.locator(".loading-region")).toHaveCount(0);
    await page.goto("/admin/users", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Kelola pengguna BFG" })).toBeVisible();
    await page.goto("/account", { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link")).toHaveText([
      "Beranda",
      "Katalog",
      "Buku Saya",
      "Tagihan",
      "Akun",
    ]);
    await page.getByRole("link", { name: "Buka ruang kerja Admin" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page
      .getByRole("link", { name: /Lihat sisi pelanggan/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/admin/books", { waitUntil: "networkidle" });
    const activityTrigger = page.getByRole("button", { name: /Aktivitas/ });
    await activityTrigger.click();
    const activityPanel = page.getByRole("dialog", { name: "Aktivitas" });
    await expect(activityPanel).toBeVisible();
    const activityGeometry = await activityPanel.evaluate((panel) => {
      const panelRect = panel.getBoundingClientRect();
      const cards = [...panel.querySelectorAll<HTMLElement>(".activity-card")];
      return {
        left: panelRect.left,
        right: panelRect.right,
        bodyScrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        viewportWidth: window.innerWidth,
        cards: cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, right: rect.right, scrollWidth: card.scrollWidth, clientWidth: card.clientWidth };
        }),
      };
    });
    expect(activityGeometry.left).toBeGreaterThanOrEqual(0);
    expect(activityGeometry.right).toBeLessThanOrEqual(activityGeometry.viewportWidth + 1);
    expect(activityGeometry.bodyScrollWidth).toBeLessThanOrEqual(activityGeometry.viewportWidth + 1);
    for (const card of activityGeometry.cards) {
      expect(card.left).toBeGreaterThanOrEqual(activityGeometry.left);
      expect(card.right).toBeLessThanOrEqual(activityGeometry.right + 1);
      expect(card.scrollWidth).toBe(card.clientWidth);
    }
    await page.keyboard.press("Escape");
    await expect(activityPanel).toHaveCount(0);
    await expect(activityTrigger).toBeFocused();
    const adminNav = page.getByRole("navigation", { name: "Navigasi admin" });
    await adminNav.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      window.scrollTo(0, 420);
    });
    await adminNav.getByRole("link", { name: "Reports & Analytics" }).click();
    await expect(page).toHaveURL(/\/admin\/reports$/);
    await expect(page.getByRole("heading", { name: "Rekap operasional BFG" })).toBeVisible();
    await expect
      .poll(() => adminNav.evaluate((element) => ({ pageY: window.scrollY, sidebarY: element.scrollTop })))
      .toEqual(expect.objectContaining({ pageY: 0 }));
    await expect.poll(() => adminNav.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const customerContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const customerPage = await customerContext.newPage();
    try {
      await customerPage.goto("/");
      await clerk.signIn({ emailAddress: required("BFG_E2E_CUSTOMER_EMAIL"), page: customerPage });
      await customerPage.goto("/admin", { waitUntil: "networkidle" });
      await expect(
        customerPage.getByRole("heading", { name: "Halaman ini tidak tersedia untuk akunmu" }),
      ).toBeVisible();
      await customerPage.goto("/admin/users", { waitUntil: "networkidle" });
      await expect(
        customerPage.getByRole("heading", { name: "Halaman ini tidak tersedia untuk akunmu" }),
      ).toBeVisible();
    } finally {
      await customerContext.close();
    }
  });
});
