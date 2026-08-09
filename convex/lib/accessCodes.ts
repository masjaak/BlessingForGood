import { keyedDigest } from "./crypto";
import { requireConfiguredSecret } from "./previewCapability";
import { requiredText } from "./validation";

export async function accessCodeDigests(catalogId: string, accessCode: string) {
  const code = requiredText(accessCode, "access code");
  const secret = requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER");
  return {
    codeDigest: await keyedDigest(secret, "catalog-access", `${catalogId}:${code}`),
    lookupDigest: await keyedDigest(secret, "catalog-access-lookup", code),
  };
}
