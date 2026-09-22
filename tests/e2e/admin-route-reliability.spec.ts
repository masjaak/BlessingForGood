import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const ownerEmail = process.env.BFG_E2E_OWNER_EMAIL;
const adminRoutes = [
  "/admin",
  "/admin/analytics",
  "/admin/content",
  "/admin/join-requests",
  "/admin/customers",
  "/admin/books",
  "/admin/catalogs",
  "/admin/ready-stock",
  "/admin/orders",
  "/admin/batches",
  "/admin/exceptions",
  "/admin/invoices",
  "/admin/deposits",
  "/admin/payments",
  "/admin/refunds",
  "/admin/reports",
  "/admin/users",
  "/admin/audit",
  "/admin/settings",
  "/admin/import",
  "/admin/inbox",
  "/admin/notifications",
] as const;
const previouslyFailingRoutes = new Set(["/admin/join-requests", "/admin/ready-stock", "/admin/orders"]);

test.describe("@admin authenticated route reliability", () => {
  test.skip(!ownerEmail, "BFG_E2E_OWNER_EMAIL is required for authenticated Production QA.");
  test.setTimeout(20 * 60 * 1000);

  test.beforeAll(async () => {
    await clerkSetup();
  });

  test("every Admin index settles, refreshes, and survives return navigation", async ({ page }) => {
    const failures: Array<{ route: string; phase: string; error: string; elapsedMs: number }> = [];
    const settled: Array<{ route: string; initialMs: number; refreshMs: number; returnMs?: number }> = [];

    await page.goto("/");
    await clerk.signIn({ emailAddress: ownerEmail!, page });

    for (const route of adminRoutes) {
      const routeStartedAt = Date.now();
      const browserErrors: string[] = [];
      const onPageError = (error: Error) => browserErrors.push(`pageerror: ${error.message}`);
      const onConsole = (message: { type: () => string; text: () => string }) => {
        if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
      };
      page.on("pageerror", onPageError);
      page.on("console", onConsole);

      async function settle(phase: string) {
        const startedAt = Date.now();
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page).not.toHaveURL(/\/sign-in/);
        await expect(page.locator(".loading-region")).toHaveCount(0, { timeout: 45_000 });
        await page.waitForTimeout(10_000);
        await expect(page.locator("body")).not.toContainText("This page couldn't load");
        if (browserErrors.length) throw new Error(browserErrors[0]);
        return { phase, elapsedMs: Date.now() - startedAt };
      }

      try {
        const initial = await settle("initial");
        const refreshStartedAt = Date.now();
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.locator(".loading-region")).toHaveCount(0, { timeout: 45_000 });
        await page.waitForTimeout(10_000);
        await expect(page.locator("body")).not.toContainText("This page couldn't load");
        const refreshMs = Date.now() - refreshStartedAt;
        if (browserErrors.length) throw new Error(browserErrors[0]);

        let returnMs: number | undefined;
        if (previouslyFailingRoutes.has(route)) {
          await page.goto("/admin", { waitUntil: "domcontentloaded" });
          await expect(page).not.toHaveURL(/\/sign-in/);
          const returned = await settle("return");
          returnMs = returned.elapsedMs;
        }
        settled.push({ route, initialMs: initial.elapsedMs, refreshMs, returnMs });
      } catch (error) {
        failures.push({
          route,
          phase: browserErrors.length ? "browser" : "settle",
          error: error instanceof Error ? error.message : String(error),
          elapsedMs: Date.now() - routeStartedAt,
        });
      } finally {
        page.off("pageerror", onPageError);
        page.off("console", onConsole);
      }
    }

    console.log(JSON.stringify({ settled, failures }));
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(settled.map((result) => result.route)).toEqual([...adminRoutes]);
  });

  test("Dashboard settles independently, refreshes, and survives return navigation", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
    });

    await page.goto("/");
    await clerk.signIn({ emailAddress: ownerEmail!, page });

    async function settleDashboard() {
      await page.goto("/admin", { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/sign-in/);
      await expect(page.getByRole("heading", { name: "Pekerjaan penting hari ini." })).toBeVisible({ timeout: 45_000 });
      await expect(page.locator(".workspace-skeleton")).toHaveCount(0, { timeout: 45_000 });
      await expect(page.locator('[data-dashboard-state="ready"]')).toHaveCount(7, { timeout: 45_000 });
      await page.waitForTimeout(15_000);
      await expect(page.locator('[data-dashboard-state="ready"]')).toHaveCount(7);
    }

    await settleDashboard();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-dashboard-state="ready"]')).toHaveCount(7, { timeout: 45_000 });
    await page.waitForTimeout(15_000);
    await page.goto("/admin/orders", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/sign-in/);
    await settleDashboard();
    await page.waitForTimeout(15_000);

    expect(browserErrors, browserErrors.join("\n")).toEqual([]);
  });
});
