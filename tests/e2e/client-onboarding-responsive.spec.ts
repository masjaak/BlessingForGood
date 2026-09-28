import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const states = ["signed-out"] as const;

test("renders the client redline homepage and guide at responsive widths @customer", async ({ page }, testInfo) => {
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
    await expect(page.getByText("Baru di BFG?", { exact: true })).toBeVisible();
    await expect(page.locator(".home-hero .home-hero-entry-note")).toHaveCount(1);
    await expect(page.locator(".home-channel-section")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "WhatsApp jadi ruang utama komunitas Blessfriends." })).toHaveCount(
      0,
    );
    await expect(
      page.getByText(
        "WhatsApp sebagai media utama kami, website sebagai tempat untuk belanja para Blessfriends menjadi pengalaman yang menyenangkan",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Dapatkan kurasi buku, informasi PO, dan update terbaru melalui WhatsApp Group BFG. Website digunakan untuk belanja, melihat pesanan, tagihan, dan tracking buku.",
        { exact: true },
      ),
    ).toHaveCount(0);
    const joinCard = page.getByTestId("join-whatsapp");
    await expect(joinCard.getByText("GABUNG WHATSAPP GROUP", { exact: true })).toBeVisible();
    await expect(joinCard.getByRole("heading", { name: "BLESSING FOR GOOD" })).toBeVisible();
    await expect(
      joinCard.getByText(
        "wajib join sebelum daftar account website, kami akan menurunkan kurasi buku2 kami disana setiap hari",
      ),
    ).toBeVisible();
    await expect(joinCard.locator(".community-mascot")).toBeVisible();
    await expect(joinCard.getByRole("heading", { name: "Gabung WhatsApp Group Blessing For Good" })).toHaveCount(0);
    await expect(joinCard.getByText("Komunitas BFG", { exact: true })).toHaveCount(0);
    await expect(
      joinCard.getByText(
        "Wajib bergabung sebelum menyelesaikan pendaftaran Blessfriend. Di WhatsApp Group BFG kami membagikan kurasi buku, informasi PO, dan update terbaru.",
        { exact: true },
      ),
    ).toHaveCount(0);
    const joinGroup = page.getByRole("link", { name: "Minta link WhatsApp Group" }).first();
    await expect(joinGroup).toHaveAttribute("href", "https://wa.me/6282347278881");
    const secretCard = page.getByTestId("secret-catalog");
    await expect(secretCard.locator(":scope > .discovery-card-heading")).toHaveCount(1);
    await expect(secretCard.locator(":scope > .discovery-card-heading .discovery-lock svg")).toBeVisible();
    await expect(secretCard.getByText("AKSES PRIVAT", { exact: true })).toBeVisible();
    await expect(secretCard.locator(".community-mascot, .home-onboarding-mascot")).toHaveCount(0);
    await expect(secretCard.getByRole("heading", { name: "Secret Catalog" })).toBeVisible();
    await expect(secretCard.getByRole("link", { name: "Buka Secret Catalog" })).toHaveAttribute("href", "/catalog");
    const readyCard = page.getByTestId("ready-stock");
    await expect(readyCard.getByRole("heading", { name: "Ready Stock", exact: true })).toBeVisible();
    await expect(readyCard.locator(".eyebrow")).toHaveCount(0);
    await expect(readyCard.getByRole("link", { name: "Lihat Ready Stock" })).toHaveAttribute("href", "/ready-stock");
    await expect(page.getByText("PILIHAN UTAMA", { exact: true })).toHaveCount(0);
    await expect(page.getByText("KOMUNITAS BFG", { exact: true })).toHaveCount(0);
    await expect(page.getByText("TEMUKAN BUKU", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Mulai dari buku yang ingin kamu temukan.", { exact: true })).toHaveCount(0);
    await expect(page.locator(".home-order-section, .order-steps-preview")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Temukan bukunya", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pesan dengan alur yang jelas." })).toHaveCount(0);
    await expect(page.locator(".discovery-section > .section-heading")).toHaveCount(0);
    await expect(page.locator(".discovery-section > .home-access-grid")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Akses buku untuk Blessfriends" })).toHaveCount(0);
    await expect(
      page.getByText("Pilih katalog sesuai aksesmu, lalu gunakan account Blessfriend untuk mengelola pesanan.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "buku yang readystock di blessing for good, bisa langsung di checkout setelah bergabung menjadi Blessfriends",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("katalog buku PO berjalan, akses code secret akan diberikan di whatsapp group", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Katalog buku dari PO yang sedang berjalan. Access code Secret Catalog dibagikan melalui WhatsApp Group BFG.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText("Buku Ready Stock tersedia untuk dipesan langsung oleh Blessfriends melalui website.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Account Blessfriend digunakan untuk melihat katalog PO, memesan buku, mengecek riwayat pesanan, tagihan, dan perjalanan buku.",
        { exact: true },
      ),
    ).toHaveCount(0);
    const journey = page.locator(".home-journey");
    await expect(journey.getByRole("heading", { name: "cara pembelian di Blessing for good" })).toBeVisible();
    await expect(journey.locator(".hero-sequence > li")).toHaveCount(3);
    await expect(journey.locator(".hero-sequence strong")).toHaveText([
      "gabung ke whatsapp group",
      "buat account di website kami",
      "pilih buku yang ingin dibeli",
    ]);
    await expect(journey.getByText("Temukan", { exact: true })).toHaveCount(0);
    await expect(journey.getByText("Pesan", { exact: true })).toHaveCount(0);
    await expect(journey.getByText("Ikuti", { exact: true })).toHaveCount(0);
    await expect(page.locator(".community-section")).toHaveCount(0);
    expect((await page.locator(".home-hero h1").textContent())?.trim()).not.toBe(
      "Specialist Children & Collector Books",
    );
    await expect(page.getByText("Official website Blessing For Good", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        "Kami mengkurasi children books, novel books, dan collector special edition pilihan untuk Blessfriends.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(page.locator(".hero-copy > .eyebrow")).toHaveText("official website blessing for good");
    await expect(page.locator(".home-hero h1")).toHaveText("SPECIALIST CHILDREN & COLLECTOR BOOKS 📚");
    await expect(page.locator(".home-hero .lede")).toHaveText(
      "kami mengkurasi buku-buku children books, novel books dan collector special edition",
    );
    await expect(page.getByText("Rumah buku pilihan untuk Blessfriends", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Specialist Children & Collector Books", exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("heading", { name: "Semua bisa dimulai dari satu buku yang tepat.", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Blessing For Good adalah community-led imported bookstore yang membantu Blessfriends menemukan buku impor berbahasa Inggris—dari Ready Stock sampai preorder—sedikit demi sedikit.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "pelajari ketentuan PO buku di kami" })).toHaveAttribute(
      "href",
      "/how-to-order",
    );

    await expect(region).toBeVisible();
    await expect(region.getByText("ACCOUNT BLESSFRIEND", { exact: true })).toBeVisible();
    await expect(region.getByRole("heading", { name: "Buat account website untuk Blessfriends" })).toBeVisible();
    await expect(region.getByRole("button", { name: "Tutup informasi selamat datang" })).toBeVisible();
    await expect(
      region.getByText(
        "wajib jika ingin melihat katalog PO berjalan, memesan buku, dan check perjalanan buku baik fix di group / pembelian di website",
      ),
    ).toBeVisible();
    await expect(
      region.getByText("Untuk menjadi Blessfriend, bergabung ke WhatsApp Group BFG dan daftar melalui website."),
    ).toHaveCount(0);
    await expect(region.getByRole("link", { name: "Daftar Blessfriend" })).toHaveAttribute("href", "/join");

    const orderGuide = page.locator(".home-onboarding-how-to");
    await orderGuide.locator("summary").click();
    const previewSteps = orderGuide.getByRole("list", { name: "Langkah cara memesan" });
    await expect(previewSteps.locator(":scope > li")).toHaveCount(7);
    await orderGuide.locator("summary").click();
    const orderLink = page.getByRole("link", { name: "pelajari ketentuan PO buku di kami" });
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
        .getByText(
          "harap dibaca untuk ketentuan order di kami, agar setelahnya Blessfriends mengetahui sistem pembelian di kami",
        ),
    ).toBeVisible();
    await expect(
      page
        .locator(".how-to-order-page:visible")
        .first()
        .getByText(/invoice akan muncul di website h\+1\/h\+2/),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/verification\/onboarding\?state=signed-out$/);

    const anchor = onboarding;
    if (await anchor.count()) await anchor.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidenceDirectory}/state-${state}-390.png`, fullPage: true });
  }

  await page.goto("/verification/onboarding?state=signed-out", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("onboarding-presentation-state")).toHaveAttribute("data-state", "signed-out");
  await expect(page.locator(".home-onboarding-main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buat account website untuk Blessfriends" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Daftar Blessfriend" })).toHaveAttribute("href", "/join");

  const widths = [375, 390, 430, 768, 1024, 1280, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/verification/onboarding?state=signed-out", { waitUntil: "domcontentloaded" });
    const widget = page.getByTestId("floating-blessy");
    await expect(widget).toBeVisible();
    await expect(page.locator(".home-onboarding-how-to")).toBeVisible();
    await expect(page.locator(".hero-copy > .eyebrow")).toHaveText("official website blessing for good");
    await expect(page.getByRole("heading", { name: "SPECIALIST CHILDREN & COLLECTOR BOOKS 📚" })).toBeVisible();
    await expect(
      page.getByText("kami mengkurasi buku-buku children books, novel books dan collector special edition"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "cara pembelian di Blessing for good" })).toBeVisible();
    await expect(
      page
        .locator(".home-page > section")
        .evaluateAll((sections) =>
          sections.map(
            (section) =>
              section.id || [...section.classList].find((name) => !["section", "section-block", "hero"].includes(name)),
          ),
        ),
    ).resolves.toEqual(["home-hero", "akses-buku", "bfg-story"]);
    await expect(
      page
        .locator(".home-access-grid > [data-testid]")
        .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-testid"))),
    ).resolves.toEqual(["join-whatsapp", "secret-catalog", "ready-stock", "blessfriend-account"]);
    const cards = await page.locator(".home-access-grid > [data-testid]").evaluateAll((elements) =>
      elements.map((card) => {
        const main = card.querySelector<HTMLElement>(".home-onboarding-main");
        const mascot = card.querySelector<HTMLElement>(".community-mascot, .home-onboarding-mascot");
        const art = card.querySelector<HTMLElement>(".discovery-card-art-slot, .home-onboarding-art");
        const close = card.querySelector<HTMLElement>(".home-onboarding-dismiss");
        const copy = card.querySelector<HTMLElement>(
          card.matches("[data-testid='blessfriend-account']") ? ".home-onboarding-copy" : ".discovery-card-copy",
        );
        const action = card.matches("#blessfriend-account")
          ? card.querySelector<HTMLElement>(".home-onboarding-actions > .button")
          : card.querySelector<HTMLElement>(":scope > .button");
        const target = action?.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        return {
          id: card.getAttribute("data-testid"),
          left: cardBox.left,
          top: cardBox.top,
          bottom: cardBox.bottom,
          width: cardBox.width,
          height: cardBox.height,
          paddingLeft: Number.parseFloat(style.paddingLeft),
          paddingRight: Number.parseFloat(style.paddingRight),
          paddingBottom: Number.parseFloat(style.paddingBottom),
          borderLeft: Number.parseFloat(style.borderLeftWidth),
          borderRight: Number.parseFloat(style.borderRightWidth),
          borderBottom: Number.parseFloat(style.borderBottomWidth),
          button: target
            ? { left: target.left, top: target.top, bottom: target.bottom, width: target.width, height: target.height }
            : null,
          copy: copy?.getBoundingClientRect().toJSON(),
          art: art?.getBoundingClientRect().toJSON(),
          mascot: mascot?.getBoundingClientRect().toJSON(),
          close: close?.getBoundingClientRect().toJSON(),
          onboardingMain: main?.getBoundingClientRect().toJSON(),
        };
      }),
    );
    expect(cards).toHaveLength(4);
    expect(cards.every((card) => card.copy && card.copy.width > 0 && card.copy.height > 0)).toBe(true);
    expect(cards[0].art && cards[0].art.width > 0 && cards[0].art.height > 0).toBe(true);
    expect(cards[3].art && cards[3].art.width > 0 && cards[3].art.height > 0).toBe(true);
    expect(cards.every((card) => card.art && card.art.width > 0 && card.art.height > 0)).toBe(true);
    expect(cards.every((card) => card.button && card.button.height >= 44)).toBe(true);
    expect(new Set(cards.map((card) => card.button?.height)).size).toBe(1);
    expect(cards.every((card) => card.copy && card.button && card.copy.bottom <= card.button.top)).toBe(true);
    const cardContentFits = cards.map((card) => ({
      id: card.id,
      fits: Boolean(
        card.copy &&
        card.button &&
        card.copy.left >= card.left + card.paddingLeft + card.borderLeft - 1 &&
        card.copy.right <= card.left + card.width - card.paddingRight - card.borderRight + 1 &&
        card.button.left + card.button.width <= card.left + card.width - card.paddingRight - card.borderRight + 1,
      ),
      copyRight: card.copy?.right,
      buttonRight: card.button ? card.button.left + card.button.width : null,
      contentRight: card.left + card.width - card.paddingRight - card.borderRight,
    }));
    expect(
      cardContentFits.every((card) => card.fits),
      `${width}px card content bounds: ${JSON.stringify(cardContentFits)}`,
    ).toBe(true);
    expect(
      cards.every(
        (card) => card.button && Math.abs(card.button.left - card.left - card.paddingLeft - card.borderLeft) <= 1,
      ),
    ).toBe(true);
    expect(
      cards.every(
        (card) =>
          card.button &&
          Math.abs(
            card.button.width -
              (card.width - card.paddingLeft - card.paddingRight - card.borderLeft - card.borderRight),
          ) <= 1,
      ),
    ).toBe(true);
    expect(
      cards.every(
        (card) =>
          card.button && Math.abs(card.bottom - card.button.bottom - card.paddingBottom - card.borderBottom) <= 1,
      ),
    ).toBe(true);
    const expectedColumns = width >= 901 ? 3 : width > 640 ? 2 : 1;
    const actualColumns = await page
      .locator(".home-access-grid")
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    expect(actualColumns, `${width}px access-card column count`).toBe(expectedColumns);
    if (width <= 640) {
      expect(cards[0].top).toBeLessThan(cards[1].top);
      expect(cards[1].top).toBeLessThan(cards[2].top);
      expect(cards[2].top).toBeLessThan(cards[3].top);
    } else if (width <= 900) {
      expect(Math.abs(cards[0].top - cards[1].top)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[2].top - cards[3].top)).toBeLessThanOrEqual(1);
      expect(cards[2].top).toBeGreaterThan(cards[0].top);
    } else {
      expect(Math.abs(cards[0].top - cards[1].top)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[1].top - cards[2].top)).toBeLessThanOrEqual(1);
      expect(cards[3].top).toBeGreaterThan(cards[0].top);
      expect(Math.abs(cards[0].left - cards[3].left)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[0].width - cards[1].width)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[1].width - cards[2].width)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[0].height - cards[1].height)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[1].height - cards[2].height)).toBeLessThanOrEqual(1);
    }
    for (const card of [cards[0], cards[3]]) {
      const mascot = card.mascot;
      const copy = card.copy;
      const button = card.button;
      const art = card.art;
      expect(mascot && copy && button).toBeTruthy();
      expect(art!.bottom).toBeLessThanOrEqual(button!.top);
      expect(mascot!.bottom).toBeLessThanOrEqual(button!.top);
      expect(mascot!.top).toBeGreaterThanOrEqual(copy!.bottom);
      expect(Math.abs(mascot!.left + mascot!.width / 2 - (card.left + card.width / 2))).toBeLessThanOrEqual(3);
      expect(copy!.bottom).toBeLessThanOrEqual(mascot!.top);
      expect(card.id === "join-whatsapp" || (card.close && card.close.bottom < mascot!.top)).toBe(true);
    }
    await expect(page.locator(".home-journey .hero-sequence small")).toHaveText([
      "agar kami lebih mudah reachout customer, kami mewajibkan customer kami bergabung di WA group",
      "untuk memantau pesanan buku, check buku PO berjalan & melakukan pemesanan",
      "bisa melakukan pembelian via website / fix langsung di WA group kami",
    ]);
    await expect(page.getByRole("link", { name: "Lihat Ready Stock" }).first()).toHaveAttribute("href", "/ready-stock");
    await expect(page.getByRole("link", { name: "Buka Secret Catalog" }).first()).toHaveAttribute("href", "/catalog");
    await expect(page.locator(".home-onboarding-how-to > summary")).toContainText("Cara Pesan & Cek Katalog PO");
    const metrics = await page.evaluate(() => {
      const box = (element: Element | null) => {
        if (!element) return null;
        const { x, y, width: w, height: h, top, right, bottom, left } = element.getBoundingClientRect();
        return { x, y, width: w, height: h, top, right, bottom, left };
      };
      const hero = document.querySelector(".home-hero");
      const heroTitle = document.querySelector("#home-title");
      const primary = document.querySelector(".home-hero-actions a[href='/ready-stock']");
      const guidance = document.querySelector(".home-onboarding-main");
      const summary = document.querySelector(".home-onboarding-how-to > summary");
      const ready = document.querySelector(".discovery-card-ready");
      const secret = document.querySelector(".discovery-card-secret");
      const join = document.querySelector("[data-testid='join-whatsapp']");
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
    if (width === 1440) {
      console.log(
        `HOME_CARD_BUTTON_WIDTHS_1440 ${JSON.stringify(Object.fromEntries(cards.map((card) => [card.id, card.button?.width])))}`,
      );
      await expect(page.locator("#join-title > span")).toHaveText(["BLESSING FOR", "GOOD"]);
      const accountHeadingLines = await page.locator("#home-onboarding-title").evaluate((heading) => {
        const range = document.createRange();
        range.selectNodeContents(heading);
        return range.getClientRects().length;
      });
      expect(accountHeadingLines).toBe(2);
      expect(Math.abs(cards[0].button!.width - cards[1].button!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[1].button!.width - cards[2].button!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(cards[2].button!.width - cards[3].button!.width)).toBeLessThanOrEqual(1);
    }
    expect(metrics.overflow, `${width}px horizontal overflow`).toBe(false);
    expect(metrics.hero?.left, `${width}px hero left edge`).toBeGreaterThanOrEqual(0);
    expect(metrics.hero?.right, `${width}px hero right edge`).toBeLessThanOrEqual(width);
    expect(metrics.heroTitle?.right, `${width}px hero title right edge`).toBeLessThanOrEqual(width);
    expect(metrics.primary?.height, `${width}px primary CTA target`).toBeGreaterThanOrEqual(44);
    expect(metrics.primary?.top, `${width}px primary CTA in viewport`).toBeGreaterThanOrEqual(0);
    expect(metrics.guidance?.width, `${width}px account guide width`).toBeGreaterThan(0);
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
    await page.locator(".discovery-section").scrollIntoViewIfNeeded();
    for (const mascot of [
      page.locator("[data-testid='join-whatsapp'] .community-mascot"),
      page.locator("[data-testid='blessfriend-account'] .home-onboarding-mascot"),
    ]) {
      await expect
        .poll(() => mascot.evaluate((image) => (image as HTMLImageElement).naturalWidth), {
          message: `${width}px card mascot image loads`,
          timeout: 15_000,
        })
        .toBeGreaterThan(0);
    }
    if (width <= 640) {
      for (const card of ["#join-whatsapp", "#blessfriend-account"]) {
        await page.locator(card).scrollIntoViewIfNeeded();
        const mascotOverlapsNavigation = await page.locator(`${card} img.brand-mascot`).evaluate((mascot) => {
          const navigation = document.querySelector(".customer-bottom-nav");
          if (!navigation) return false;
          const image = mascot.getBoundingClientRect();
          const nav = navigation.getBoundingClientRect();
          return image.left < nav.right && image.right > nav.left && image.top < nav.bottom && image.bottom > nav.top;
        });
        expect(mascotOverlapsNavigation, `${width}px ${card} mascot clears bottom navigation`).toBe(false);
      }
    }
    await page.screenshot({ path: `${evidenceDirectory}/home-${width}.png`, fullPage: true });
    await page.setViewportSize({ width, height: 1440 });
    await page.evaluate(() => document.querySelector(".discovery-section")?.scrollIntoView({ block: "start" }));
    await page.locator(".discovery-section").screenshot({ path: `${evidenceDirectory}/home-cards-${width}.png` });

    await page.setViewportSize({ width, height: 900 });
    const guide = page.locator(".home-onboarding-how-to");
    await guide.locator("summary").click();
    const guideSteps = guide.getByRole("list", { name: "Langkah cara memesan" });
    await expect(guideSteps.locator("h3")).toHaveText([
      "pilih bukunya",
      "history order buku kamu",
      "invoice",
      "Pesanan diproses",
      "pembayaran",
      "cek perjalanan buku kamu",
      "Buku sampai",
    ]);
    await expect(guideSteps.locator("p")).toHaveText([
      "bisa fix lewat wa group (nantinya admin akan merekap ke account website masing2 blessfriends) atau bisa dilakukan pembelian via website langsung",
      "setiap pembelian baik di wa / di website akan langsung muncul di account masing2 blessfriends buku apa yang sudah dibeli di kami",
      "invoice akan muncul di website h+1/h+2 setelah close PO, karena kami membuka banyak cargo setiap batch, maka diperhatikan di bagian tagihan pada account website kamu, admin invoice kami akan pc masing2 customer menginfokan bahwa invoice sudah terbit di website",
      "Preorder masuk ke Batch PO; Ready Stock diproses tanpa supplier Batch PO.",
      "pembayaran di kami adalah DP 30% atau jika ada DP tertentu di tiap cargo akan kami infokan saat kami menurunkan matprom di group whatsapp",
      "PO reguler membutuhkan waktu 4-5 bulan sejak di order pertama kali, pembelian bukumu bisa langsung di tracking di account website kamu",
      "Setelah buku tiba dan selesai diproses oleh BFG, pesanan dilanjutkan ke fulfillment dan pengiriman.",
    ]);
    const guidanceGeometry = await guide.evaluate((element) => {
      const summary = element.querySelector("summary")!;
      const label = summary.querySelector(":scope > span:first-child")!.getBoundingClientRect();
      const toggle = summary.querySelector(".home-onboarding-summary-icon")!.getBoundingClientRect();
      const list = element.querySelector<HTMLElement>(".order-steps")!;
      const steps = [...list.children].map((step) => {
        const rect = step.getBoundingClientRect();
        const heading = step.querySelector("h3")!.getBoundingClientRect();
        const body = step.querySelector("p")!.getBoundingClientRect();
        const number = step.querySelector(".order-step-number")!.getBoundingClientRect();
        const icon = step.querySelector(".order-step-icon-wrap")!.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: rect.right,
          bottom: rect.bottom,
          headingBottom: heading.bottom,
          bodyTop: body.top,
          bodyRight: body.right,
          bodyBottom: body.bottom,
          number: { left: number.left, right: number.right, top: number.top, bottom: number.bottom },
          icon: { left: icon.left, right: icon.right, top: icon.top, bottom: icon.bottom },
        };
      });
      return {
        open: element.hasAttribute("open"),
        summaryLabelRight: label.right,
        toggleLeft: toggle.left,
        columns: getComputedStyle(list).gridTemplateColumns.split(" ").length,
        listLeft: list.getBoundingClientRect().left,
        listRight: list.getBoundingClientRect().right,
        steps,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(guidanceGeometry.open).toBe(true);
    expect(guidanceGeometry.summaryLabelRight).toBeLessThanOrEqual(guidanceGeometry.toggleLeft);
    expect(guidanceGeometry.scrollWidth).toBeLessThanOrEqual(guidanceGeometry.viewportWidth + 1);
    expect(guidanceGeometry.columns).toBe(width >= 901 ? 2 : 1);
    expect(guidanceGeometry.steps).toHaveLength(7);
    expect(
      guidanceGeometry.steps.every(
        (step) =>
          step.left >= guidanceGeometry.listLeft - 1 &&
          step.right <= guidanceGeometry.listRight + 1 &&
          step.headingBottom <= step.bodyTop &&
          step.bodyRight <= step.right + 1 &&
          step.bodyBottom <= step.bottom + 1 &&
          !(
            step.number.left < step.icon.right &&
            step.number.right > step.icon.left &&
            step.number.top < step.icon.bottom &&
            step.number.bottom > step.icon.top
          ),
      ),
      `${width}px expanded guide content geometry: ${JSON.stringify(guidanceGeometry)}`,
    ).toBe(true);
    const stepColumns = new Set(guidanceGeometry.steps.map((step) => step.left));
    expect(stepColumns.size).toBe(width >= 901 ? 2 : 1);
    if ([1440, 1024, 768, 390].includes(width)) {
      await page.setViewportSize({ width, height: 1800 });
      await guide.screenshot({ path: `${evidenceDirectory}/cara-pesan-expanded-${width}.png` });
    }
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/verification/how-to-order?state=signed-out", { waitUntil: "domcontentloaded" });
    const howToPage = page.locator(".how-to-order-page:visible").first();
    await expect(page.locator(".how-to-order-page:visible")).toHaveCount(1);
    await expect(howToPage.getByRole("heading", { name: "Dari memilih buku sampai tiba di tanganmu." })).toBeVisible();
    const journey = howToPage.getByRole("list", { name: "Langkah cara memesan" });
    await expect(journey.locator(":scope > li")).toHaveCount(7);
    await expect(journey.locator("h3")).toHaveText([
      "pilih bukunya",
      "history order buku kamu",
      "invoice",
      "Pesanan diproses",
      "pembayaran",
      "cek perjalanan buku kamu",
      "Buku sampai",
    ]);
    await expect(journey.getByRole("heading", { name: "pembayaran", exact: true })).toHaveCount(1);
    await expect(journey.getByRole("heading", { name: "Pembayaran", exact: true })).toHaveCount(0);
    await expect(howToPage.getByText("ketentuan order di BFG")).toBeVisible();
    await expect(
      howToPage.getByText(
        "harap dibaca untuk ketentuan order di kami, agar setelahnya Blessfriends mengetahui sistem pembelian di kami",
      ),
    ).toBeVisible();
    await expect(journey.locator("li").nth(0).locator("p")).toHaveText(
      "bisa fix lewat wa group (nantinya admin akan merekap ke account website masing2 blessfriends) atau bisa dilakukan pembelian via website langsung",
    );
    await expect(journey.locator("li").nth(1).locator("p")).toHaveText(
      "setiap pembelian baik di wa / di website akan langsung muncul di account masing2 blessfriends buku apa yang sudah dibeli di kami",
    );
    await expect(journey.locator("li").nth(2).locator("p")).toHaveText(
      "invoice akan muncul di website h+1/h+2 setelah close PO, karena kami membuka banyak cargo setiap batch, maka diperhatikan di bagian tagihan pada account website kamu, admin invoice kami akan pc masing2 customer menginfokan bahwa invoice sudah terbit di website",
    );
    await expect(journey.locator("li").nth(3).locator("p")).toHaveText(
      "Preorder masuk ke Batch PO; Ready Stock diproses tanpa supplier Batch PO.",
    );
    await expect(journey.locator("li").nth(4).locator("p")).toHaveText(
      "pembayaran di kami adalah DP 30% atau jika ada DP tertentu di tiap cargo akan kami infokan saat kami menurunkan matprom di group whatsapp",
    );
    await expect(journey.locator("li").nth(5).locator("p")).toHaveText(
      "PO reguler membutuhkan waktu 4-5 bulan sejak di order pertama kali, pembelian bukumu bisa langsung di tracking di account website kamu",
    );
    await expect(journey.locator("li").nth(6).locator("p")).toHaveText(
      "Setelah buku tiba dan selesai diproses oleh BFG, pesanan dilanjutkan ke fulfillment dan pengiriman.",
    );
    await expect(howToPage.getByText(/Admin menerbitkan invoice sesuai proses BFG/)).toHaveCount(0);
    await expect(howToPage.getByText(/sekitar 3–5 minggu/)).toHaveCount(0);
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
  await close.click();
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
    for (const route of ["/verification/onboarding?state=signed-out", "/verification/how-to-order?state=signed-out"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const widget = page.getByTestId("floating-blessy");
      if (route.includes("/verification/onboarding")) {
        await page.evaluate(() => {
          const hero = document.querySelector<HTMLElement>(".home-hero");
          if (hero) window.scrollTo(0, hero.getBoundingClientRect().bottom + window.scrollY);
        });
        await expect(widget).toHaveAttribute("data-obstructing-home-copy", "false");
      }
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
            ".home-hero-actions, .community-copy .button, .discovery-card .button, .home-onboarding-actions .button, .how-to-order-page .actions, .how-to-order-page .order-step, .home-onboarding-how-to[open] .order-step",
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
