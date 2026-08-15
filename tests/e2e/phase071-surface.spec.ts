import { expect, test } from "@playwright/test";

test.describe("@customer Phase 07.1 shared surface", () => {
  test("custom select renders and opens without a native menu", async ({ page }, testInfo) => {
    await page.goto("/ready-stock", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Memuat Ready Stock")).toBeHidden({ timeout: 15_000 });
    const trigger = page.locator(".bfg-select-trigger").last();

    await expect(page.locator("select")).toHaveCount(0);
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator(".bfg-select-menu")).toBeVisible();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option", { name: "Terbaru" })).toBeVisible();
    await page.screenshot({ path: `test-results/${testInfo.project.name}-custom-select-open.png` });

    await page.getByRole("option", { name: "Judul" }).click();
    await expect(trigger).toContainText("Judul");
    await expect(page.locator('input[type="hidden"][name="sort"]')).toHaveValue("title");
    await trigger.press("Escape");
    await expect(page.locator(".bfg-select-menu")).toBeHidden();
  });
});
