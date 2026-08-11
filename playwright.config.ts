import { defineConfig, devices } from "@playwright/test";

const localBaseURL = "http://localhost:3100";
const baseURL = process.env.BFG_E2E_BASE_URL || localBaseURL;
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: process.env.BFG_E2E_AUTH === "true" ? undefined : ["**/clerk-auth.spec.ts"],
  fullyParallel: true,
  retries: 1,
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
    {
      name: "customer-375",
      grep: /@customer/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "customer-390",
      grep: /@customer/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "customer-430",
      grep: /@customer/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 430, height: 932 } },
    },
    {
      name: "customer-768",
      grep: /@customer/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "customer-1440",
      grep: /@customer/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "admin-1024",
      grep: /@admin/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "admin-1280",
      grep: /@admin/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "admin-1440",
      grep: /@admin/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.BFG_E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname localhost --port 3100",
        url: localBaseURL,
        reuseExistingServer: true,
      },
});
