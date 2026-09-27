import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const states = ["signed-out", "unadmitted", "pending", "approved", "active", "suspended", "admin", "owner"] as const;
const whatsappMessage =
  "Halo BFG, aku sudah mengisi pendaftaran Blessfriends di website. Aku ingin meminta link untuk bergabung ke WhatsApp Group BFG.";

test("renders onboarding state matrix, refresh, and six responsive widths @customer", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const evidenceDirectory = testInfo.outputPath();
  await mkdir(evidenceDirectory, { recursive: true });

  for (const state of states) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/verification/onboarding?state=${state}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("onboarding-presentation-state")).toHaveAttribute("data-state", state);
    if (["signed-out", "unadmitted", "pending", "approved"].includes(state)) {
      await expect(page.getByTestId("floating-blessy")).toBeHidden();
    } else {
      await expect(page.getByTestId("floating-blessy")).toBeVisible();
    }
    const region = page.getByRole("region", { name: "Selamat datang di Blessing For Good" });
    const onboarding = page.locator(".home-onboarding");

    if (state === "signed-out" || state === "unadmitted") {
      await expect(region).toBeVisible();
      await expect(region.getByRole("link", { name: "Gabung Blessfriends" })).toHaveAttribute("href", "/join");
      await expect(region.getByRole("link", { name: "Pelajari cara pesan" })).toHaveAttribute("href", "/how-to-order");
    } else if (state === "pending") {
      await expect(page.getByRole("heading", { name: "Pendaftaranmu sudah diterima." })).toBeVisible();
      const whatsapp = page.getByRole("link", { name: "Minta link WhatsApp Group" });
      const url = new URL((await whatsapp.getAttribute("href"))!);
      expect(url.origin).toBe("https://wa.me");
      expect(url.pathname).toBe("/6282347278881");
      expect(url.searchParams.get("text")).toBe(whatsappMessage);
      await expect(onboarding.getByRole("link", { name: "Gabung Blessfriends" })).toHaveCount(0);
    } else if (state === "approved") {
      await expect(page.getByRole("heading", { name: "Pendaftaranmu sudah disetujui." })).toBeVisible();
      await expect(page.getByText("Cek email untuk menyelesaikan aktivasi akun.")).toBeVisible();
      await expect(onboarding.getByRole("link", { name: "Gabung Blessfriends" })).toHaveCount(0);
      await expect(onboarding.getByRole("link", { name: "Minta link WhatsApp Group" })).toHaveCount(0);
    } else if (state === "active") {
      await expect(region).toHaveCount(0);
      await expect(onboarding.locator(".home-onboarding-how-to")).toBeVisible();
      await expect(onboarding.getByRole("link", { name: "Gabung Blessfriends" })).toHaveCount(0);
    } else {
      await expect(onboarding).toHaveCount(0);
      await expect(region).toHaveCount(0);
    }

    const anchor =
      state === "active" ? onboarding.locator(".home-onboarding-how-to") : onboarding.locator(".home-onboarding-main");
    if (await anchor.count()) await anchor.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDirectory}/state-${state}-390.png`, fullPage: true });
  }

  await page.goto("/verification/onboarding?state=active", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("onboarding-presentation-state")).toHaveAttribute("data-state", "active");
  await expect(page.getByRole("region", { name: "Selamat datang di Blessing For Good" })).toHaveCount(0);

  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/verification/onboarding?state=signed-out", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("floating-blessy")).toBeHidden();
    const welcome = page.getByRole("region", { name: "Selamat datang di Blessing For Good" });
    await expect(welcome).toBeVisible();
    await welcome.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    const metrics = await page.evaluate(() => {
      const box = (element: Element | null) => {
        if (!element) return null;
        const { x, y, width: w, height: h, top, right, bottom, left } = element.getBoundingClientRect();
        return { x, y, width: w, height: h, top, right, bottom, left };
      };
      const welcome = document.querySelector(".home-onboarding-main-welcome");
      const close = welcome?.querySelector("button[aria-label='Tutup informasi selamat datang']") ?? null;
      const primary = welcome?.querySelector("a[href='/join']") ?? null;
      const nav = document.querySelector(".customer-bottom-nav");
      const lastNavLink = nav?.querySelector("a:last-child") ?? null;
      const lastNavRect = lastNavLink?.getBoundingClientRect();
      const navHit = lastNavRect
        ? document.elementFromPoint(lastNavRect.x + lastNavRect.width / 2, lastNavRect.y + lastNavRect.height / 2)
        : null;
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        welcome: box(welcome),
        inFlow: welcome ? getComputedStyle(welcome).position !== "fixed" : false,
        close: box(close),
        primary: box(primary),
        nav: box(nav),
        navVisible: Boolean(nav && nav.getBoundingClientRect().height > 0),
        navHit: Boolean(lastNavLink && navHit && lastNavLink.contains(navHit)),
      };
    });

    console.log(`RESPONSIVE_GEOMETRY ${JSON.stringify({ width, ...metrics })}`);
    expect(metrics.overflow, `${width}px horizontal overflow`).toBe(false);
    expect(metrics.welcome?.left, `${width}px welcome left edge`).toBeGreaterThanOrEqual(0);
    expect(metrics.welcome?.right, `${width}px welcome right edge`).toBeLessThanOrEqual(width);
    expect(metrics.inFlow, `${width}px welcome position`).toBe(true);
    expect(metrics.close?.width, `${width}px close target`).toBeGreaterThanOrEqual(44);
    expect(metrics.close?.height, `${width}px close target`).toBeGreaterThanOrEqual(44);
    expect(metrics.primary?.height, `${width}px primary CTA target`).toBeGreaterThanOrEqual(44);
    expect(metrics.close?.top, `${width}px close control in viewport`).toBeGreaterThanOrEqual(0);
    expect(metrics.primary?.top, `${width}px primary CTA in viewport`).toBeGreaterThanOrEqual(0);
    if (width <= 800) {
      expect(metrics.navVisible, `${width}px bottom navigation`).toBe(true);
      expect(metrics.navHit, `${width}px bottom navigation hit target`).toBe(true);
      expect(metrics.welcome?.bottom, `${width}px welcome clear of bottom navigation`).toBeLessThanOrEqual(
        metrics.nav?.top ?? 0,
      );
    }
    await page.screenshot({ path: `${evidenceDirectory}/welcome-${width}.png` });
  }

  await page.goto("/verification/onboarding?state=signed-out", { waitUntil: "domcontentloaded" });
  const close = page.getByRole("button", { name: "Tutup informasi selamat datang" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Selamat datang di Blessing For Good" })).toHaveCount(0);
});
