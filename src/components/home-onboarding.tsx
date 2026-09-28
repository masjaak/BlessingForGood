"use client";

import { useContext, useState } from "react";
import { BrandMascot } from "@/components/brand";
import { HowToOrderSteps } from "@/components/how-to-order";
import { ProductContext } from "@/domain/prototype/context";
import { ActionGroup, IconButton, LinkButton } from "@/components/ui";
import { WHATSAPP_HANDOFF_URL } from "@/domain/whatsapp-handoff";

export function HomeOnboarding({ tutorialVideoUrl = null }: { tutorialVideoUrl?: string | null }) {
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
      : suspended
        ? "Akun Blessfriend ini sedang ditangguhkan."
        : null;
  const primaryAction = welcome ? (
    <LinkButton href="/join">Daftar Blessfriend</LinkButton>
  ) : pending ? (
    <LinkButton href={WHATSAPP_HANDOFF_URL} target="_blank" rel="noopener noreferrer">
      Minta link WhatsApp Group
    </LinkButton>
  ) : activeCustomer ? (
    <LinkButton href="/account" variant="secondary">
      Buka account Blessfriend
    </LinkButton>
  ) : null;

  return (
    <>
      <section
        id="blessfriend-account"
        data-testid="blessfriend-account"
        className={`home-onboarding-main${welcome ? " home-onboarding-main-welcome" : ""}`}
        aria-labelledby="home-onboarding-title"
        role="region"
      >
        <div className="home-onboarding-copy">
          <div className="home-onboarding-heading">
            <div className="home-onboarding-title-block">
              <div className="discovery-card-heading">
                <span className="discovery-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
                  </svg>
                </span>
                <span className="eyebrow">ACCOUNT BLESSFRIEND</span>
              </div>
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
        </div>
        <div className="home-onboarding-art">
          <BrandMascot
            variant="warm"
            className="home-onboarding-mascot"
            sizes="(max-width: 640px) 82px, 92px"
            priority
          />
        </div>
        {primaryAction ? (
          <ActionGroup variant="responsive" className="home-onboarding-actions">
            {primaryAction}
          </ActionGroup>
        ) : null}
      </section>
      <details className="home-onboarding-how-to">
        <summary>
          <span>
            <span className="eyebrow">Panduan BFG</span>
            Cara Pesan &amp; Cek Katalog PO
          </span>
          <span className="home-onboarding-summary-icon" aria-hidden="true">
            +
          </span>
        </summary>
        <div className="home-onboarding-how-to-content">
          <p>Ikuti alur singkat ini untuk menemukan buku, membuat pesanan, dan memantau perjalanannya.</p>
          <HowToOrderSteps />
          <ActionGroup variant="responsive" className="home-onboarding-how-to-actions">
            <LinkButton href="/catalog" variant="secondary">
              Lihat Katalog PO Berjalan
            </LinkButton>
            {tutorialVideoUrl ? (
              <LinkButton href={tutorialVideoUrl} target="_blank" rel="noopener noreferrer" variant="tertiary">
                Tonton Video Cara Pesan ↗
              </LinkButton>
            ) : null}
          </ActionGroup>
        </div>
      </details>
    </>
  );
}
