import { expect, test } from "@playwright/test";

test.describe("@customer Phase 07.1 shared surface", () => {
  test("Phase 08 slider swap and dropdown anchor stay rendered correctly", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".story-card-opening")).toBeVisible();
    await expect(page.locator(".story-card-logo")).toBeVisible();
    const backgrounds = await page
      .locator(".story-card-opening, .story-card-logo")
      .evaluateAll((cards) => cards.map((card) => getComputedStyle(card).backgroundColor));
    expect(backgrounds[0]).not.toBe(backgrounds[1]);

    await page.goto("/ready-stock", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Memuat Ready Stock")).toBeHidden({ timeout: 15_000 });
    const cover = page.locator(".book-cover").first();
    const coverImage = cover.locator("img");
    await expect(coverImage).toBeVisible();
    const coverGeometry = await cover.evaluate((element) => {
      const image = element.querySelector("img");
      if (!image) return null;
      const frame = element.getBoundingClientRect();
      const artwork = image.getBoundingClientRect();
      return {
        frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom },
        artwork: {
          left: artwork.left,
          top: artwork.top,
          right: artwork.right,
          bottom: artwork.bottom,
          objectFit: getComputedStyle(image).objectFit,
        },
      };
    });
    expect(coverGeometry).not.toBeNull();
    expect(coverGeometry?.artwork.objectFit).toBe("contain");
    expect(coverGeometry?.artwork.left).toBeGreaterThanOrEqual((coverGeometry?.frame.left ?? 0) - 1);
    expect(coverGeometry?.artwork.top).toBeGreaterThanOrEqual((coverGeometry?.frame.top ?? 0) - 1);
    expect(coverGeometry?.artwork.right).toBeLessThanOrEqual((coverGeometry?.frame.right ?? 0) + 1);
    expect(coverGeometry?.artwork.bottom).toBeLessThanOrEqual((coverGeometry?.frame.bottom ?? 0) + 1);
    const trigger = page.locator(".bfg-select-trigger").last();
    const triggerBox = await trigger.boundingBox();
    await trigger.click();
    const menu = page.locator(".bfg-select-menu");
    const gap = 6;
    expect(triggerBox).not.toBeNull();
    await expect
      .poll(
        async () => {
          const menuBox = await menu.boundingBox();
          if (!menuBox || !triggerBox) return false;
          const opensBelow = Math.abs(menuBox.y - (triggerBox.y + triggerBox.height + gap)) <= 2;
          const opensAbove = Math.abs(menuBox.y + menuBox.height - (triggerBox.y - gap)) <= 2;
          return Math.abs(menuBox.x - triggerBox.x) <= 1 && (opensBelow || opensAbove);
        },
        { timeout: 1_000 },
      )
      .toBe(true);
  });

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
