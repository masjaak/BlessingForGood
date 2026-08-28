import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const privatePaths = [
  "/admin",
  "/account",
  "/catalog",
  "/sign-in",
  "/sign-up",
  "/accept-invitation",
  "/api/",
  "/__clerk/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "OAI-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "*", allow: "/", disallow: privatePaths },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
