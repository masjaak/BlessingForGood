"use client";

import { useContext, useState } from "react";
import { BrandMascot } from "@/components/brand";
import { ProductContext } from "@/domain/prototype/context";
import { ActionGroup, IconButton, LinkButton } from "@/components/ui";
import { WHATSAPP_HANDOFF_URL } from "@/domain/whatsapp-handoff";

export function HomeOnboarding() {
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const product = useContext(ProductContext);
  const { hydrated, authState, membershipState, sessionRole } = product ?? {
    hydrated: true,
    authState: "signed-out" as const,
    membershipState: "AUTH_LOADING" as const,
    sessionRole: null,
  };

  if (!hydrated || sessionRole === "admin" || sessionRole === "owner") return null;
  if (["loading", "convex-loading", "provisioning"].includes(authState)) return null;
  if (["convex-error", "network-error"].includes(authState)) return null;

  const signedOut = authState === "signed-out" || authState === "configuration-missing";
  const needsAdmission = signedOut || authState === "admission-required" || authState === "removed";
  const pending = membershipState === "PENDING";
  const invitationPending = membershipState === "APPROVED_INVITATION_PENDING";
  const activeCustomer = authState === "authenticated" && sessionRole === "customer" && membershipState === "ACTIVE";
  const suspended = authState === "suspended" || membershipState === "SUSPENDED";
  if (!signedOut && ["AUTH_LOADING", "MEMBERSHIP_RECONCILING"].includes(membershipState)) return null;
  const welcome = needsAdmission && !pending && !invitationPending && !welcomeDismissed;
  if (!welcome && !pending && !invitationPending && !activeCustomer && !suspended) return null;

  const heading = pending
    ? "Pendaftaranmu sudah diterima."
    : invitationPending
      ? "Pendaftaranmu sudah disetujui."
      : suspended || activeCustomer
        ? "Account Blessfriend"
        : "Buat account website untuk Blessfriends";
  const statusDescription = pending
    ? "Pastikan kamu sudah bergabung ke WhatsApp Group BFG. Admin akan memeriksa pendaftaranmu."
    : invitationPending
      ? "Cek email untuk menyelesaikan aktivasi akun."
      : welcome
        ? "Untuk menjadi Blessfriend, bergabung ke WhatsApp Group BFG dan daftar melalui website."
        : suspended
          ? "Akun Blessfriend ini sedang ditangguhkan."
          : null;

  return (
    <section
      className={`home-onboarding-main${welcome ? " home-onboarding-main-welcome" : ""}`}
      id="blessfriend-account"
      data-testid="blessfriend-account"
      aria-labelledby="home-onboarding-title"
      aria-label={welcome ? "Selamat datang di Blessing For Good" : "Account Blessfriend"}
      role="region"
    >
      <div className="home-onboarding-copy">
        <div className="home-onboarding-heading">
          <div>
            <span className="eyebrow">{welcome ? "Account Blessfriend" : "Status Blessfriend"}</span>
            <h2 id="home-onboarding-title">{heading}</h2>
          </div>
          {welcome ? (
            <IconButton
              type="button"
              variant="tertiary"
              className="home-onboarding-dismiss"
              aria-label="Tutup informasi selamat datang"
              onClick={() => setWelcomeDismissed(true)}
            >
              <span aria-hidden="true">×</span>
            </IconButton>
          ) : null}
        </div>
        <p>
          wajib jika ingin melihat katalog PO berjalan, memesan buku, dan check perjalanan buku baik fix di group /
          pembelian di website
        </p>
        {statusDescription ? <p className="home-onboarding-status">{statusDescription}</p> : null}
        {welcome ? (
          <ActionGroup variant="responsive" className="home-onboarding-actions">
            <LinkButton href="/join">Daftar Blessfriend</LinkButton>
          </ActionGroup>
        ) : null}
        {pending ? (
          <ActionGroup variant="responsive" className="home-onboarding-actions">
            <LinkButton href={WHATSAPP_HANDOFF_URL} target="_blank" rel="noopener noreferrer">
              Minta link WhatsApp Group
            </LinkButton>
          </ActionGroup>
        ) : null}
        {activeCustomer ? (
          <ActionGroup variant="responsive" className="home-onboarding-actions">
            <LinkButton href="/account" variant="secondary">
              Buka account Blessfriend
            </LinkButton>
          </ActionGroup>
        ) : null}
      </div>
      <div className="home-onboarding-art">
        <BrandMascot variant="warm" className="home-onboarding-mascot" />
      </div>
    </section>
  );
}
