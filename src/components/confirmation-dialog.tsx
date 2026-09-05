"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionGroup, Button } from "./ui";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  danger = false,
  confirmationPhrase,
  checkboxLabel,
  checkboxRequired = false,
  disabled = false,
  className,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmationPhrase?: string;
  checkboxLabel?: string;
  checkboxRequired?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const confirmationSession = `${open}:${title}:${confirmationPhrase || ""}`;
  const [confirmationState, setConfirmationState] = useState({ session: "", value: "", checked: false });
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);
  const confirmationValue = confirmationState.session === confirmationSession ? confirmationState.value : "";
  const confirmationChecked = confirmationState.session === confirmationSession && confirmationState.checked;
  const canConfirm =
    !disabled &&
    (!confirmationPhrase || confirmationValue === confirmationPhrase) &&
    (!checkboxRequired || confirmationChecked);
  if (!open) return null;
  return (
    <dialog
      ref={dialogRef}
      className={`bfg-confirm-dialog${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      tabIndex={-1}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {children}
      {checkboxLabel ? (
        <label className="checkbox-row bfg-confirm-dialog-checkbox">
          <input
            type="checkbox"
            checked={confirmationChecked}
            onChange={(event) =>
              setConfirmationState({
                session: confirmationSession,
                value: confirmationValue,
                checked: event.target.checked,
              })
            }
          />
          <span>{checkboxLabel}</span>
        </label>
      ) : null}
      {confirmationPhrase ? (
        <label className="field bfg-confirm-dialog-confirmation">
          <span className="field-label">Ketik {confirmationPhrase} untuk melanjutkan.</span>
          <input
            className="input"
            type="text"
            value={confirmationValue}
            onChange={(event) =>
              setConfirmationState({
                session: confirmationSession,
                value: event.target.value,
                checked: confirmationChecked,
              })
            }
            autoComplete="off"
            autoFocus
            aria-label={`Ketik ${confirmationPhrase}`}
          />
        </label>
      ) : null}
      <ActionGroup>
        <Button type="button" variant="tertiary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          autoFocus={!confirmationPhrase}
          disabled={!canConfirm}
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </ActionGroup>
    </dialog>
  );
}
