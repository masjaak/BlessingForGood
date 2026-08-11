"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const bfgClerkAppearance = {
  variables: {
    colorPrimary: "#1c563f",
    colorText: "#1a3027",
    colorTextSecondary: "#627168",
    colorBackground: "#fffdf9",
    colorInputBackground: "#fffdf9",
    borderRadius: "12px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
};

export function ClerkAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const mounted = useSyncExternalStore(noSubscribe, clientSnapshot, serverSnapshot);

  if (!mounted)
    return (
      <div className="state-panel" aria-live="polite">
        Memuat formulir…
      </div>
    );

  return mode === "sign-in" ? (
    <SignIn path="/sign-in" routing="path" fallbackRedirectUrl="/catalog" appearance={bfgClerkAppearance} />
  ) : (
    <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/catalog" appearance={bfgClerkAppearance} />
  );
}
