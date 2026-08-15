import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { BrandMascot, type BrandMascotVariant } from "@/components/brand";
import { formatIdr } from "@/domain/prototype/logic";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "default" | "compact" | "icon";
export type FrameVariant = "operational" | "form" | "table" | "list" | "summary" | "detail" | "empty" | "attention";

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  pending = false,
  pendingLabel = "Memproses…",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  pendingLabel?: string;
}) {
  return (
    <button
      className={`button button-${variant} button-size-${size} ${className}`.trim()}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "default",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link className={`button button-${variant} button-size-${size} ${className}`.trim()} href={href}>
      {children}
    </Link>
  );
}

export function Card({
  frame = "operational",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode; frame?: FrameVariant }) {
  return (
    <section className={`card frame-${frame} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function LoadingRegion({
  label = "Memuat…",
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`loading-region ${className}`.trim()} aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`bfg-skeleton ${className}`.trim()} />;
}

export function SkeletonText({ width = "100%", className = "" }: { width?: string; className?: string }) {
  return <span aria-hidden="true" className={`bfg-skeleton bfg-skeleton-text ${className}`.trim()} style={{ width }} />;
}

export function SkeletonCard({
  variant = "content",
}: {
  variant?: "content" | "book" | "order" | "invoice" | "account";
}) {
  if (variant === "book") {
    return (
      <Card className="skeleton-card book-card-skeleton" aria-hidden="true">
        <div className="book-card-layout">
          <Skeleton className="skeleton-cover" />
          <div className="skeleton-lines">
            <SkeletonText width="42%" />
            <SkeletonText width="86%" />
            <SkeletonText width="62%" />
            <SkeletonText width="74%" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`skeleton-card ${variant}-card-skeleton`} aria-hidden="true">
      <div className="skeleton-heading">
        <SkeletonText width="38%" />
        <SkeletonText width="24%" />
      </div>
      <SkeletonText width="72%" />
      <SkeletonText width="54%" />
      <SkeletonText width="90%" />
      <SkeletonText width="36%" />
    </Card>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-table-row" key={index}>
          <SkeletonText width="32%" />
          <SkeletonText width="18%" />
          <SkeletonText width="22%" />
          <SkeletonText width="12%" />
        </div>
      ))}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description ? <p className="lede">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning";
}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  eyebrow,
  mascotVariant = "default",
  action,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  mascotVariant?: BrandMascotVariant | false;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {mascotVariant ? <BrandMascot variant={mascotVariant} className="empty-mascot" decorative /> : null}
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      <p>{description}</p>
      {action || primaryAction || secondaryAction ? (
        <div className="empty-actions">
          {action || primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state error-state" role="alert">
      <span className="eyebrow">Terjadi kendala</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="empty-actions">{action}</div> : null}
    </div>
  );
}

export function Money({ amount }: { amount: number }) {
  return <span className="money">{formatIdr(amount)}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function InlineBooleanField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="field boolean-field">
      <span className="field-label boolean-field-spacer" aria-hidden="true" />
      <span className="check-row">
        <input
          type="checkbox"
          checked={checked}
          aria-label={label}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </span>
    </label>
  );
}
