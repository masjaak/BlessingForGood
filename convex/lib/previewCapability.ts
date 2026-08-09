import { fail } from "./errors";

export function requirePreviewCapability(): void {
  if (process.env.BFG_PREVIEW_DEMO_MODE !== "true") {
    fail("PREVIEW_MODE_DISABLED");
  }
}

export function requirePreviewSecret(name: string): string {
  const value = process.env[name];
  if (!value) fail("PREVIEW_MODE_DISABLED");
  return value;
}

export function requireConfiguredSecret(name: string): string {
  const value = process.env[name];
  if (!value) fail("AUTH_CONFIGURATION_MISSING");
  return value;
}
