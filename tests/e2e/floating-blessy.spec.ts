import { expect, test, type Page } from "@playwright/test";

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

async function clearHomepageCopy(page: Page) {
  await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(".home-hero");
    if (hero) window.scrollTo(0, hero.getBoundingClientRect().bottom + window.scrollY);
  });
  const blessy = page.locator("[data-testid='floating-blessy']");
  await expect(blessy).toHaveAttribute("data-obstructing-home-copy", "false");
  await expect(blessy).toBeVisible();
}

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
      await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute(
        "data-obstructing-home-copy",
        /^(true|false)$/,
      );

      const geometry = await page.evaluate(() => {
        const widget = document.querySelector<HTMLElement>("[data-testid='floating-blessy']");
        const bubble = document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']");
        const homepageCta = document.querySelector<HTMLElement>(".home-hero-actions");
        const mascot = document.querySelector<HTMLElement>(".floating-blessy__image");
        const close = document.querySelector<HTMLElement>(".floating-blessy__close");
        const nav = document.querySelector<HTMLElement>(".customer-bottom-nav");
        if (!widget || !bubble || !homepageCta || !mascot || !close || !nav) {
          throw new Error("Blessy geometry fixture is incomplete");
        }
        if (document.querySelectorAll("[data-testid='floating-blessy-bubble']").length !== 1) {
          throw new Error("Blessy must render one bubble frame");
        }

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
        const overlaps = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) =>
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top;
        const homepageCopy = [
          ...document.querySelectorAll<HTMLElement>(
            ".home-hero .eyebrow, .home-hero .display, .home-hero .lede, .home-hero-actions > *, .home-hero-entry-note p, .home-hero-entry-note a",
          ),
        ];
        const gapAlongPlacement = (
          bubbleRect: ReturnType<typeof rect>,
          mascotRect: ReturnType<typeof rect>,
          placement: string,
        ) => (placement.startsWith("top") ? mascotRect.top - bubbleRect.bottom : bubbleRect.top - mascotRect.bottom);
        const bubblePlacement = bubble.dataset.placement || "";
        const obstructedByHomeCopy = widget.dataset.obstructingHomeCopy === "true";
        const overlays = [rect(mascot), rect(close), ...(bubble.dataset.visible === "true" ? [rect(bubble)] : [])];
        const overlapsHomepageCopy = homepageCopy.some((element) =>
          overlays.some((overlay) => overlaps(overlay, rect(element))),
        );
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          widget: rect(widget),
          bubble: rect(bubble),
          mascot: rect(mascot),
          close: rect(close),
          bubbleOverlapsClose: overlaps(rect(bubble), rect(close)),
          bubbleOverlapsMascot: overlaps(rect(bubble), rect(mascot)),
          bubbleOverlapsHomepageCta: overlaps(rect(bubble), rect(homepageCta)),
          bubbleMascotGap: gapAlongPlacement(rect(bubble), rect(mascot), bubblePlacement),
          bubblePlacement,
          bubbleMode: bubble.dataset.bubbleMode || "",
          nav: { ...rect(nav), display: getComputedStyle(nav).display },
          scrollWidth: document.documentElement.scrollWidth,
          animationName: getComputedStyle(document.querySelector(".floating-blessy__idle")!).animationName,
          pointerEvents: getComputedStyle(widget).pointerEvents,
          visibility: getComputedStyle(widget).visibility,
          bubbleVisibility: getComputedStyle(bubble).visibility,
          ariaHidden: widget.getAttribute("aria-hidden"),
          obstructedByHomeCopy,
          overlapsHomepageCopy,
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
      expect(geometry.visibility === "hidden").toBe(geometry.obstructedByHomeCopy);
      expect(geometry.bubbleVisibility === "hidden").toBe(geometry.obstructedByHomeCopy);
      expect(geometry.ariaHidden).toBe(String(geometry.obstructedByHomeCopy));
      expect(geometry.overlapsHomepageCopy).toBe(geometry.obstructedByHomeCopy);
      expect(geometry.bubbleOverlapsClose).toBe(false);
      expect(geometry.bubbleOverlapsMascot).toBe(false);
      expect(geometry.bubbleOverlapsHomepageCta).toBe(false);
      expect(geometry.bubbleMode).toBe("context");
      expect(geometry.bubbleMascotGap, viewport.width + "px bubble/mascot gap").toBeGreaterThanOrEqual(
        (viewport.width <= 800 ? 12 : 16) - 0.5,
      );

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
    await clearHomepageCopy(page);
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
    await clearHomepageCopy(page);
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
      page.getByText("Kalau Admin telat bales, sabar ya. Mungkin lagi ada tugas penting: nyuapin anak dulu."),
    ).toBeVisible();

    await page.locator('.customer-bottom-nav a[href="/account"]').click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-pose-id", "sleeping");
  });

  test("walks every primary public nav entry through an intentional Blessy context", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The public navigation harness runs once from the 390px customer project.",
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);

    const entries = [
      {
        label: "Beranda",
        href: "/",
        context: "home",
        pose: "greeting",
        copy: "Hallo, Selamat datang di Website Official BFG! Namaku Blessy!",
      },
      {
        label: "Ready Stock",
        href: "/ready-stock",
        context: "ready-stock",
        pose: "question",
        copy: "Mau cari buku yang bisa langsung dibawa pulang? Cek Ready Stock yuk!",
      },
      {
        label: "Komunitas",
        href: "/community",
        context: "community",
        pose: "greeting",
        copy: "Mau kenalan lebih dekat sama Blessfriends? Yuk lihat komunitasnya!",
      },
      {
        label: "Cara memesan",
        href: "/how-to-order",
        context: "how-to-order",
        pose: "apology",
        copy: "Masih bingung cara mesannya? Sini, aku bantu tunjukin alurnya ya!",
      },
      {
        label: "Secret Catalog",
        href: "/catalog",
        context: "catalog",
        pose: "question",
        copy: "Hari ini mau FIX buku apa?",
      },
      {
        label: "Gabung",
        href: "/join",
        context: "join",
        pose: "greeting",
        copy: "Mau gabung jadi bagian dari Blessfriends? Yuk, sini!",
      },
    ];

    const nav = page.getByRole("navigation", { name: "Navigasi utama" });
    await expect(nav.getByRole("link")).toHaveText(entries.map((entry) => entry.label));
    const widget = page.locator("[data-testid='floating-blessy']");

    for (const entry of entries) {
      await nav.getByRole("link", { name: entry.label }).click();
      await expect(page).toHaveURL(new RegExp(`${entry.href === "/" ? "\\/$" : entry.href + "$"}`));
      await expect(widget).toHaveAttribute("data-navigation-context", entry.context);
      await expect(widget).toHaveAttribute("data-pose-id", entry.pose);
      await expect(page.getByText(entry.copy, { exact: true })).toBeVisible();
    }
  });

  test("keeps one bubble mode through normal and rapid public navigation", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The bubble transition harness runs once from the customer project.",
    );
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);

    type BubbleSample = { bubbleCount: number; mode: string; visible: string; stage: string; text: string };
    const startRecording = () =>
      page.evaluate(() => {
        type RecordingWindow = Window & {
          __bfgBubbleSampleTimer?: number;
          __bfgBubbleSamples?: BubbleSample[];
        };
        const recordingWindow = window as RecordingWindow;
        const samples: BubbleSample[] = [];
        const sample = () => {
          const widget = document.querySelector<HTMLElement>("[data-testid='floating-blessy']");
          const bubbles = document.querySelectorAll<HTMLElement>("[data-testid='floating-blessy-bubble']");
          const bubble = bubbles[0];
          if (widget && bubble) {
            samples.push({
              bubbleCount: bubbles.length,
              mode: bubble.dataset.bubbleMode || "",
              visible: bubble.dataset.visible || "",
              stage: widget.dataset.stage || "",
              text: bubble.textContent?.trim() || "",
            });
          }
        };
        sample();
        recordingWindow.__bfgBubbleSamples = samples;
        recordingWindow.__bfgBubbleSampleTimer = window.setInterval(sample, 10);
      });
    const stopRecording = () =>
      page.evaluate(() => {
        type RecordingWindow = Window & {
          __bfgBubbleSampleTimer?: number;
          __bfgBubbleSamples?: BubbleSample[];
        };
        const recordingWindow = window as RecordingWindow;
        if (recordingWindow.__bfgBubbleSampleTimer !== undefined) {
          window.clearInterval(recordingWindow.__bfgBubbleSampleTimer);
          recordingWindow.__bfgBubbleSampleTimer = undefined;
        }
        return recordingWindow.__bfgBubbleSamples || [];
      });

    const assertModes = (samples: BubbleSample[]) => {
      expect(samples.length).toBeGreaterThan(5);
      for (const sample of samples) {
        expect(sample.bubbleCount).toBe(1);
        expect(["context", "cta", "hidden"]).toContain(sample.mode);
        if (sample.stage === "bubble-exit" || sample.stage === "pose-transition") {
          expect(sample.visible).not.toBe("true");
        }
        if (sample.mode === "context" && sample.visible === "true") {
          expect(sample.text).not.toContain("Klik aku kalau mau ngobrol langsung ya");
        }
        if (sample.mode === "cta" && sample.visible === "true") {
          expect(sample.text).toBe("Klik aku kalau mau ngobrol langsung ya");
        }
      }
    };

    const normalEntries = [
      {
        href: "/ready-stock",
        context: "ready-stock",
        copy: "Mau cari buku yang bisa langsung dibawa pulang? Cek Ready Stock yuk!",
      },
      {
        href: "/community",
        context: "community",
        copy: "Mau kenalan lebih dekat sama Blessfriends? Yuk lihat komunitasnya!",
      },
      {
        href: "/how-to-order",
        context: "how-to-order",
        copy: "Masih bingung cara mesannya? Sini, aku bantu tunjukin alurnya ya!",
      },
      { href: "/catalog", context: "catalog", copy: "Hari ini mau FIX buku apa?" },
      { href: "/join", context: "join", copy: "Mau gabung jadi bagian dari Blessfriends? Yuk, sini!" },
    ];

    for (const entry of normalEntries) {
      await startRecording();
      await page.locator("nav[aria-label='Navigasi utama'] a[href='" + entry.href + "']").click();
      await page.waitForTimeout(700);
      assertModes(await stopRecording());
      await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute(
        "data-navigation-context",
        entry.context,
      );
      await expect(page.getByText(entry.copy, { exact: true })).toBeVisible();
    }

    await startRecording();
    for (const href of ["/ready-stock", "/community", "/how-to-order", "/catalog", "/join"]) {
      const link = page.locator("nav[aria-label='Navigasi utama'] a[href='" + href + "']");
      await link.click({ noWaitAfter: true });
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(1_500);
    assertModes(await stopRecording());
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveAttribute("data-navigation-context", "join");
    await expect(page.getByText("Mau gabung jadi bagian dari Blessfriends? Yuk, sini!", { exact: true })).toBeVisible();
  });

  test("keeps bubble, mascot, and close geometry safe across dragged positions", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The close geometry harness runs once from the 390px customer project.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    const mascot = page.getByRole("link", { name: "Chat Admin BFG lewat WhatsApp" });
    const positions = [
      { x: 66, y: 102 },
      { x: 195, y: 102 },
      { x: 324, y: 102 },
      { x: 66, y: 408 },
      { x: 195, y: 408 },
      { x: 324, y: 408 },
      { x: 66, y: 700 },
      { x: 195, y: 700 },
      { x: 324, y: 700 },
    ];

    for (const position of positions) {
      const before = await mascot.boundingBox();
      if (!before) throw new Error("Blessy hit target has no geometry");
      await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
      await page.mouse.down();
      await page.mouse.move(position.x, position.y);
      await page.mouse.up();
      await page.waitForTimeout(50);

      const geometry = await page.evaluate(() => {
        const bubble = document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']");
        const mascot = document.querySelector<HTMLElement>(".floating-blessy__image");
        const close = document.querySelector<HTMLElement>(".floating-blessy__close");
        if (!bubble || !mascot || !close) throw new Error("Blessy geometry fixture is incomplete");
        const first = bubble.getBoundingClientRect();
        const character = mascot.getBoundingClientRect();
        const closeRect = close.getBoundingClientRect();
        return {
          bubbleOverlapsMascot:
            first.left < character.right &&
            first.right > character.left &&
            first.top < character.bottom &&
            first.bottom > character.top,
          bubbleMascotGap: bubble.dataset.placement?.startsWith("top")
            ? character.top - first.bottom
            : first.top - character.bottom,
          bubbleOverlapsClose:
            first.left < closeRect.right &&
            first.right > closeRect.left &&
            first.top < closeRect.bottom &&
            first.bottom > closeRect.top,
        };
      });
      expect(geometry.bubbleOverlapsMascot).toBe(false);
      expect(geometry.bubbleMascotGap).toBeGreaterThanOrEqual(11.5);
      expect(geometry.bubbleOverlapsClose).toBe(false);
      await expect(page.getByRole("button", { name: "Tutup Blessy" })).toBeVisible();
    }

    await page.getByRole("button", { name: "Tutup Blessy" }).click();
    await expect(page.locator("[data-testid='floating-blessy']")).toHaveCount(0);
  });

  test("keeps the CTA bubble outside the mascot across mobile and desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "customer-390", "The CTA geometry harness runs once.");
    test.setTimeout(60_000);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(9000);
      if (viewport.width <= 800) await clearHomepageCopy(page);
      await expect(page.locator("[data-testid='floating-blessy-bubble']")).toHaveAttribute("data-bubble-mode", "cta", {
        timeout: 15_000,
      });

      const geometry = await page.evaluate(() => {
        const cta = document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']");
        const mascot = document.querySelector<HTMLElement>(".floating-blessy__image");
        const close = document.querySelector<HTMLElement>(".floating-blessy__close");
        if (!cta || !mascot || !close) throw new Error("Blessy CTA geometry fixture is incomplete");
        const rect = (element: HTMLElement) => element.getBoundingClientRect();
        const bubble = rect(cta);
        const character = rect(mascot);
        const closeRect = rect(close);
        const overlaps = (first: DOMRect, second: DOMRect) =>
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top;
        return {
          mode: cta.dataset.bubbleMode,
          visible: cta.dataset.visible,
          overlapMascot: overlaps(bubble, character),
          overlapClose: overlaps(bubble, closeRect),
          gap: cta.dataset.placement?.startsWith("top") ? character.top - bubble.bottom : bubble.top - character.bottom,
        };
      });

      expect(geometry.overlapMascot).toBe(false);
      expect(geometry.overlapClose).toBe(false);
      expect(geometry.mode).toBe("cta");
      expect(geometry.visible).toBe("true");
      expect(geometry.gap).toBeGreaterThanOrEqual((viewport.width <= 800 ? 12 : 16) - 0.5);
    }
  });

  test("keeps the mascot as the WhatsApp action and separates drag from tap", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "customer-390",
      "The pointer harness runs once from the 390px customer project.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    await clearHomepageCopy(page);

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
    await page.waitForTimeout(1700);
    await clearHomepageCopy(page);
    await page.waitForTimeout(7200);
    await expect(page.locator("[data-testid='floating-blessy-bubble']")).toHaveAttribute("data-visible", "true");
    await expect(page.locator("[data-testid='floating-blessy-bubble']")).toHaveAttribute("data-bubble-mode", "cta");
    await expect(page.getByText("Klik aku kalau mau ngobrol langsung ya")).toBeVisible();
    const ctaLayout = await page
      .locator("[data-testid='floating-blessy-bubble'] .floating-blessy__bubble-inner")
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          display: style.display,
          alignItems: style.alignItems,
          justifyContent: style.justifyContent,
          textAlign: style.textAlign,
        };
      });
    expect(ctaLayout).toEqual({ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" });
  });
});
