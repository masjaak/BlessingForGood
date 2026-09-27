import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BFG_E2E_BASE_URL;
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: process.env.BFG_E2E_AUTH === "true" ? undefined : ["**/clerk-auth.spec.ts"],
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    extraHTTPHeaders: protectionBypass
      ? { "x-vercel-protection-bypass": protectionBypass, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
