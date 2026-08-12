"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BackButton({ fallback = "/", publicOnly = false }: { fallback?: string; publicOnly?: boolean }) {
  const router = useRouter();
  const [hasInternalHistory, setHasInternalHistory] = useState(false);

  useEffect(() => {
    const referrer = document.referrer;
    if (!referrer || window.history.length < 2) return;
    try {
      const path = new URL(referrer).pathname;
      const isProtected = ["/catalog", "/account", "/admin", "/sign-in", "/sign-up"].some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      const fallbackPath = fallback.split(/[?#]/, 1)[0] || "/";
      queueMicrotask(() =>
        setHasInternalHistory(
          new URL(referrer).origin === window.location.origin &&
            path !== window.location.pathname &&
            !(fallbackPath !== "/" && path === "/") &&
            (!publicOnly || !isProtected),
        ),
      );
    } catch {
      queueMicrotask(() => setHasInternalHistory(false));
    }
  }, [fallback, publicOnly]);

  return (
    <button
      className="back-button"
      type="button"
      aria-label="Kembali"
      onClick={() => (hasInternalHistory ? router.back() : router.push(fallback))}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m14.5 5-7 7 7 7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}
