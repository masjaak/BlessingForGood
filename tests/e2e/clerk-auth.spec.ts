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
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Buka Workspace Admin" })).toHaveCount(0);
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
    await expect(page.getByRole("heading", { name: "Manage BFG users" })).toBeVisible();
    await page.goto("/account", { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link")).toHaveText([
      "Beranda",
      "Katalog",
      "Buku Saya",
      "Tagihan",
      "Akun",
    ]);
    await page.getByRole("link", { name: "Buka Workspace Admin" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page
      .getByRole("link", { name: /Lihat sisi customer/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/$/);

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
