"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";
import { bfgClerkAppearance } from "@/config/clerk";

const noSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ClerkAuthForm({
  mode,
  redirectUrl = "/catalog",
}: {
  mode: "sign-in" | "sign-up";
  redirectUrl?: string;
}) {
  const mounted = useSyncExternalStore(noSubscribe, clientSnapshot, serverSnapshot);

  if (!mounted)
    return (
      <div className="state-panel" aria-live="polite">
        Memuat formulir…
      </div>
    );

  return mode === "sign-in" ? (
    <SignIn
      path="/sign-in"
      routing="path"
      fallbackRedirectUrl={redirectUrl}
      withSignUp={false}
      appearance={bfgClerkAppearance}
    />
  ) : (
    <SignUp path="/sign-up" routing="path" fallbackRedirectUrl={redirectUrl} appearance={bfgClerkAppearance} />
  );
}
