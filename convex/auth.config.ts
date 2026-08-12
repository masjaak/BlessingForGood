import type { AuthConfig } from "convex/server";
import { requireClerkIssuer } from "./lib/auth-config";

const clerkIssuer = requireClerkIssuer(process.env.CLERK_JWT_ISSUER_DOMAIN);

export default {
  providers: [
    {
      domain: clerkIssuer,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
