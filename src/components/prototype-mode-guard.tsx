"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { usePrototype } from "@/domain/prototype/store";

export function PrototypeModeGuard({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: "admin" | "customer" | "owner";
}) {
  const { enabled, hydrated, dataSource, sessionRole, userStatus, authState } = usePrototype();

  if (dataSource === "unavailable" || authState === "configuration-missing") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Prototype boundary</span>
        <h1>Convex Preview configuration is missing</h1>
        <p>Protected data is unavailable until the isolated Convex deployment is configured.</p>
      </div>
    );
  }
  if (!enabled) {
    return (
      <div className="guard-card">
        <span className="eyebrow">Prototype boundary</span>
        <h1>Prototype mode is off</h1>
        <p>This protected flow fails closed until the local prototype is explicitly enabled.</p>
      </div>
    );
  }
  if (authState === "signed-out") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Authentication required</span>
        <h1>Masuk untuk melanjutkan</h1>
        <p>BFG is invite-only. Use your Clerk Development invitation to continue.</p>
        <SignInButton mode="redirect">Masuk</SignInButton>
      </div>
    );
  }
  if (authState === "suspended" || userStatus === "suspended") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Account suspended</span>
        <h1>Protected access is unavailable</h1>
        <p>Your BFG account is suspended. You can sign out below.</p>
        <UserButton />
      </div>
    );
  }
  if (authState === "network-error") {
    return <div className="state-panel">BFG authentication could not be confirmed. Try again.</div>;
  }
  if (!hydrated || authState === "loading" || authState === "convex-loading" || authState === "provisioning") {
    return <div className="state-panel">Confirming your BFG access…</div>;
  }
  const allowed =
    !requiredRole ||
    (requiredRole === "admin" && (sessionRole === "admin" || sessionRole === "owner")) ||
    (requiredRole === "owner" && sessionRole === "owner") ||
    (requiredRole === "customer" && sessionRole === "customer");
  if (!allowed) {
    return (
      <div className="guard-card">
        <span className="eyebrow">Permission denied</span>
        <h1>This workspace is not available</h1>
        <p>Your authenticated BFG role does not allow this resource.</p>
      </div>
    );
  }
  return children;
}
