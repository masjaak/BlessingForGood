"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { usePrototype } from "@/domain/prototype/store";

function AdminAccessGate({ claimAdmin }: { claimAdmin: (accessCode: string) => Promise<boolean> }) {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (!(await claimAdmin(accessCode))) setError("Admin access could not be verified.");
      else setAccessCode("");
    } catch {
      setError("Admin access could not be verified.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="guard-card">
      <span className="eyebrow">Preview admin boundary</span>
      <h1>Unlock the admin workspace</h1>
      <p>This guarded Preview session is separate from production authentication.</p>
      <form className="form-card" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Preview admin access code</span>
          <input
            className="input"
            type="password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Checking access…" : "Unlock admin workspace"}
        </button>
      </form>
    </div>
  );
}

export function PrototypeModeGuard({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: "admin" | "customer";
}) {
  const { enabled, hydrated, dataSource, sessionRole, claimAdmin } = usePrototype();

  if (dataSource === "unavailable") {
    return (
      <div className="guard-card">
        <span className="eyebrow">Prototype boundary</span>
        <h1>Convex Preview configuration is missing</h1>
        <p>The Preview prototype fails closed until a valid Convex deployment URL is configured.</p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="guard-card">
        <span className="eyebrow">Prototype boundary</span>
        <h1>Prototype mode is off</h1>
        <p>
          Protected prototype flows fail closed. Run this local app with
          <code>NEXT_PUBLIC_BFG_PROTOTYPE_MODE=true</code>, or explicitly enable
          <code>NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE=true</code> for a Vercel Preview.
        </p>
      </div>
    );
  }

  if (!hydrated) return <div className="state-panel">Preparing the empty prototype workspace…</div>;
  if (requiredRole === "admin" && sessionRole !== "admin") return <AdminAccessGate claimAdmin={claimAdmin} />;
  return children;
}
