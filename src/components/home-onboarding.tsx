"use client";

import { useContext } from "react";
import Link from "next/link";
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

function OnboardingStepCard({
  number,
  title,
  description,
  href,
  action,
  external = false,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
  action: string;
  external?: boolean;
}) {
  return (
    <li>
      <Link
        className="home-onboarding-step-card"
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        <span className="home-onboarding-step-number">{number}</span>
        <strong>{title}</strong>
        <span className="home-onboarding-step-description">{description}</span>
        <span className="home-onboarding-step-action">
          {action} <span aria-hidden="true">→</span>
        </span>
      </Link>
    </li>
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
              <OnboardingStepCard
                number="01"
                title="Gabung grup WhatsApp BFG"
                description={
                  whatsappGroupUrl
                    ? "Dapatkan update PO, info katalog, dan bergabung dengan komunitas Blessfriends."
                    : "Ajukan permintaan bergabung untuk mendapat info PO dan komunitas Blessfriends."
                }
                href={whatsappGroupUrl || "/join"}
                action={whatsappGroupUrl ? "Gabung grup" : "Ajukan permintaan"}
                external={Boolean(whatsappGroupUrl)}
              />
              <OnboardingStepCard
                number="02"
                title="Daftar sebagai Blessfriend di website"
                description="Ajukan permintaan bergabung untuk membuka katalog, memesan buku, dan memantau pesanan setelah disetujui."
                href="/join"
                action="Daftar sekarang"
              />
            </ol>
          ) : null}
          {!showFullOnboarding ? (
            <ActionGroup variant="responsive" className="home-onboarding-actions">
              {pending || invitationPending ? <WhatsAppAction href={whatsappGroupUrl} /> : null}
              {activeCustomer ? <LinkButton href="/catalog">Lihat Katalog PO Berjalan</LinkButton> : null}
            </ActionGroup>
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
