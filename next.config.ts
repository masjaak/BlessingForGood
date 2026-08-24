import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://clerk.blessingforgood.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: https://img.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site wss://*.convex.site https://clerk.blessingforgood.com https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com:* https://challenges.cloudflare.com",
  "frame-src 'self' https://clerk.blessingforgood.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
