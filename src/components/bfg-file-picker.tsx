"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui";

export function BFGFilePicker({
  accept,
  ariaLabel,
  buttonLabel = "Pilih file",
  changeLabel = "Ganti file",
  disabled = false,
  error,
  file,
  helper,
  inputClassName = "",
  onFileChange,
  onValidationError,
  pending = false,
  pendingLabel = "Memproses…",
  required = false,
  validateFile,
  label,
}: {
  accept?: string;
  ariaLabel: string;
  buttonLabel?: string;
  changeLabel?: string;
  disabled?: boolean;
  error?: string;
  file: File | null;
  helper?: string;
  inputClassName?: string;
  label?: string;
  onFileChange: (file: File | null) => void;
  onValidationError?: (error: string) => void;
  pending?: boolean;
  pendingLabel?: string;
  required?: boolean;
  validateFile?: (file: File) => string | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectionError, setSelectionError] = useState("");
  const describedBy = [helper ? `${inputId}-help` : "", selectionError || error ? `${inputId}-error` : ""]
    .filter(Boolean)
    .join(" ");
  const blockingError = selectionError || error;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    const nextError = nextFile && validateFile ? validateFile(nextFile) || "" : "";
    onFileChange(nextFile);
    setSelectionError(nextError);
    onValidationError?.(nextError);
  }

  return (
    <div className={`bfg-file-picker${blockingError ? " is-invalid" : ""}${disabled ? " is-disabled" : ""}`}>
      {label ? (
        <span className="field-label" id={`${inputId}-label`}>
          {label}
        </span>
      ) : null}
      {helper ? (
        <span className="field-hint" id={`${inputId}-help`}>
          {helper}
        </span>
      ) : null}
      <input
        ref={inputRef}
        accept={accept}
        aria-describedby={describedBy || undefined}
        aria-invalid={blockingError ? true : undefined}
        aria-label={ariaLabel}
        className={`bfg-file-picker-input ${inputClassName}`.trim()}
        disabled={disabled || pending}
        id={`${inputId}-input`}
        onChange={handleFileChange}
        required={required}
        tabIndex={-1}
        type="file"
      />
      <div className="bfg-file-picker-control" aria-busy={pending || undefined}>
        <Button
          disabled={disabled || pending}
          pending={pending}
          pendingLabel={pendingLabel}
          type="button"
          variant="secondary"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            inputRef.current?.click();
          }}
        >
          {file ? changeLabel : buttonLabel}
        </Button>
        <span className={`bfg-file-picker-name${file ? "" : " is-empty"}`} title={file?.name} aria-live="polite">
          {file?.name || "Belum ada file dipilih"}
        </span>
      </div>
      {blockingError ? (
        <span className="bfg-file-picker-error" id={`${inputId}-error`} role="alert">
          {blockingError}
        </span>
      ) : null}
    </div>
  );
}
