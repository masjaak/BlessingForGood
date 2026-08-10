"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button, Card, Field, LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { usePrototype } from "@/domain/prototype/store";

const initialForm = { name: "", email: "", contact: "", city: "", note: "", acknowledged: false };

function ConnectedJoinForm() {
  const submit = useMutation(api.joinRequests.submit);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await submit({
        name: form.name,
        email: form.email,
        contact: form.contact,
        city: form.city || undefined,
        note: form.note || undefined,
        acknowledged: form.acknowledged,
      });
      setSubmitted(true);
    } catch {
      setError("We could not submit this request. Check your details and try again.");
    }
  }

  if (submitted) {
    return (
      <Card className="success-card content-stack">
        <span className="card-kicker">Request received</span>
        <h2>Thanks for reaching out.</h2>
        <p>
          An admin will review your request and follow up through an approved communication channel. This submission
          does not create a Clerk account or grant catalog access.
        </p>
        <div className="actions">
          <LinkButton href="/community">Read the community guide</LinkButton>
          <LinkButton href="/" variant="secondary">
            Back home
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="form-card">
      <div>
        <span className="card-kicker">Join Blessfriends</span>
        <h2>Tell us how to reach you.</h2>
        <p>We review each request before an invitation. Please share only the information needed for that handoff.</p>
      </div>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-grid">
          <Field label="Name">
            <input
              className="input"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="name"
              maxLength={120}
              required
            />
          </Field>
          <Field label="Email" hint="Used only for the invitation handoff if your request is approved.">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </Field>
          <Field label="WhatsApp or phone">
            <input
              className="input"
              value={form.contact}
              onChange={(event) => update("contact", event.target.value)}
              autoComplete="tel"
              maxLength={80}
              required
            />
          </Field>
          <Field label="City or location" hint="Optional. This helps with community follow-up.">
            <input
              className="input"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              autoComplete="address-level2"
              maxLength={120}
            />
          </Field>
        </div>
        <Field label="Short note" hint="Optional. Keep it under 500 characters.">
          <textarea
            className="textarea"
            value={form.note}
            onChange={(event) => update("note", event.target.value)}
            maxLength={500}
            rows={5}
          />
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.acknowledged}
            onChange={(event) => update("acknowledged", event.target.checked)}
            required
          />
          <span>I understand this request does not instantly create an account or provide private catalog access.</span>
        </label>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit">Send request</Button>
      </form>
    </Card>
  );
}

function JoinPageContent() {
  const { dataSource, authState } = usePrototype();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || (isSignedIn && authState !== "authenticated" && authState !== "suspended")) {
    return <div className="state-panel">Confirming your BFG access…</div>;
  }
  if (isSignedIn) {
    return (
      <Card className="notice-card content-stack">
        <span className="card-kicker">Already a Blessfriend</span>
        <h2>Your BFG account is already active.</h2>
        <p>Join requests are for visitors before account creation. Continue to your account or community catalog.</p>
        <div className="actions">
          <LinkButton href="/account/profile">Open profile</LinkButton>
          <LinkButton href="/catalog" variant="secondary">
            Open catalog
          </LinkButton>
        </div>
      </Card>
    );
  }
  if (dataSource !== "convex") {
    return (
      <Card className="notice-card">
        <h2>Request access is temporarily unavailable.</h2>
        <p>The admission record requires the configured BFG Convex Development data source.</p>
      </Card>
    );
  }
  return <ConnectedJoinForm />;
}

export default function JoinPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <PageHeader
          eyebrow="Join Blessfriends"
          title="Request your way into the community."
          description="Blessing For Goods is invite-only. Send a request, wait for review, and receive next steps if approved."
        />
        <JoinPageContent />
      </div>
    </SiteShell>
  );
}
