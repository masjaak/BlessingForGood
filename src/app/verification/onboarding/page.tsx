import { Suspense } from "react";
import { notFound } from "next/navigation";
import HomePage from "@/app/page";
import { PresentationProvider } from "./presentation-provider";

// Local browser fixture only; do not remove the production guard above.
export default function OnboardingPresentationPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Suspense fallback={<p>Loading presentation state…</p>}>
      <PresentationProvider>
        <HomePage />
      </PresentationProvider>
    </Suspense>
  );
}
