"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const noop = () => undefined;
const ConvexRetryContext = createContext<() => void>(noop);

function useBfgClerkAuth() {
  const auth = useAuth();
  const { getToken: clerkGetToken } = auth;
  const getToken = useCallback(
    ({ skipCache }: { template?: "convex"; skipCache?: boolean }) => clerkGetToken({ skipCache }),
    [clerkGetToken],
  );
  return { ...auth, getToken };
}

function ConvexAuthRecovery({ onRetry, attemptRef }: { onRetry: () => void; attemptRef: { current: number } }) {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const lastSessionId = useRef(sessionId);

  useEffect(() => {
    if (sessionId !== lastSessionId.current || !isSignedIn) {
      lastSessionId.current = sessionId;
      attemptRef.current = 0;
    }
  }, [attemptRef, isSignedIn, sessionId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isLoading || isAuthenticated || attemptRef.current > 0) return;
    attemptRef.current = 1;
    queueMicrotask(onRetry);
  }, [attemptRef, isAuthenticated, isLoaded, isLoading, isSignedIn, onRetry]);

  return null;
}

export function ConvexProviderBoundary({ url, children }: { url: string; children: ReactNode }) {
  const [generation, setGeneration] = useState(0);
  const autoRetryAttempt = useRef(0);
  const client = useMemo(() => new ConvexReactClient(url), [url]);
  const retry = useCallback(() => {
    autoRetryAttempt.current = 0;
    setGeneration((value) => value + 1);
  }, []);
  const autoRetry = useCallback(() => setGeneration((value) => value + 1), []);

  return (
    <ConvexRetryContext.Provider value={retry}>
      <ConvexProviderWithClerk key={generation} client={client} useAuth={useBfgClerkAuth}>
        <ConvexAuthRecovery onRetry={autoRetry} attemptRef={autoRetryAttempt} />
        {children}
      </ConvexProviderWithClerk>
    </ConvexRetryContext.Provider>
  );
}

export function useConvexRetry() {
  return useContext(ConvexRetryContext);
}
