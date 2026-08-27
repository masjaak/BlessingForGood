import { expect, test } from "@playwright/test";

test.describe("@customer invitation acceptance", () => {
  test("leaves ticket processing with bounded recovery if the provider does not settle", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      // Turnstile's headless anti-debug shim emits this exact console line while
      // the fake ticket is waiting; it is not an application exception.
      if (message.type() === "error" && text !== "%c%d font-size:0;color:transparent NaN") consoleErrors.push(text);
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto("/accept-invitation?__clerk_ticket=invalid-ticket-fixture", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Aktivasi belum selesai." })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
    await expect(page.getByText("Memeriksa undangan…")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth + 1),
    );
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
