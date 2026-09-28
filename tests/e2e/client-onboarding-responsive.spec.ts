import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const states = ["signed-out", "unadmitted", "pending", "approved", "active", "suspended", "admin", "owner"] as const;
const whatsappMessage =
  "Halo BFG, aku sudah mengisi pendaftaran Blessfriends di website. Aku ingin meminta link untuk bergabung ke WhatsApp Group BFG.";

test("renders onboarding state matrix and Phase 3 homepage and guide at responsive widths @customer", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "customer-390",
    "This explicit responsive matrix runs once from the 390px customer project.",
  );
  test.setTimeout(240_000);
  const evidenceDirectory = testInfo.outputPath();
  await mkdir(evidenceDirectory, { recursive: true });
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style), { once: true });
  });

  for (const state of states) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/verification/onboarding?state=${state}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("onboarding-presentation-state")).toHaveAttribute("data-state", state);
    await expect(page.getByTestId("floating-blessy")).toBeVisible();
    const region = page.locator(".home-onboarding-main");
    const onboarding = region;
    const quickGuidance = page.locator(".home-quick-guidance:visible").first();
    await expect(page.locator(".home-quick-guidance:visible")).toHaveCount(1);
    await expect(quickGuidance).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "WhatsApp jadi ruang utama komunitas Blessfriends." }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Dapatkan kurasi buku, informasi PO, dan update terbaru melalui WhatsApp Group BFG. Website digunakan untuk belanja, melihat pesanan, tagihan, dan tracking buku.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gabung WhatsApp Group Blessing For Good" })).toBeVisible();
    const joinGroup = page.getByRole("link", { name: "Minta link WhatsApp Group" }).first();
    await expect(joinGroup).toHaveAttribute("href", "https://wa.me/6282347278881");
    await expect(page.getByRole("heading", { name: "Secret Catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ready Stock", exact: true })).toBeVisible();
    await expect(page.getByText("Pilihan Utama", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Temukan Buku", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Mulai dari buku yang ingin kamu temukan.", { exact: true })).toHaveCount(0);
    await expect(quickGuidance.locator(".home-guidance-disclosure")).toHaveCount(2);
    await expect(
      page.getByText("Buku Ready Stock tersedia untuk dipesan langsung oleh Blessfriends melalui website."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Katalog buku dari PO yang sedang berjalan. Access code Secret Catalog dibagikan melalui WhatsApp Group BFG.",
      ),
    ).toBeVisible();

    if (state === "signed-out" || state === "unadmitted") {
      await expect(region).toBeVisible();
      await expect(region.getByRole("link", { name: "Daftar Blessfriend" })).toHaveAttribute("href", "/join");
    } else if (state === "pending") {
      await expect(page.getByRole("heading", { name: "Pendaftaranmu sudah diterima." })).toBeVisible();
      const whatsapp = onboarding.getByRole("link", { name: "Minta link WhatsApp Group" });
      const url = new URL((await whatsapp.getAttribute("href"))!);
      expect(url.origin).toBe("https://wa.me");
      expect(url.pathname).toBe("/6282347278881");
      expect(url.searchParams.get("text")).toBe(whatsappMessage);
      await expect(onboarding.getByRole("link", { name: "Daftar Blessfriend" })).toHaveCount(0);
    } else if (state === "approved") {
      await expect(page.getByRole("heading", { name: "Pendaftaranmu sudah disetujui." })).toBeVisible();
      await expect(page.getByText("Cek email untuk menyelesaikan aktivasi akun.")).toBeVisible();
      await expect(onboarding.getByRole("link", { name: "Daftar Blessfriend" })).toHaveCount(0);
      await expect(onboarding.getByRole("link", { name: "Minta link WhatsApp Group" })).toHaveCount(0);
    } else if (state === "active") {
      await expect(onboarding).toBeVisible();
      await expect(onboarding.getByRole("heading", { name: "Account Blessfriend" })).toBeVisible();
      await expect(onboarding.getByRole("link", { name: "Buka account Blessfriend" })).toHaveAttribute(
        "href",
        "/account",
      );
      await expect(onboarding.getByRole("link", { name: "Daftar Blessfriend" })).toHaveCount(0);
    } else if (state === "suspended") {
      await expect(onboarding).toBeVisible();
      await expect(onboarding.getByText("Akun Blessfriend ini sedang ditangguhkan.")).toBeVisible();
      await expect(onboarding.getByRole("link", { name: "Daftar Blessfriend" })).toHaveCount(0);
      await expect(onboarding.getByRole("link", { name: "Buka account Blessfriend" })).toHaveCount(0);
    } else {
      await expect(onboarding).toHaveCount(0);
      await expect(region).toHaveCount(0);
    }

    if (state === "signed-out") {
      const orderGuide = quickGuidance.locator("details").nth(0);
      await orderGuide.locator("summary").click();
      const orderLink = orderGuide.getByRole("link", { name: "Lihat cara pesan" });
      await expect(orderLink).toHaveAttribute("href", "/how-to-order");
      await orderLink.click();
      await expect(page).toHaveURL(/\/how-to-order$/);
      await expect(
        page.locator(".how-to-order-page:visible").first().getByRole("heading", {
          name: "Dari memilih buku sampai tiba di tanganmu.",
        }),
      ).toBeVisible();
      await expect(
        page
          .locator(".how-to-order-page:visible")
          .first()
          .getByText(/Admin menerbitkan invoice sesuai proses BFG/),
      ).toBeVisible();
      await expect(
        page
          .locator(".how-to-order-page:visible")
          .first()
          .getByText(/notifikasi akan muncul di akun Blessfriend/),
      ).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/verification\/onboarding\?state=signed-out$/);

      const ongoingPo = page.locator(".home-quick-guidance:visible").first().locator("details").nth(1);
      await ongoingPo.locator("summary").click();
      const catalogLink = ongoingPo.getByRole("link", { name: "Buka Secret Catalog" });
      await expect(catalogLink).toHaveAttribute("href", "/catalog");
      await catalogLink.click();
      await expect(page).toHaveURL(/\/catalog$/);
      await expect(page.locator(".catalog-access:visible")).toBeVisible();
      await expect(page.getByLabel("Kode akses Secret Catalog")).toBeVisible();
      await expect(page.locator(".catalog-grid")).toHaveCount(0);
      await page.goto("/verification/onboarding?state=signed-out", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("onboarding-presentation-state")).toHaveAttribute("data-state", "signed-out");
    }

    const anchor = state === "active" ? quickGuidance : onboarding;
    if (await anchor.count()) await anchor.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDirectory}/state-${state}-390.png`, fullPage: true });
  }

  await page.goto("/verification/onboarding?state=active", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("onboarding-presentation-state")).toHaveAttribute("data-state", "active");
  await expect(page.locator(".home-onboarding-main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account Blessfriend" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Daftar Blessfriend" })).toHaveCount(0);

  const widths = [375, 390, 430, 768, 834, 1024, 1280, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/verification/onboarding?state=active", { waitUntil: "domcontentloaded" });
    const widget = page.getByTestId("floating-blessy");
    await expect(widget).toBeVisible();
    const quickGuidance = page.locator(".home-quick-guidance:visible").first();
    await expect(quickGuidance).toBeVisible();
    await expect(page.locator(".hero-copy > .eyebrow")).toHaveText("Official website Blessing For Good");
    await expect(page.getByRole("heading", { name: "Specialist Children & Collector Books" })).toBeVisible();
    await expect(
      page.getByText(
        "Kami mengkurasi children books, novel books, dan collector special edition pilihan untuk Blessfriends.",
      ),
    ).toBeVisible();
    await expect(
      page
        .locator(".home-page > section")
        .evaluateAll((sections) =>
          sections.map(
            (section) =>
              section.id || [...section.classList].find((name) => !["section", "section-block", "hero"].includes(name)),
          ),
        ),
    ).resolves.toEqual([
      "home-hero",
      "home-channel-section",
      "cara-order",
      "join-whatsapp",
      "akses-buku",
      "home-quick-guidance",
      "bfg-story",
    ]);
    await expect(
      page
        .locator(".home-access-grid > *")
        .evaluateAll((cards) =>
          cards.map((card) =>
            card.classList.contains("discovery-card-secret")
              ? "secret"
              : card.classList.contains("home-onboarding-main")
                ? "account"
                : "ready",
          ),
        ),
    ).resolves.toEqual(["secret", "account", "ready"]);
    await expect(page.getByRole("heading", { name: "Cara Pembelian di Blessing For Good" })).toBeVisible();
    await expect(page.locator(".home-order-section .order-step-content p")).toHaveText([
      "Bergabung ke WhatsApp Group BFG untuk mendapatkan update, kurasi buku, dan informasi PO.",
      "Gunakan account Blessfriend untuk melihat pesanan, PO yang sedang berjalan, tagihan, dan tracking buku.",
      "Pemesanan dapat dilakukan melalui website atau dikonfirmasi melalui WhatsApp Group BFG.",
    ]);
    await expect(page.getByRole("link", { name: "Lihat Ready Stock" }).first()).toHaveAttribute("href", "/ready-stock");
    await expect(page.getByRole("link", { name: "Buka Secret Catalog" }).first()).toHaveAttribute("href", "/catalog");
    await expect(page.getByText("Cara pesan di BFG", { exact: true })).toBeVisible();
    await expect(page.getByText("Lihat PO yang sedang berjalan", { exact: true })).toBeVisible();
    const metrics = await page.evaluate(() => {
      const box = (element: Element | null) => {
        if (!element) return null;
        const { x, y, width: w, height: h, top, right, bottom, left } = element.getBoundingClientRect();
        return { x, y, width: w, height: h, top, right, bottom, left };
      };
      const hero = document.querySelector(".home-hero");
      const heroTitle = document.querySelector("#home-title");
      const primary = document.querySelector(".home-hero-actions a[href='/ready-stock']");
      const guidance = document.querySelector(".home-quick-guidance");
      const summary = guidance?.querySelector("summary") ?? null;
      const ready = document.querySelector(".discovery-card-ready");
      const secret = document.querySelector(".discovery-card-secret");
      const join = document.querySelector(".community-section");
      const account = document.querySelector(".home-onboarding-main");
      const widget = document.querySelector<HTMLElement>("[data-testid='floating-blessy']");
      const bubble = document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']");
      const shell = document.querySelector<HTMLElement>(".site-shell");
      const nav = document.querySelector(".customer-bottom-nav");
      const lastNavLink = nav?.querySelector("a:last-child") ?? null;
      const lastNavRect = lastNavLink?.getBoundingClientRect();
      const navHit = lastNavRect
        ? document.elementFromPoint(lastNavRect.x + lastNavRect.width / 2, lastNavRect.y + lastNavRect.height / 2)
        : null;
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        hero: box(hero),
        heroTitle: box(heroTitle),
        primary: box(primary),
        guidance: box(guidance),
        summary: box(summary),
        join: box(join),
        account: box(account),
        ready: box(ready),
        secret: box(secret),
        blessy: box(widget),
        blessyBubbleDisplay: bubble ? getComputedStyle(bubble).display : null,
        blessyAfterShell: Boolean(
          widget && shell && widget.getBoundingClientRect().top >= shell.getBoundingClientRect().bottom - 1,
        ),
        nav: box(nav),
        navVisible: Boolean(nav && nav.getBoundingClientRect().height > 0),
        navHit: Boolean(lastNavLink && navHit && lastNavLink.contains(navHit)),
      };
    });

    console.log(`HOME_GEOMETRY ${JSON.stringify({ width, ...metrics })}`);
    expect(metrics.overflow, `${width}px horizontal overflow`).toBe(false);
    expect(metrics.hero?.left, `${width}px hero left edge`).toBeGreaterThanOrEqual(0);
    expect(metrics.hero?.right, `${width}px hero right edge`).toBeLessThanOrEqual(width);
    expect(metrics.heroTitle?.right, `${width}px hero title right edge`).toBeLessThanOrEqual(width);
    expect(metrics.primary?.height, `${width}px primary CTA target`).toBeGreaterThanOrEqual(44);
    expect(metrics.primary?.top, `${width}px primary CTA in viewport`).toBeGreaterThanOrEqual(0);
    expect(metrics.guidance?.width, `${width}px quick guide width`).toBeGreaterThan(0);
    expect(metrics.summary?.height, `${width}px disclosure target`).toBeGreaterThanOrEqual(44);
    expect(metrics.join?.width, `${width}px Join WhatsApp block`).toBeGreaterThan(0);
    expect(metrics.account?.width, `${width}px Blessfriend account block`).toBeGreaterThan(0);
    expect(metrics.ready?.width, `${width}px Ready Stock card`).toBeGreaterThan(0);
    expect(metrics.secret?.width, `${width}px Secret Catalog card`).toBeGreaterThan(0);
    expect(metrics.blessy?.width, `${width}px Blessy footprint`).toBeGreaterThan(0);
    expect(metrics.blessyAfterShell, `${width}px Blessy follows page content`).toBe(true);
    expect(metrics.blessyBubbleDisplay, `${width}px homepage bubble stays out of content`).toBe("none");
    if (width <= 800) {
      expect(metrics.navVisible, `${width}px bottom navigation`).toBe(true);
      expect(metrics.navHit, `${width}px bottom navigation hit target`).toBe(true);
    }
    await page.screenshot({ path: `${evidenceDirectory}/home-${width}.png`, fullPage: true });
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/verification/how-to-order?state=active", { waitUntil: "domcontentloaded" });
    const howToPage = page.locator(".how-to-order-page:visible").first();
    await expect(page.locator(".how-to-order-page:visible")).toHaveCount(1);
    await expect(howToPage.getByRole("heading", { name: "Dari memilih buku sampai tiba di tanganmu." })).toBeVisible();
    const journey = howToPage.getByRole("list", { name: "Langkah cara memesan" });
    await expect(journey.locator(":scope > li")).toHaveCount(7);
    await expect(journey.locator("h3")).toHaveText([
      "Pilih bukunya",
      "History order buku kamu",
      "Invoice",
      "Pembayaran",
      "Pelunasan",
      "Cek perjalanan buku kamu",
      "Buku sampai",
    ]);
    await expect(howToPage.getByText("Ketentuan order di BFG")).toBeVisible();
    await expect(
      howToPage.getByText("Harap baca ketentuan order agar Blessfriends memahami proses pembelian di BFG."),
    ).toBeVisible();
    await expect(howToPage.getByText(/Admin menerbitkan invoice sesuai proses BFG/)).toBeVisible();
    await expect(howToPage.getByText(/Ketentuan DP mengikuti masing-masing PO/)).toBeVisible();
    await expect(howToPage.getByText(/sekitar 3–5 minggu/)).toBeVisible();
    await expect(howToPage.getByText(/sekitar 4–5 bulan/)).toBeVisible();
    await expect(howToPage.getByText(/Jika ada buku OOS atau ditemukan defect/)).toBeVisible();
    const widget = page.getByTestId("floating-blessy");
    await expect(widget).toBeVisible();
    await expect(howToPage.getByRole("link", { name: /Tonton panduan penggunaan/ })).toHaveCount(0);
    const geometry = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      page: document.querySelector<HTMLElement>(".how-to-order-page")?.getBoundingClientRect().width ?? 0,
      lastStep: document.querySelector<HTMLElement>(".order-step:last-child")?.getBoundingClientRect().width ?? 0,
      shell: document.querySelector<HTMLElement>(".site-shell")?.getBoundingClientRect().bottom ?? 0,
      widget: document.querySelector<HTMLElement>("[data-testid='floating-blessy']")?.getBoundingClientRect().top ?? 0,
      bubbleDisplay: getComputedStyle(document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']")!)
        .display,
      bottomNav: document.querySelector<HTMLElement>(".customer-bottom-nav")
        ? getComputedStyle(document.querySelector<HTMLElement>(".customer-bottom-nav")!).display
        : "none",
    }));
    console.log(`HOW_TO_ORDER_GEOMETRY ${JSON.stringify(geometry)}`);
    expect(geometry.scrollWidth, `${width}px How To Order overflow`).toBeLessThanOrEqual(width + 1);
    expect(geometry.page, `${width}px How To Order page width`).toBeGreaterThan(0);
    expect(geometry.lastStep, `${width}px final step width`).toBeGreaterThan(0);
    expect(geometry.widget, `${width}px Blessy follows page content`).toBeGreaterThanOrEqual(geometry.shell - 1);
    expect(geometry.bubbleDisplay, `${width}px How To Order bubble stays out of copy`).toBe("none");
    if (width <= 800) expect(geometry.bottomNav, `${width}px bottom navigation`).not.toBe("none");
    await page.screenshot({ path: `${evidenceDirectory}/how-to-order-${width}.png`, fullPage: true });
  }

  await page.goto("/verification/onboarding?state=signed-out", { waitUntil: "domcontentloaded" });
  const close = page.getByRole("button", { name: "Tutup informasi selamat datang" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".home-onboarding-main")).toHaveCount(0);
});

test("keeps in-flow Blessy clear of copy, actions, and mobile navigation @customer", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "customer-390",
    "The Blessy geometry matrix runs once from the 390px customer project.",
  );
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style), { once: true });
  });
  for (const width of [375, 390, 430, 768, 834]) {
    for (const route of ["/verification/onboarding?state=active", "/verification/how-to-order?state=active"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const widget = page.getByTestId("floating-blessy");
      await expect(widget).toBeVisible();
      const geometry = await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        const box = (element: Element | null) => {
          if (!element) return null;
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        const overlaps = (first: ReturnType<typeof box>, second: ReturnType<typeof box>) =>
          Boolean(
            first &&
            second &&
            first.left < second.right &&
            first.right > second.left &&
            first.top < second.bottom &&
            first.bottom > second.top,
          );
        const blessing = document.querySelector<HTMLElement>("[data-testid='floating-blessy']");
        const shell = document.querySelector<HTMLElement>(".site-shell");
        const nav = document.querySelector<HTMLElement>(".customer-bottom-nav");
        const bubble = document.querySelector<HTMLElement>("[data-testid='floating-blessy-bubble']");
        const targets = [
          ...document.querySelectorAll(
            ".home-hero-actions, .community-copy .button, .discovery-card .button, .home-onboarding-actions .button, .how-to-order-page .actions, .order-step",
          ),
        ];
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          afterContent: Boolean(
            blessing && shell && blessing.getBoundingClientRect().top >= shell.getBoundingClientRect().bottom - 1,
          ),
          navClearance: Boolean(
            blessing && nav && blessing.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top - 1,
          ),
          bubbleDisplay: bubble ? getComputedStyle(bubble).display : null,
          overlapsActionOrCopy: targets.some((target) => overlaps(box(blessing), box(target))),
        };
      });
      expect(geometry.overflow).toBe(false);
      expect(geometry.afterContent).toBe(true);
      expect(geometry.bubbleDisplay).toBe("none");
      expect(geometry.overlapsActionOrCopy).toBe(false);
      if (width <= 800) expect(geometry.navClearance).toBe(true);
    }
  }
});
