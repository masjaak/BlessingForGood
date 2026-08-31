import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({ signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export const config = {
  matcher: [
    "/admin/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    "/accept-invitation/:path*",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
