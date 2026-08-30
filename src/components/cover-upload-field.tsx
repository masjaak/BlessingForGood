"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { BookCover } from "@/components/book-cover";
import { normalizeUploadMimeType } from "@/lib/upload-file";
import { Button } from "@/components/ui";

const acceptedCoverTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateCoverFile(file: File) {
  if (!acceptedCoverTypes.has(normalizeUploadMimeType(file.type))) return "Cover harus berupa JPG, PNG, atau WebP.";
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
  loading = false,
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
  loading?: boolean;
  publisher: string;
  title: string;
}) {
  const inputId = useId();
  const [selectionError, setSelectionError] = useState("");
  const previewUrl = useMemo(
    () => (file && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (previewUrl) return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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
        <BFGFilePicker
          accept="image/jpeg,image/png,image/webp"
          ariaLabel="Pilih file cover"
          buttonLabel="Pilih gambar"
          changeLabel="Ganti gambar"
          error={error}
          file={file}
          helper="JPG, PNG, atau WebP. Maksimal 5 MB."
          inputClassName="cover-upload-file-input"
          label="File cover"
          onFileChange={(nextFile) => {
            onFileChange(nextFile);
          }}
          onValidationError={setSelectionError}
          loading={loading}
          validateFile={validateCoverFile}
        />
        <div className="cover-upload-actions">
          <Button
            disabled={!file || !displaySrc || Boolean(blockingError)}
            loading={loading}
            loadingLabel="Menyimpan…"
            type="button"
            onClick={() => onUpload()}
          >
            Simpan cover
          </Button>
        </div>
        {message ? (
          <p className="cover-upload-feedback is-success" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
