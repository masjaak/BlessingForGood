import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BFG_E2E_BASE_URL || "http://127.0.0.1:3000";
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    extraHTTPHeaders: protectionBypass ? { "x-vercel-protection-bypass": protectionBypass } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "customer-mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
    { name: "customer-tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "admin-tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.BFG_E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
      },
});
