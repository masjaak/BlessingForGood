"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand";

const SPLASH_SESSION_KEY = "bfg:splash-seen:v1";
const SPLASH_DURATION_MS = 1200;
const REDUCED_MOTION_DURATION_MS = 180;

export function BfgSplash() {
  const pathname = usePathname() || "/";
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    try {
      if (window.sessionStorage.getItem(SPLASH_SESSION_KEY)) {
        const timer = window.setTimeout(() => setVisible(false), 0);
        return () => window.clearTimeout(timer);
      }
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      // UI-only session storage is optional; the splash still completes.
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => setVisible(false),
      reducedMotion ? REDUCED_MOTION_DURATION_MS : SPLASH_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible || pathname.startsWith("/admin")) return null;

  return (
    <div className="bfg-splash" aria-hidden="true">
      <BrandLogo linkToHome={false} />
    </div>
  );
}
