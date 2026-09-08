import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 700 },
  { width: 360, height: 780 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 402, height: 874 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 834, height: 1112 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

test.describe("@customer @floating-blessy Phase 1 rendered harness", () => {
  test("stays contained above the mobile nav across the viewport matrix", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The explicit matrix runs once from the 390px customer project.",
    );
    test.setTimeout(90_000);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-testid='floating-blessy']")).toHaveCount(0);
      await page.waitForTimeout(1700);
      await expect(page.locator("[data-testid='floating-blessy']")).toBeVisible();

      const geometry = await page.evaluate(() => {
        const widget = document.querySelector<HTMLElement>("[data-testid='floating-blessy']");
        const bubble = document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']");
        const mascot = document.querySelector<HTMLElement>(".floating-blessy__image");
        const close = document.querySelector<HTMLElement>(".floating-blessy__close");
        const nav = document.querySelector<HTMLElement>(".customer-bottom-nav");
        if (!widget || !bubble || !mascot || !close || !nav) throw new Error("Blessy geometry fixture is incomplete");

        const rect = (element: HTMLElement) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
            width: box.width,
            height: box.height,
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          widget: rect(widget),
          bubble: rect(bubble),
          mascot: rect(mascot),
          close: rect(close),
          nav: { ...rect(nav), display: getComputedStyle(nav).display },
          scrollWidth: document.documentElement.scrollWidth,
          animationName: getComputedStyle(document.querySelector(".floating-blessy__idle")!).animationName,
          pointerEvents: getComputedStyle(widget).pointerEvents,
        };
      });

      expect(geometry.bubble.left, viewport.width + "px bubble left").toBeGreaterThanOrEqual(8);
      expect(geometry.bubble.right, viewport.width + "px bubble right").toBeLessThanOrEqual(viewport.width - 8);
      expect(geometry.mascot.left, viewport.width + "px mascot left").toBeGreaterThanOrEqual(8);
      expect(geometry.mascot.right, viewport.width + "px mascot right").toBeLessThanOrEqual(viewport.width - 8);
      expect(geometry.close.left, viewport.width + "px close left").toBeGreaterThanOrEqual(8);
      expect(geometry.close.right, viewport.width + "px close right").toBeLessThanOrEqual(viewport.width - 8);
      expect(geometry.scrollWidth, viewport.width + "px document width").toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.pointerEvents).toBe("none");

      if (viewport.width <= 800) {
        expect(geometry.nav.display).not.toBe("none");
        expect(geometry.widget.bottom, viewport.width + "px Blessy/nav clearance").toBeLessThanOrEqual(
          geometry.nav.top - 1,
        );
      } else {
        expect(geometry.nav.display).toBe("none");
      }
    }
  });

  test("preserves dismissal across client navigation, resets after refresh, and excludes Admin", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The navigation harness runs once from the 390px customer project.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    await page.getByRole("button", { name: "Tutup Blessy" }).click();
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveCount(0);

    await page.locator('.customer-bottom-nav a[href="/catalog"]').click();
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveCount(0);

    await page.locator('.customer-bottom-nav a[href="/"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    await expect(page.locator("[data-testid='floating-blessy']")).toBeVisible();

    await page.goto("/admin/orders", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveCount(0);
  });

  test("disables continuous idle motion when reduced motion is requested", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The motion harness runs once from the 390px customer project.",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    await expect(page.locator("[data-testid='floating-blessy']")).toBeVisible();
    await expect
      .poll(() => page.locator(".floating-blessy__idle").evaluate((element) => getComputedStyle(element).animationName))
      .toBe("none");
  });

  test("follows the real bottom-nav families and shows the matching contextual copy", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The route-context harness runs once from the 390px customer project.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-pose-id", "greeting");

    await page.locator('.customer-bottom-nav a[href="/catalog"]').click();
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-navigation-context", "catalog");
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-pose-id", "question");
    await expect(page.getByText("Hari ini mau FIX buku apa?")).toBeVisible();

    await page.locator('.customer-bottom-nav a[href="/account/orders"]').click();
    await expect(page).toHaveURL(/\/account\/orders$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-pose-id", "apology");
    await expect(
      page.getByText("Kalau Admin telat bales, sabar ya. Mungkin lagi dinas ke nyuapin anaknya."),
    ).toBeVisible();

    await page.locator('.customer-bottom-nav a[href="/account"]').click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-pose-id", "sleeping");
  });

  test("keeps the mascot as the WhatsApp action and separates drag from tap", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The pointer harness runs once from the 390px customer project.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);

    const mascot = page.getByRole("link", { name: "Chat Admin BFG lewat WhatsApp" });
    await expect(mascot).toHaveAttribute("href", "https://wa.me/6288973465977");
    await expect(mascot).toHaveAttribute("target", "_blank");
    await expect(mascot).toHaveAttribute("rel", "noopener noreferrer");

    const before = await mascot.boundingBox();
    if (!before) throw new Error("Blessy hit target has no geometry");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + 56, before.y + 48);
    await page.mouse.up();
    const after = await mascot.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.x || 0) - before.x) + Math.abs((after?.y || 0) - before.y)).toBeGreaterThan(0);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-dragging", "false");

    const popupPromise = page.waitForEvent("popup");
    await mascot.click();
    const popup = await popupPromise;
    await expect.poll(() => popup.url()).toContain("6288973465977");
    await popup.close();
  });

  test("shows the compact WhatsApp hint after contextual bubble expiry", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "customer-390", "The CTA harness runs once from the 390px customer project.");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700 + 7200);
    await expect(page.locator("[data-testid='floating-blessy-bubble']")).toHaveAttribute("data-visible", "false");
    await expect(page.locator("[data-testid='floating-blessy-cta']")).toHaveAttribute("data-visible", "true");
    await expect(page.getByText("Klik aku kalau mau ngobrol langsung ya")).toBeVisible();
  });
});
