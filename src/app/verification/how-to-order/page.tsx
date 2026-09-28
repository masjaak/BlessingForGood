import { Suspense } from "react";
import { notFound } from "next/navigation";
import HowToOrderPage from "@/app/how-to-order/page";
import { PresentationProvider } from "../onboarding/presentation-provider";

// Local browser fixture only; do not remove the production guard above.
export default function HowToOrderPresentationPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Suspense fallback={<p>Loading presentation state…</p>}>
      <PresentationProvider>
        <HowToOrderPage />
      </PresentationProvider>
    </Suspense>
  );
}
