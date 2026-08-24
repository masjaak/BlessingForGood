import { expect, test } from "@playwright/test";

test.describe("@customer Phase 07.1 shared surface", () => {
  test("How To Order keeps one seven-step journey and switches to a readable vertical timeline", async ({ page }) => {
    await page.goto("/how-to-order", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".order-step")).toHaveCount(7);

    const viewportWidth = page.viewportSize()?.width || 0;
    const layout = await page.locator(".order-steps").evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns,
      steps: [...element.children].map((step) => {
        const rect = step.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
      }),
    }));

    if (viewportWidth <= 900) {
      expect(new Set(layout.steps.map((step) => step.left)).size).toBe(1);
    } else {
      expect(layout.columns.split(" ")).toHaveLength(7);
      const geometry = await page.locator(".order-step").evaluateAll((steps) =>
        steps.map((step) => {
          const heading = step.querySelector("h3");
          const description = step.querySelector("p");
          if (!heading || !description) return null;
          const range = document.createRange();
          range.selectNodeContents(heading);
          return {
            headingTop: heading.getBoundingClientRect().top,
            headingLines: range.getClientRects().length,
            descriptionTop: description.getBoundingClientRect().top,
          };
        }),
      );
      expect(geometry.every(Boolean)).toBe(true);
      const rows = geometry.filter((step): step is NonNullable<typeof step> => Boolean(step));
      expect(new Set(rows.map((step) => Math.round(step.headingTop))).size).toBe(1);
      expect(new Set(rows.map((step) => Math.round(step.descriptionTop))).size).toBe(1);
      expect(rows.every((step) => step.headingLines >= 1 && step.headingLines <= 2)).toBe(true);
    }
  });

  test("Homepage keeps one compact three-step orientation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const journey = page.locator(".home-journey");
    await expect(journey).toBeVisible();
    await expect(journey.locator(".hero-sequence > li")).toHaveCount(3);
    expect(await journey.locator(".hero-sequence > li strong").allTextContents()).toEqual([
      "Temukan",
      "Pesan",
      "Ikuti",
    ]);

    const layout = await journey.locator(".hero-sequence").evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns,
      steps: [...element.children].map((step) => step.getBoundingClientRect().left),
      width: element.getBoundingClientRect().width,
      left: element.getBoundingClientRect().left,
      journeyLeft: element.parentElement?.getBoundingClientRect().left ?? 0,
      secondStepBorder: getComputedStyle(element.children[1]).borderLeftWidth,
    }));
    expect(layout.width).toBeLessThanOrEqual(860);
    expect(Math.abs(layout.left - layout.journeyLeft)).toBeLessThanOrEqual(1);
    if ((page.viewportSize()?.width || 0) <= 900) {
      expect(new Set(layout.steps).size).toBe(1);
    } else {
      expect(layout.columns.split(" ")).toHaveLength(3);
      expect(layout.secondStepBorder).toBe("0px");
    }
  });

  test("Phase 08 slider swap and dropdown anchor stay rendered correctly", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".story-card-opening")).toBeVisible();
    await expect(page.locator(".story-card-logo")).toBeVisible();
    const backgrounds = await page
      .locator(".story-card-opening, .story-card-logo")
      .evaluateAll((cards) => cards.map((card) => getComputedStyle(card).backgroundColor));
    expect(backgrounds[0]).not.toBe(backgrounds[1]);

    await page.goto("/ready-stock", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Memuat Ready Stock")).toBeHidden({ timeout: 15_000 });
    if ((await page.locator(".ready-stock-page").count()) === 0) {
      testInfo.annotations.push({
        type: "environment",
        description: "Keyless Clerk/JWKS session mismatch prevented the local Ready Stock route from hydrating.",
      });
      test.skip(true, "Ready Stock route unavailable under the local Clerk session harness.");
    }
    if ((await page.locator(".ready-stock-grid .book-cover img").count()) === 0) {
      testInfo.annotations.push({
        type: "fixture",
        description: "No approved Ready Stock cover is present; geometry uses a local DOM-only cover fixture.",
      });
      await page.evaluate(() => {
        const page = document.querySelector<HTMLElement>(".ready-stock-page");
        if (!page) throw new Error("Ready Stock page fixture target is missing");
        const card = document.createElement("article");
        card.className = "ready-stock-card e2e-book-cover-fixture";
        card.innerHTML = `
          <div class="book-cover">
            <img src="/brand/logos/Logo-1.png" alt="Local cover fixture" />
          </div>
          <div class="ready-stock-copy"><strong>Local cover fixture</strong></div>
        `;
        page.append(card);
      });
    }
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
    await trigger.click();
    const triggerBox = await trigger.boundingBox();
    const menu = page.locator(".bfg-select-menu");
    const gap = 6;
    expect(triggerBox).not.toBeNull();
    await expect(menu).toBeVisible({ timeout: 5_000 });
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

  test("Homepage keeps a deliberate responsive chapter rhythm", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const chapterSelector = ".discovery-section, .community-section, .home-order-section, .story-section";
    await expect(page.locator(chapterSelector).first()).toBeVisible();
    const rhythm = await page.locator(chapterSelector).evaluateAll((sections) =>
      sections.map((section) => {
        const rect = section.getBoundingClientRect();
        const style = getComputedStyle(section);
        return { top: rect.top, bottom: rect.bottom, paddingTop: Number.parseFloat(style.paddingTop) };
      }),
    );
    const viewportWidth = page.viewportSize()?.width || 0;
    const minimumPadding = viewportWidth <= 640 ? 30 : viewportWidth <= 900 ? 38 : 46;
    expect(rhythm).toHaveLength(4);
    expect(rhythm.every((section) => section.paddingTop >= minimumPadding)).toBe(true);
    expect(rhythm.every((section, index) => index === 0 || section.top >= rhythm[index - 1].bottom)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test("custom select renders and opens without a native menu", async ({ page }, testInfo) => {
    await page.goto("/ready-stock", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Memuat Ready Stock")).toBeHidden({ timeout: 15_000 });
    const trigger = page.locator(".bfg-select-trigger").last();

    await expect(page.locator("select")).toHaveCount(0);
    await expect(trigger).toBeVisible();
    const controlGeometry = await trigger.evaluate((element) => {
      const value = element.querySelector<HTMLElement>(".bfg-select-value");
      const trailing = element.querySelector<HTMLElement>(".bfg-select-trailing");
      if (!value || !trailing) throw new Error("BFGSelect form-control anatomy is incomplete");
      const triggerRect = element.getBoundingClientRect();
      const valueRect = value.getBoundingClientRect();
      const trailingRect = trailing.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        display: style.display,
        backgroundColor: style.backgroundColor,
        gridTemplateColumns: style.gridTemplateColumns,
        triggerRight: triggerRect.right,
        valueRight: valueRect.right,
        trailingLeft: trailingRect.left,
        trailingRight: trailingRect.right,
        trailingWidth: trailingRect.width,
      };
    });
    expect(controlGeometry.display).toBe("grid");
    expect(controlGeometry.backgroundColor).not.toBe("rgb(229, 240, 231)");
    expect(controlGeometry.gridTemplateColumns).toContain("32px");
    expect(controlGeometry.trailingWidth).toBeGreaterThanOrEqual(32);
    expect(controlGeometry.valueRight).toBeLessThanOrEqual(controlGeometry.trailingLeft + 1);
    expect(controlGeometry.triggerRight - controlGeometry.trailingRight).toBeLessThanOrEqual(18);
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

  test("shared action groups keep generated results and dividers separated", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const mount = document.createElement("div");
      mount.className = "admin-shell ui-system-qa-fixture";
      mount.innerHTML = `
        <div class="catalog-access-code-section">
          <div class="form-actions">
            <label class="field"><span class="field-label">Kode berakhir</span><input class="input" /></label>
            <div class="action-group action-group-responsive">
              <button class="button button-primary">Buat kode akses</button>
              <button class="button button-danger">Cabut kode aktif</button>
            </div>
          </div>
          <div class="catalog-code-result"><strong>Kode baru</strong><code>BFG-ONE-TIME</code><button class="button button-secondary">Salin kode</button></div>
        </div>
        <div class="summary-line"><span>Status</span><strong>Draft</strong></div>
        <div class="action-group"><button class="button button-secondary">Buka operasi invoice</button></div>
      `;
      document.body.append(mount);
    });

    const geometry = await page.locator(".ui-system-qa-fixture").evaluate((fixture) => {
      const actionRow = fixture.querySelector<HTMLElement>(".catalog-access-code-section > .form-actions");
      const result = fixture.querySelector<HTMLElement>(".catalog-code-result");
      const summary = fixture.querySelector<HTMLElement>(".summary-line");
      const invoiceActions = fixture.querySelectorAll<HTMLElement>(".action-group")[1];
      const buttons = fixture.querySelectorAll<HTMLElement>(".catalog-access-code-section .action-group .button");
      if (!actionRow || !result || !summary || !invoiceActions || buttons.length !== 2) {
        throw new Error("Action geometry fixture did not render");
      }
      const rect = (element: HTMLElement) => element.getBoundingClientRect();
      return {
        resultGap: rect(result).top - rect(actionRow).bottom,
        dividerGap: rect(invoiceActions).top - rect(summary).bottom,
        buttonGap: rect(buttons[1]).top - rect(buttons[0]).bottom,
        inlineButtonGap: rect(buttons[1]).left - rect(buttons[0]).right,
        viewport: window.innerWidth,
      };
    });

    expect(geometry.resultGap).toBeGreaterThanOrEqual(23);
    expect(geometry.dividerGap).toBeGreaterThanOrEqual(15);
    if (geometry.viewport <= 640) {
      expect(geometry.buttonGap).toBeGreaterThanOrEqual(11);
    } else {
      expect(geometry.inlineButtonGap).toBeGreaterThanOrEqual(7);
    }
  });

  test("Activity stays one bounded feed without horizontal overflow", async ({ page }) => {
    await page.goto("/account/notifications", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Aktivitas" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".activity-tabs")).toHaveCount(0);
    await expect(page.getByText("Buka Kotak Masuk", { exact: true })).toHaveCount(0);

    const geometry = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  });
});
