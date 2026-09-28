"use client";

import { useContext, useState } from "react";
import { BrandMascot } from "@/components/brand";
import { HowToOrderSteps } from "@/components/how-to-order";
import { ProductContext } from "@/domain/prototype/context";
import { ActionGroup, IconButton, LinkButton } from "@/components/ui";
import { WHATSAPP_HANDOFF_URL } from "@/domain/whatsapp-handoff";

type HomeOnboardingProps = {
  tutorialVideoUrl: string | null;
};

export function HomeOnboarding({ tutorialVideoUrl }: HomeOnboardingProps) {
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
  if (["convex-error", "network-error", "suspended"].includes(authState)) return null;

  const signedOut = authState === "signed-out" || authState === "configuration-missing";
  const needsAdmission = signedOut || authState === "admission-required" || authState === "removed";
  const activeCustomer = authState === "authenticated" && sessionRole === "customer";
  const pending = membershipState === "PENDING";
  const invitationPending = membershipState === "APPROVED_INVITATION_PENDING";
  if (!signedOut && ["AUTH_LOADING", "MEMBERSHIP_RECONCILING"].includes(membershipState)) return null;
  const welcome = needsAdmission && !pending && !invitationPending && !welcomeDismissed;
  if (!welcome && !pending && !invitationPending && !activeCustomer) return null;

  const heading = pending
    ? "Pendaftaranmu sudah diterima."
    : invitationPending
      ? "Pendaftaranmu sudah disetujui."
      : "Selamat datang di Blessing For Good";
  const description = pending
    ? "Pastikan kamu sudah bergabung ke WhatsApp Group BFG. Admin akan memeriksa pendaftaranmu."
    : invitationPending
      ? "Cek email untuk menyelesaikan aktivasi akun."
      : "Untuk menjadi Blessfriend, memesan buku, dan mengakses Secret Catalog BFG, ada dua langkah yang perlu kamu selesaikan: bergabung ke WhatsApp Group BFG dan mendaftar sebagai Blessfriend di website.";

  return (
    <div className="home-onboarding" id="mulai-di-sini">
      {welcome || pending || invitationPending ? (
        <section
          className={`home-onboarding-main${welcome ? " home-onboarding-main-welcome" : ""}`}
          aria-labelledby="home-onboarding-title"
          aria-label={welcome ? "Selamat datang di Blessing For Good" : undefined}
          role="region"
        >
          <div className="home-onboarding-copy">
            <div className="home-onboarding-heading">
              <div>
                <span className="eyebrow">{welcome ? "Mulai di sini" : "Status Blessfriend"}</span>
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
            <p>{description}</p>
            {welcome ? (
              <>
                <p className="home-onboarding-helper">
                  WhatsApp digunakan untuk update buku, informasi PO, dan akses Secret Catalog. Website digunakan untuk
                  akun, pemesanan, tagihan, dan tracking.
                </p>
                <ActionGroup variant="responsive" className="home-onboarding-actions">
                  <LinkButton href="/join">Gabung Blessfriends</LinkButton>
                  <LinkButton href="/how-to-order" variant="secondary">
                    Pelajari cara pesan
                  </LinkButton>
                </ActionGroup>
              </>
            ) : null}
            {pending ? (
              <ActionGroup variant="responsive" className="home-onboarding-actions">
                <LinkButton href={WHATSAPP_HANDOFF_URL} target="_blank" rel="noopener noreferrer">
                  Minta link WhatsApp Group
                </LinkButton>
              </ActionGroup>
            ) : null}
          </div>
          <div className="home-onboarding-art">
            <BrandMascot variant="warm" className="home-onboarding-mascot" />
          </div>
        </section>
      ) : null}

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
    </div>
  );
}
