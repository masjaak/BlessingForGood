"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui";

const acceptedCoverTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateCoverFile(file: File) {
  if (!acceptedCoverTypes.has(file.type)) return "Cover harus berupa JPG, PNG, atau WebP.";
  if (file.size > 5_000_000) return "Ukuran cover maksimal 5 MB.";
  return null;
}

export function CoverUploadField({
  currentSrc,
  error,
  file,
  format,
  message,
  onFileChange,
  onUpload,
  pending = false,
  publisher,
  title,
}: {
  currentSrc?: string;
  error?: string;
  file: File | null;
  format?: string;
  message?: string;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  pending?: boolean;
  publisher: string;
  title: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [selectionError, setSelectionError] = useState("");
  const previewUrl = useMemo(
    () => (file && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (previewUrl) return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setSelectionError(nextFile ? validateCoverFile(nextFile) || "" : "");
    onFileChange(nextFile);
    event.target.value = "";
  }

  const displaySrc = previewUrl || currentSrc;
  const blockingError = selectionError || error;

  return (
    <section className="cover-upload-field" aria-labelledby={`${inputId}-heading`}>
      <div className={`cover-upload-preview${displaySrc ? "" : " is-empty"}`}>
        <BookCover
          alt={displaySrc ? `${title} cover preview` : undefined}
          format={format}
          publisher={publisher}
          src={displaySrc}
          title={title}
        />
        {!displaySrc ? <span className="cover-upload-empty-label">Belum ada cover</span> : null}
      </div>
      <div className="cover-upload-controls">
        <div className="cover-upload-heading">
          <span className="card-kicker">COVER BUKU</span>
          <h2 id={`${inputId}-heading`}>Unggah cover</h2>
        </div>
        <p className="field-hint" id={`${inputId}-help`}>
          JPG, PNG, atau WebP. Maksimal 5 MB.
        </p>
        <input
          ref={inputRef}
          aria-describedby={`${inputId}-help`}
          aria-label="Pilih file cover"
          accept="image/jpeg,image/png,image/webp"
          className="cover-upload-file-input"
          id={`${inputId}-input`}
          onChange={handleFileChange}
          type="file"
        />
        <div className="cover-upload-actions">
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            {file ? "Ganti gambar" : "Pilih gambar"}
          </Button>
          <Button
            disabled={!file || Boolean(blockingError)}
            pending={pending}
            pendingLabel="Mengunggah…"
            type="button"
            onClick={onUpload}
          >
            Simpan cover
          </Button>
        </div>
        <p className="cover-upload-file-state" aria-live="polite">
          {file ? file.name : "Belum ada file dipilih"}
        </p>
        {blockingError ? (
          <p className="cover-upload-feedback is-error" role="alert">
            {blockingError}
          </p>
        ) : null}
        {message ? (
          <p className="cover-upload-feedback is-success" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
