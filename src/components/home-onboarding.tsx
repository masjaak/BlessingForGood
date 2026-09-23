"use client";

import { useContext } from "react";
import { BrandMascot } from "@/components/brand";
import { HowToOrderSteps } from "@/components/how-to-order";
import { ProductContext } from "@/domain/prototype/context";
import { ActionGroup, LinkButton } from "@/components/ui";

type HomeOnboardingProps = {
  whatsappGroupUrl: string | null;
  tutorialVideoUrl: string | null;
};

function WhatsAppAction({ href }: { href: string | null }) {
  return href ? (
    <LinkButton href={href} target="_blank" rel="noopener noreferrer">
      Gabung Grup WhatsApp
    </LinkButton>
  ) : (
    <LinkButton href="/join">Gabung Grup WhatsApp</LinkButton>
  );
}

export function HomeOnboarding({ whatsappGroupUrl, tutorialVideoUrl }: HomeOnboardingProps) {
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
  const showFullOnboarding = needsAdmission && !pending && !invitationPending;

  if (!showFullOnboarding && !pending && !invitationPending && !activeCustomer) return null;

  const heading = activeCustomer
    ? "Lanjutkan perjalanan bukumu."
    : pending
      ? "Permintaanmu sedang ditinjau."
      : invitationPending
        ? "Undangan BFG sedang diproses."
        : "Mulai dari komunitas BFG.";
  const description = activeCustomer
    ? "Grup WhatsApp membantu mengikuti info PO; pemesanan dan pemantauan pesanan tetap dilakukan melalui website."
    : pending
      ? "Tidak perlu mengirim permintaan lagi. Kamu bisa mulai mengenal alur BFG sambil menunggu kabar dari tim."
      : invitationPending
        ? "Ikuti tautan undangan pada emailmu untuk menyelesaikan akses website BFG."
        : "Supaya bisa mengikuti katalog dan memesan buku bersama BFG, ada dua langkah yang perlu dilakukan.";

  return (
    <section className="home-onboarding" id="mulai-di-sini" aria-labelledby="home-onboarding-title">
      <div className="home-onboarding-main">
        <div className="home-onboarding-copy">
          <span className="eyebrow">Mulai di sini</span>
          <h2 id="home-onboarding-title">{heading}</h2>
          <p>{description}</p>
          {showFullOnboarding ? (
            <ol className="home-onboarding-steps">
              <li>
                <strong>Gabung grup WhatsApp BFG</strong>
                <span>Ruang komunitas dan info PO.</span>
              </li>
              <li>
                <strong>Daftar sebagai Blessfriend di website</strong>
                <span>Website untuk browsing, memesan, dan memantau pesanan.</span>
              </li>
            </ol>
          ) : null}
          <ActionGroup variant="responsive" className="home-onboarding-actions">
            {showFullOnboarding || pending || invitationPending ? <WhatsAppAction href={whatsappGroupUrl} /> : null}
            {showFullOnboarding ? (
              <LinkButton href="/join" variant="secondary">
                Daftar sebagai Blessfriend
              </LinkButton>
            ) : activeCustomer ? (
              <LinkButton href="/catalog">Lihat Katalog PO Berjalan</LinkButton>
            ) : null}
          </ActionGroup>
          {showFullOnboarding && !whatsappGroupUrl ? (
            <p className="home-onboarding-helper">
              Tautan grup akan muncul setelah permintaan bergabung berhasil dikirim.
            </p>
          ) : null}
        </div>
        <div className="home-onboarding-art">
          <BrandMascot variant="warm" className="home-onboarding-mascot" />
        </div>
      </div>

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
    </section>
  );
}
