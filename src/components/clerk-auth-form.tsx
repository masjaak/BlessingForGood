"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ClerkAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const mounted = useSyncExternalStore(noSubscribe, clientSnapshot, serverSnapshot);

  if (!mounted)
    return (
      <div className="state-panel" aria-live="polite">
        Memuat formulir…
      </div>
    );

  return mode === "sign-in" ? (
    <SignIn path="/sign-in" routing="path" fallbackRedirectUrl="/catalog" />
  ) : (
    <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/catalog" />
  );
}
