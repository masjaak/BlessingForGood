import { expect, test } from "@playwright/test";

test("Preview Demo Mode supports a zero-data customer and admin flow", async ({ page }, testInfo) => {
  const suffix = `${Date.now()}-${testInfo.project.name}`;
  const catalogName = `Browser QA ${suffix}`;
  const accessCode = `qa-code-${suffix}`;

  await page.goto("/admin/catalogs", { waitUntil: "networkidle" });
  await expect(page.getByText("Prototype Preview")).toBeVisible();
  await expect(page.getByText("Data is stored only in this browser.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catalog list is empty" })).toBeVisible();

  await page.getByLabel("Catalog name").fill(catalogName);
  await page.getByLabel("Access code").fill(accessCode);
  await page.getByLabel("Publisher").fill("QA Publisher");
  await page.getByLabel("Book title").fill("QA Book");
  for (const format of ["BB", "HB"]) {
    await page.getByRole("checkbox", { name: format }).check();
  }
  await page.getByLabel("BB ISBN").fill("9780000000001");
  await page.getByLabel("BB price").fill("100000");
  await page.getByLabel("PB ISBN").fill("9780000000002");
  await page.getByLabel("PB price").fill("125000");
  await page.getByLabel("HB ISBN").fill("9780000000003");
  await page.getByLabel("HB price").fill("150000");
  await page.getByRole("button", { name: "Create open catalog" }).click();
  await expect(page.getByText(`${catalogName} is open and ready for the customer preview.`)).toBeVisible();

  await page.goto("/catalog", { waitUntil: "networkidle" });
  await page.getByLabel("Catalog access code").fill("wrong-code");
  await page.getByRole("button", { name: "Unlock catalog" }).click();
  await expect(page.getByRole("alert")).toContainText("Kode belum cocok");
  await page.getByLabel("Catalog access code").fill(accessCode);
  await page.getByRole("button", { name: "Unlock catalog" }).click();

  await expect(page.getByRole("heading", { name: catalogName })).toBeVisible();
  const formatGroup = page.getByRole("radiogroup", { name: "Format for QA Book" });
  await expect(formatGroup.getByRole("radio", { name: /PB/ })).toBeChecked();
  await expect(page.locator(".book-cover")).toContainText("PB");
  await formatGroup.getByRole("radio", { name: /BB/ }).check();
  await expect(page.locator(".book-cover")).toContainText("BB");
  await expect(page.getByText("9780000000001")).toBeVisible();
  await expect(page.getByText("Rp 100.000")).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity for QA Book" }).click();
  await expect(page.locator('output[aria-label="Quantity for QA Book"]')).toHaveText("1");

  await page.getByLabel("Your name").fill("QA Blessfriend");
  await page.getByLabel("Email (optional)").fill("qa@example.com");
  await page.getByRole("button", { name: "Record preorder" }).click();
  await expect(page.getByRole("heading", { name: "Your preorder is in the book." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue in WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await page.getByRole("link", { name: "View order status" }).click();
  await expect(page.getByRole("heading", { name: "Keep the next step close." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "QA Book" })).toBeVisible();

  await page.goto("/admin/orders", { waitUntil: "networkidle" });
  await expect(page.getByText("QA Blessfriend")).toBeVisible();
  const statusControl = page.getByRole("combobox", { name: /Update status for/ });
  await statusControl.selectOption("po_closed");
  await expect(page.getByText("PO closed")).toBeVisible();

  await page.goto("/admin/invoices", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await expect(page.getByText("Invoice issued.")).toBeVisible();
  await page.getByLabel("Record credit").fill("100000");
  await page.getByLabel("Note").fill("QA browser verification");
  await page.getByRole("button", { name: "Append ledger entry" }).click();
  await expect(page.getByText("1 append-only ledger entry recorded.")).toBeVisible();
});
