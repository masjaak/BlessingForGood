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

test.describe("BFG Clerk authenticated Preview", () => {
  test("invited customer signs in and receives protected Convex access", async ({ page }) => {
    await page.goto("/");
    await clerk.signIn({ emailAddress: required("BFG_E2E_CUSTOMER_EMAIL"), page });
    await page.goto("/catalog", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/catalog/);
    await expect(page.getByLabel("Catalog access code")).toBeVisible();
    await page.goto("/account/profile", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Profil Blessfriend" })).toBeVisible();
    await clerk.signOut({ page });
    await page.goto("/account/orders", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("owner reaches user management while customer access is denied", async ({ page, browser }) => {
    await page.goto("/");
    await clerk.signIn({ emailAddress: required("BFG_E2E_OWNER_EMAIL"), page });
    await page.goto("/admin/users", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Manage BFG users" })).toBeVisible();

    const customerContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const customerPage = await customerContext.newPage();
    try {
      await customerPage.goto("/");
      await clerk.signIn({ emailAddress: required("BFG_E2E_CUSTOMER_EMAIL"), page: customerPage });
      await customerPage.goto("/admin/users", { waitUntil: "networkidle" });
      await expect(customerPage.getByRole("heading", { name: "This workspace is not available" })).toBeVisible();
    } finally {
      await customerContext.close();
    }
  });
});
