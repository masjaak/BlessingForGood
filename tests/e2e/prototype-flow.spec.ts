import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

function previewBaseUrl(): string {
  return process.env.BFG_E2E_BASE_URL || "http://127.0.0.1:3100";
}

async function unlockAdmin(page: Page): Promise<void> {
  const codeInput = page.getByLabel("Preview admin access code");
  if (!(await codeInput.count())) return;
  const accessCode = process.env.BFG_E2E_ADMIN_ACCESS_CODE;
  if (!accessCode) throw new Error("BFG_E2E_ADMIN_ACCESS_CODE is required for Convex Preview E2E.");
  await codeInput.fill(accessCode);
  await page.getByRole("button", { name: "Unlock admin workspace" }).click();
  await expect(page.getByRole("heading", { name: "Create the door before opening the room." })).toBeVisible();
}

async function newBrowserContext(browser: Browser, page: Page) {
  const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return browser.newContext({
    baseURL: previewBaseUrl(),
    viewport: page.viewportSize() || { width: 1440, height: 900 },
    extraHTTPHeaders: protectionBypass ? { "x-vercel-protection-bypass": protectionBypass } : undefined,
  });
}

async function cleanupConvexTest(
  adminSessionToken: string,
  customerSessionToken: string,
  testId: string,
): Promise<void> {
  const convexUrl = process.env.BFG_E2E_CONVEX_URL;
  if (!convexUrl) throw new Error("BFG_E2E_CONVEX_URL is required to clean Convex E2E records.");
  const client = new ConvexHttpClient(convexUrl);
  await client.mutation(api.prototypeSessions.cleanupTest, {
    sessionToken: adminSessionToken,
    customerSessionToken,
    testId,
  });
}

test("Preview persistence supports isolated customer and admin flow", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${testInfo.project.name}`;
  const catalogName = `Browser QA ${suffix}`;
  const accessCode = `qa-code-${suffix}`;
  const publisherName = `QA Publisher ${suffix}`;
  const bookTitle = `QA Book ${suffix}`;
  const customerName = `QA Blessfriend ${suffix}`;
  const batchName = `Browser QA Batch ${suffix}`;
  const projectSeed =
    Array.from(testInfo.project.name).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 1000;
  const isbnSuffix = `${Date.now().toString().slice(-3)}${projectSeed.toString().padStart(3, "0")}`;

  let adminSessionToken: string | null = null;
  let customerSessionToken: string | null = null;

  await page.goto("/admin/catalogs", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.body.innerText.includes("Preview admin access code") ||
      document.body.innerText.includes("Create the door before opening the room."),
  );
  const previewBanner = page.getByText("Prototype Preview");
  const previewData = page.getByText("Data is stored in the BFG Preview environment.");
  const usesConvex =
    (await previewData.count()) > 0 ||
    (await page.getByLabel("Preview admin access code").count()) > 0 ||
    (await page.getByText(/enter Convex/).count()) > 0;
  if (usesConvex) {
    if (await previewBanner.count()) await expect(previewData).toBeVisible();
  } else {
    await expect(previewBanner).toBeVisible();
    await expect(page.getByText("Data is stored only in this browser.")).toBeVisible();
  }
  await unlockAdmin(page);
  if (usesConvex) adminSessionToken = await page.evaluate(() => sessionStorage.getItem("bfg-prototype-session-v0.1"));

  await page.getByLabel("Catalog name").fill(catalogName);
  await page.getByLabel("Access code").fill(accessCode);
  await page.getByLabel("Publisher").fill(publisherName);
  await page.getByLabel("Book title").fill(bookTitle);
  for (const format of ["BB", "HB"]) {
    await page.getByRole("checkbox", { name: format }).check();
  }
  let catalogCreated = false;
  await page.getByLabel("BB ISBN").fill(`9780000${isbnSuffix}`);
  await page.getByLabel("BB price").fill("100000");
  await page.getByLabel("PB ISBN").fill(`9780001${isbnSuffix}`);
  await page.getByLabel("PB price").fill("125000");
  await page.getByLabel("HB ISBN").fill(`9780002${isbnSuffix}`);
  await page.getByLabel("HB price").fill("150000");
  await page.getByRole("button", { name: "Create open catalog" }).click();
  await expect(page.getByText(`${catalogName} is open and ready for the customer preview.`)).toBeVisible();
  catalogCreated = true;

  const customerContext = usesConvex ? await newBrowserContext(browser, page) : null;
  const customerPage = customerContext ? await customerContext.newPage() : page;
  try {
    await customerPage.goto("/catalog", { waitUntil: "networkidle" });
    if (usesConvex)
      customerSessionToken = await customerPage.evaluate(() => sessionStorage.getItem("bfg-prototype-session-v0.1"));
    await customerPage.getByLabel("Catalog access code").fill("wrong-code");
    await customerPage.getByRole("button", { name: "Unlock catalog" }).click();
    await expect(customerPage.locator("p[role=alert]")).toContainText("Kode belum cocok");
    await customerPage.getByLabel("Catalog access code").fill(accessCode);
    await customerPage.getByRole("button", { name: "Unlock catalog" }).click();

    await expect(customerPage.getByRole("heading", { name: catalogName })).toBeVisible();
    const formatGroup = customerPage.getByRole("radiogroup", { name: `Format for ${bookTitle}` });
    await expect(formatGroup.getByRole("radio", { name: /BB/ })).toBeChecked();
    await expect(customerPage.locator(".book-cover")).toContainText("BB");
    await formatGroup.getByRole("radio", { name: /PB/ }).check();
    await expect(customerPage.locator(".book-cover")).toContainText("PB");
    await expect(customerPage.getByText("9780001")).toBeVisible();
    await expect(customerPage.getByText("Rp 125.000")).toBeVisible();
    await formatGroup.getByRole("radio", { name: /BB/ }).check();
    await expect(customerPage.locator(".book-cover")).toContainText("BB");
    await expect(customerPage.getByText("9780000")).toBeVisible();
    await expect(customerPage.getByText("Rp 100.000")).toBeVisible();
    await customerPage.getByRole("button", { name: `Increase quantity for ${bookTitle}` }).click();
    await expect(customerPage.locator(`output[aria-label="Quantity for ${bookTitle}"]`)).toHaveText("1");

    await customerPage.getByLabel("Your name").fill(customerName);
    await customerPage.getByLabel("Email (optional)").fill("qa@example.com");
    await customerPage.getByRole("button", { name: "Record preorder" }).click();
    await expect(customerPage.getByRole("heading", { name: "Your preorder is in the book." })).toBeVisible();
    await expect(customerPage.getByRole("link", { name: "Continue in WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\//,
    );
    await customerPage.getByRole("link", { name: "View order status" }).click();
    await expect(customerPage.getByRole("heading", { name: "Keep the next step close." })).toBeVisible();
    await expect(customerPage.getByRole("heading", { name: bookTitle })).toBeVisible();
    await customerPage.reload({ waitUntil: "networkidle" });
    await expect(customerPage.getByRole("heading", { name: bookTitle })).toBeVisible();

    if (usesConvex) {
      await customerPage.getByRole("link", { name: "View tracking" }).click();
      await expect(customerPage.getByText("No batch assigned")).toBeVisible();

      await page.goto("/admin/batches", { waitUntil: "networkidle" });
      await page.getByLabel("Name").fill(batchName);
      await page.getByLabel("Reference code").fill(`REF-${suffix}`);
      await page.getByRole("button", { name: "Create batch" }).click();
      const batchCard = page.locator(".card").filter({ hasText: batchName }).first();
      await expect(batchCard).toBeVisible();
      await batchCard.getByRole("link", { name: "Open batch operations" }).click();
      await page.getByLabel("Catalog to link").selectOption({ label: catalogName });
      await page.getByRole("button", { name: "Link catalog" }).click();
      await expect(page.getByText(catalogName)).toBeVisible();

      await page.goto("/admin/orders", { waitUntil: "networkidle" });
      const operationsRow = page.getByRole("row").filter({ hasText: customerName });
      await operationsRow.getByRole("link", { name: "Operations detail" }).click();
      await page.getByLabel("Assignment batch").selectOption({ label: batchName });
      await page.getByLabel("Assignment quantity").fill("1");
      await page.getByRole("button", { name: "Assign" }).click();
      await expect(page.locator(".summary-line").filter({ hasText: batchName }).first()).toBeVisible();

      await page.goto("/admin/batches", { waitUntil: "networkidle" });
      await page
        .locator(".card")
        .filter({ hasText: batchName })
        .first()
        .getByRole("link", { name: "Open batch operations" })
        .click();
      await page.getByRole("button", { name: "Advance to PO Ditutup" }).click();
      await expect(customerPage.getByText("PO Ditutup").first()).toBeVisible();
      await page.getByRole("button", { name: "Advance to Dipesan ke Supplier" }).click();
      await expect(customerPage.getByText("Dipesan ke Supplier").first()).toBeVisible();

      await page.goto("/admin/orders", { waitUntil: "networkidle" });
      await page
        .getByRole("row")
        .filter({ hasText: customerName })
        .getByRole("link", { name: "Operations detail" })
        .click();
      await page.getByRole("button", { name: "Advance to Menunggu Pelunasan" }).click();
      await expect(customerPage.getByText("Menunggu Pelunasan").first()).toBeVisible();
      await page.getByRole("button", { name: "Advance to Menunggu Alamat" }).click();
      await expect(customerPage.getByText("Menunggu Alamat").first()).toBeVisible();

      await page.goto("/admin/invoices", { waitUntil: "networkidle" });
      const invoiceIssueRow = page.locator(".invoice-issue-row").filter({ hasText: customerName }).first();
      await invoiceIssueRow.getByLabel("Deposit rule").selectOption("percentage");
      await invoiceIssueRow.getByLabel("Basis points (0–10000)").fill("5000");
      await invoiceIssueRow.getByRole("button", { name: "Save draft" }).click();
      const invoiceLink = page.getByRole("link", { name: "Open invoice operations" }).first();
      const invoiceHref = await invoiceLink.getAttribute("href");
      if (!invoiceHref) throw new Error("invoice detail link was not created");
      await invoiceLink.click();
      await expect(page).toHaveURL(/\/admin\/invoices\//);
      await expect(page.getByRole("button", { name: "Issue invoice" })).toBeVisible();
      const invoiceNumber = await page.getByRole("heading", { level: 1 }).innerText();
      await page.getByRole("button", { name: "Issue invoice" }).click();
      await expect(page.getByRole("button", { name: "Void invoice" })).toBeVisible();

      await customerPage.goto("/account/invoices", { waitUntil: "networkidle" });
      await customerPage.getByRole("link", { name: "Open invoice and ledger" }).click();
      await expect(customerPage).toHaveURL(/\/account\/invoices\//);
      await expect(customerPage.getByRole("heading", { name: invoiceNumber })).toBeVisible();
      await page.getByLabel("Record credit").fill("100000");
      await page.getByLabel("Note (optional)").fill("QA deposit credit");
      await page.getByRole("button", { name: "Append credit" }).click();
      await expect(customerPage.locator(".summary-line").filter({ hasText: "Available" })).toContainText("100.000");
      await page.getByLabel(/Allocate \(outstanding/).fill("50000");
      await page.getByRole("button", { name: "Allocate deposit" }).click();
      await expect(customerPage.locator(".summary-line").filter({ hasText: "Available" })).toContainText("50.000");
      await expect(customerPage.locator(".summary-line").filter({ hasText: "Reserved" })).toContainText("50.000");
      await expect(customerPage.locator(".summary-line").filter({ hasText: "Allocated to invoice" })).toContainText(
        "50.000",
      );
      await page.getByRole("button", { name: "Release" }).first().click();
      await expect(customerPage.locator(".summary-line").filter({ hasText: "Available" })).toContainText("100.000");
      await expect(customerPage.locator(".summary-line").filter({ hasText: "Reserved" })).toContainText("0");

      const isolatedCustomerContext: BrowserContext = await newBrowserContext(browser, page);
      try {
        const isolatedCustomerPage = await isolatedCustomerContext.newPage();
        await isolatedCustomerPage.goto("/account/orders", { waitUntil: "networkidle" });
        await expect(isolatedCustomerPage.getByRole("heading", { name: "No orders yet" })).toBeVisible();
        await isolatedCustomerPage.goto("/account/invoices", { waitUntil: "networkidle" });
        await expect(isolatedCustomerPage.getByRole("heading", { name: "No invoices yet" })).toBeVisible();
        await isolatedCustomerPage.goto("/catalog", { waitUntil: "networkidle" });
        await expect(isolatedCustomerPage.getByLabel("Catalog access code")).toBeVisible();
      } finally {
        await isolatedCustomerContext.close();
      }
    }

    await page.goto("/admin/orders", { waitUntil: "networkidle" });
    const orderRow = page.getByRole("row").filter({ hasText: customerName });
    await expect(orderRow).toHaveCount(1, { timeout: 20_000 });
    const statusControl = orderRow.getByRole("combobox", { name: /Update status for/ });
    await statusControl.selectOption(usesConvex ? "completed" : "po_closed");
    await expect(
      page
        .getByRole("table")
        .locator(".status-badge", { hasText: usesConvex ? "Selesai" : "PO Ditutup" })
        .first(),
    ).toBeVisible();

    if (!usesConvex) {
      await page.goto("/admin/invoices", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Issue invoice" }).click();
      await expect(page.getByRole("heading", { name: /Rp/ })).toBeVisible();
      await expect(page.getByText("Ledger balance")).toBeVisible();
      await page.getByLabel("Record credit").fill("100000");
      await page.getByLabel("Note").fill("QA browser verification");
      await page.getByRole("button", { name: "Append ledger entry" }).click();
      await expect(page.getByText("1 append-only ledger entry recorded.")).toBeVisible();
    }
  } finally {
    if (usesConvex && catalogCreated && adminSessionToken && customerSessionToken) {
      await cleanupConvexTest(adminSessionToken, customerSessionToken, suffix);
    }
    await customerContext?.close();
  }
});
