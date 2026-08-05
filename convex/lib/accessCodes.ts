import { keyedDigest } from "./crypto";
import { requirePreviewSecret } from "./previewCapability";
import { requiredText } from "./validation";

export async function accessCodeDigests(catalogId: string, accessCode: string) {
  const code = requiredText(accessCode, "access code");
  const secret = requirePreviewSecret("BFG_CATALOG_CODE_PEPPER");
  return {
    codeDigest: await keyedDigest(secret, "catalog-access", `${catalogId}:${code}`),
    lookupDigest: await keyedDigest(secret, "catalog-access-lookup", code),
  };
}
