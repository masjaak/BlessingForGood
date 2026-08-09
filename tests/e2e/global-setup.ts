import { clerkSetup } from "@clerk/testing/playwright";

export default async function globalSetup() {
  if (process.env.BFG_E2E_AUTH === "true") await clerkSetup();
}
