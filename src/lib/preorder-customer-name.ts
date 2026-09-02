import { useCallback, useEffect, useRef, useState } from "react";

export function resolvePreorderCustomerName({
  bfgDisplayName,
  clerkFullName,
  clerkUsername,
}: {
  bfgDisplayName?: string | null;
  clerkFullName?: string | null;
  clerkUsername?: string | null;
}): string {
  for (const value of [bfgDisplayName, clerkFullName, clerkUsername]) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function usePreorderCustomerName({
  enabled,
  profileLoaded,
  bfgDisplayName,
  clerkLoaded,
  clerkFullName,
  clerkUsername,
}: {
  enabled: boolean;
  profileLoaded: boolean;
  bfgDisplayName?: string | null;
  clerkLoaded: boolean;
  clerkFullName?: string | null;
  clerkUsername?: string | null;
}) {
  const [customerName, setCustomerName] = useState("");
  const initialized = useRef(false);
  const manuallyEdited = useRef(false);
  const defaultName = resolvePreorderCustomerName({ bfgDisplayName, clerkFullName, clerkUsername });

  useEffect(() => {
    if (!enabled || !profileLoaded || !clerkLoaded || initialized.current || manuallyEdited.current) return;
    initialized.current = true;
    setCustomerName(defaultName);
  }, [clerkLoaded, defaultName, enabled, profileLoaded]);

  const onCustomerNameChange = useCallback((value: string) => {
    manuallyEdited.current = true;
    setCustomerName(value);
  }, []);

  return { customerName, onCustomerNameChange };
}
