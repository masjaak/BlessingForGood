"use client";

import { useState, type ReactNode } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { ActivityIcon, useWorkspaceActivity } from "@/components/workspace-actions";
import { Button, Card } from "@/components/ui";

type AccountIconName = "profile" | "address" | "security" | "logout";

function AccountMenuIcon({ name }: { name: AccountIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle {...common} cx="12" cy="8" r="3.5" />
        <path {...common} d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  if (name === "address") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
        <circle {...common} cx="12" cy="10" r="2" />
      </svg>
    );
  }
  if (name === "security") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 3.5 19 6v5.2c0 4.5-2.8 7.9-7 9.3-4.2-1.4-7-4.8-7-9.3V6z" />
        <path {...common} d="m9.5 12 1.7 1.7 3.4-3.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path {...common} d="M14 4.5H5.5v15H14M10.5 12H21M17.5 8.5 21 12l-3.5 3.5" />
    </svg>
  );
}

function AccountMenuRow({
  arrow = true,
  description,
  href,
  icon,
  label,
  onClick,
  trailing,
  loading = false,
  loadingLabel,
  variant = "tertiary",
}: {
  arrow?: boolean;
  description: string;
  href?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  trailing?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  variant?: "tertiary" | "danger";
}) {
  const content = (
    <span className="account-menu-row-content">
      <span className="account-menu-row-main">
        <span className="account-menu-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="account-menu-row-copy">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </span>
      {trailing || arrow ? (
        <span className="account-menu-row-arrow" aria-hidden="true">
          {trailing}
          {!trailing ? "→" : null}
        </span>
      ) : null}
    </span>
  );

  if (href)
    return (
      <Link className="account-menu-row" href={href}>
        {content}
      </Link>
    );

  return (
    <Button
      aria-haspopup={label === "Keamanan akun" ? "dialog" : undefined}
      className={`account-menu-row ${variant === "danger" ? "account-menu-row-danger" : ""}`.trim()}
      loading={loading}
      loadingLabel={loadingLabel}
      onClick={onClick}
      type="button"
      variant={variant}
    >
      {content}
    </Button>
  );
}

export function AccountNavigation() {
  const { activity } = useWorkspaceActivity();
  const { signOut } = useAuth();
  const { openUserProfile } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function handleSignOut() {
    setSignOutError(false);
    setIsSigningOut(true);
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      setIsSigningOut(false);
      setSignOutError(true);
    }
  }

  return (
    <Card className="account-navigation-card">
      <section className="account-navigation-section" aria-labelledby="account-activity-heading">
        <div className="split-heading">
          <div>
            <span className="card-kicker">AKTIVITAS</span>
            <h2 id="account-activity-heading">Aktivitas</h2>
          </div>
        </div>
        <div className="account-menu-list">
          <AccountMenuRow
            description="Pembaruan sistem dan pesan operasional BFG"
            href="/account/notifications"
            icon={<ActivityIcon />}
            label="Buka Aktivitas"
            trailing={
              <>
                {activity ? <span className="account-menu-count">{activity > 99 ? "99+" : activity} baru</span> : null}
                <span aria-hidden="true">→</span>
              </>
            }
          />
        </div>
      </section>
      <section className="account-navigation-section" aria-labelledby="account-settings-heading">
        <div className="split-heading">
          <div>
            <span className="card-kicker">AKUN</span>
            <h2 id="account-settings-heading">Profil & alamat</h2>
          </div>
        </div>
        <div className="account-menu-list">
          <AccountMenuRow
            description="Nama dan informasi kontak"
            href="/account/profile"
            icon={<AccountMenuIcon name="profile" />}
            label="Profil"
          />
          <AccountMenuRow
            description="Kelola alamat untuk pesananmu"
            href="/account/addresses"
            icon={<AccountMenuIcon name="address" />}
            label="Alamat pengiriman"
          />
          <AccountMenuRow
            description="Kelola akun melalui Clerk"
            icon={<AccountMenuIcon name="security" />}
            label="Keamanan akun"
            onClick={openUserProfile}
          />
          <AccountMenuRow
            arrow={false}
            description="Keluar dari akun BFG"
            icon={<AccountMenuIcon name="logout" />}
            label="Keluar"
            loading={isSigningOut}
            loadingLabel="Keluar…"
            onClick={() => void handleSignOut()}
            variant="danger"
          />
          {signOutError ? (
            <p className="account-signout-error" role="alert">
              Keluar belum berhasil. Coba lagi.
            </p>
          ) : null}
        </div>
      </section>
    </Card>
  );
}
