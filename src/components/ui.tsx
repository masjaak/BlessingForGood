import Link from "next/link";
import { forwardRef } from "react";
import {
  type ButtonHTMLAttributes,
  type ComponentProps,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { BrandMascot, type BrandMascotVariant } from "@/components/brand";
import { formatIdr } from "@/domain/prototype/logic";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "compact" | "default" | "large";
export type FrameVariant = "operational" | "form" | "table" | "list" | "summary" | "detail" | "empty" | "attention";
export type ActionGroupVariant = "inline" | "stacked" | "responsive";

type ButtonContentProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
  children?: ReactNode;
};

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & ButtonContentProps;

function buttonClassName(variant: ButtonVariant, size: ButtonSize, className: string) {
  return ["button", `button-${variant}`, `button-size-${size}`, className].filter(Boolean).join(" ");
}

function ButtonContents({
  children,
  loading,
  loadingLabel,
}: Pick<ButtonContentProps, "children" | "loading" | "loadingLabel">) {
  return (
    <>
      {loading ? <span className="button-spinner" aria-hidden="true" /> : null}
      {loading && loadingLabel ? (
        <span className="button-label-stack">
          <span className="button-label button-label-hidden" aria-hidden="true">
            {children}
          </span>
          <span className="button-label button-label-visible" aria-live="polite">
            {loadingLabel}
          </span>
        </span>
      ) : (
        <span className="button-label" aria-live={loading ? "polite" : undefined}>
          {children}
        </span>
      )}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    loading = false,
    loadingLabel,
    className = "",
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      className={buttonClassName(variant, size, className)}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
    >
      <ButtonContents loading={loading} loadingLabel={loadingLabel}>
        {children}
      </ButtonContents>
    </button>
  );
});

export type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className" | "children" | "onClick"> &
  ButtonContentProps & {
    disabled?: boolean;
    onClick?: ComponentProps<typeof Link>["onClick"];
  };

export function LinkButton({
  href,
  variant = "primary",
  size = "default",
  loading = false,
  loadingLabel,
  className = "",
  disabled = false,
  children,
  ...props
}: LinkButtonProps) {
  const classes = buttonClassName(variant, size, className);
  if (disabled || loading) {
    return (
      <span
        className={classes}
        data-loading={loading ? "true" : undefined}
        aria-busy={loading || undefined}
        aria-disabled="true"
      >
        <ButtonContents loading={loading} loadingLabel={loadingLabel}>
          {children}
        </ButtonContents>
      </span>
    );
  }

  return (
    <Link {...props} href={href} className={classes}>
      <ButtonContents>{children}</ButtonContents>
    </Link>
  );
}

export type IconButtonProps = Omit<ButtonProps, "children"> & { children: ReactNode; "aria-label": string };

export function IconButton({ className = "", ...props }: IconButtonProps) {
  return <Button {...props} className={`button-icon ${className}`.trim()} />;
}

export type LinkIconButtonProps = Omit<LinkButtonProps, "children"> & { children: ReactNode; "aria-label": string };

export function LinkIconButton({ className = "", ...props }: LinkIconButtonProps) {
  return <LinkButton {...props} className={`button-icon ${className}`.trim()} />;
}

export type ToggleButtonProps = Omit<ButtonProps, "aria-pressed"> & { pressed: boolean };

export function ToggleButton({ pressed, ...props }: ToggleButtonProps) {
  return <Button {...props} aria-pressed={pressed} data-pressed={pressed ? "true" : undefined} />;
}

export function ActionGroup({
  children,
  variant = "inline",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; variant?: ActionGroupVariant }) {
  return (
    <div className={`action-group action-group-${variant} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export { ConfirmationDialog } from "./confirmation-dialog";

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

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`bfg-skeleton ${className}`.trim()} style={style} />;
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

export function SkeletonTable({
  rows = 4,
  columnWidths = ["1.5fr", "0.8fr", "1fr", "0.6fr"],
}: {
  rows?: number;
  columnWidths?: string[];
}) {
  const gridTemplateColumns = columnWidths.join(" ");
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-table-row" key={index} style={{ gridTemplateColumns }}>
          {columnWidths.map((_, columnIndex) => (
            <SkeletonText
              key={columnIndex}
              width={columnIndex === 0 ? "72%" : columnIndex === columnWidths.length - 1 ? "58%" : "64%"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export type PageHeaderSkeleton = {
  eyebrowWidth?: string;
  titleWidth?: string;
  descriptionWidths?: string[];
  actionWidths?: string[];
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  loading = false,
  skeleton,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  skeleton?: PageHeaderSkeleton;
}) {
  const titleText = typeof title === "string" ? title : "";
  const titleWidth =
    skeleton?.titleWidth || `${Math.min(92, Math.max(34, Math.round(Math.max(titleText.length, 18) * 1.35)))}%`;
  const eyebrowWidth = skeleton?.eyebrowWidth || `${Math.min(180, Math.max(96, eyebrow.length * 8))}px`;
  const descriptionWidths =
    skeleton?.descriptionWidths || (description && description.length > 110 ? ["92%", "58%"] : ["88%"]);
  const actionWidths = skeleton?.actionWidths || (actions ? ["124px"] : []);
  const hasLoadingActions = loading && actionWidths.length > 0;
  return (
    <header className={`page-header${loading ? " page-header-loading" : ""}`} aria-busy={loading || undefined}>
      <div>
        {loading ? (
          <SkeletonText className="page-header-skeleton-eyebrow" width={eyebrowWidth} />
        ) : (
          <span className="eyebrow">{eyebrow}</span>
        )}
        <h1>{loading ? <SkeletonText className="page-header-skeleton-title" width={titleWidth} /> : title}</h1>
        {description ? (
          loading ? (
            <p className="lede page-header-skeleton-description">
              {descriptionWidths.map((width, index) => (
                <SkeletonText key={index} width={width} />
              ))}
            </p>
          ) : (
            <p className="lede">{description}</p>
          )
        ) : null}
      </div>
      {actions || hasLoadingActions ? (
        <ActionGroup className="page-header-actions">
          {loading
            ? actionWidths.map((width, index) => <Skeleton className="skeleton-cta" key={index} style={{ width }} />)
            : actions}
        </ActionGroup>
      ) : null}
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
        <ActionGroup className="empty-actions">
          {action || primaryAction}
          {secondaryAction}
        </ActionGroup>
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
      {action ? <ActionGroup className="empty-actions">{action}</ActionGroup> : null}
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
