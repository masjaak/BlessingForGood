"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BookCover, type CoverPresentation } from "@/components/book-cover";
import { Button } from "@/components/ui";

const acceptedCoverTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const defaultCoverPresentation: CoverPresentation = { zoom: 1, x: 0, y: 0 };

export function validateCoverFile(file: File) {
  if (!acceptedCoverTypes.has(file.type)) return "Cover harus berupa JPG, PNG, atau WebP.";
  if (file.size > 5_000_000) return "Ukuran cover maksimal 5 MB.";
  return null;
}

export function CoverUploadField({
  currentSrc,
  currentPresentation,
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
  onUpload: (presentation: CoverPresentation) => void;
  pending?: boolean;
  publisher: string;
  title: string;
  currentPresentation?: CoverPresentation | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [selectionError, setSelectionError] = useState("");
  const [presentation, setPresentation] = useState<CoverPresentation>(currentPresentation || defaultCoverPresentation);
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
    if (nextFile) setPresentation(defaultCoverPresentation);
    onFileChange(nextFile);
    event.target.value = "";
  }

  function updatePresentation(key: keyof CoverPresentation, value: string) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    setPresentation((current) => ({ ...current, [key]: nextValue }));
  }

  const displaySrc = previewUrl || currentSrc;
  const blockingError = selectionError || error;

  return (
    <section className="cover-upload-field" aria-labelledby={`${inputId}-heading`}>
      <div className={`cover-upload-preview${displaySrc ? "" : " is-empty"}`}>
        <BookCover
          alt={displaySrc ? `${title} cover preview` : undefined}
          format={format}
          presentation={displaySrc ? presentation : null}
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
        {displaySrc ? (
          <div className="cover-presentation-controls" aria-label="Atur tampilan cover">
            <span className="card-kicker">ATUR TAMPILAN</span>
            <label className="cover-presentation-control">
              <span>Zoom cover</span>
              <input
                aria-label="Zoom cover"
                max="4"
                min="1"
                onChange={(event) => updatePresentation("zoom", event.target.value)}
                step="0.01"
                type="range"
                value={presentation.zoom}
              />
            </label>
            <label className="cover-presentation-control">
              <span>Posisi horizontal cover</span>
              <input
                aria-label="Posisi horizontal cover"
                max="50"
                min="-50"
                onChange={(event) => updatePresentation("x", event.target.value)}
                step="1"
                type="range"
                value={presentation.x}
              />
            </label>
            <label className="cover-presentation-control">
              <span>Posisi vertikal cover</span>
              <input
                aria-label="Posisi vertikal cover"
                max="50"
                min="-50"
                onChange={(event) => updatePresentation("y", event.target.value)}
                step="1"
                type="range"
                value={presentation.y}
              />
            </label>
            <Button
              type="button"
              variant="quiet"
              size="compact"
              onClick={() => setPresentation(defaultCoverPresentation)}
            >
              Reset tampilan
            </Button>
          </div>
        ) : null}
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
            disabled={!displaySrc || Boolean(blockingError)}
            pending={pending}
            pendingLabel="Menyimpan…"
            type="button"
            onClick={() => onUpload(presentation)}
          >
            {file ? "Simpan cover" : "Simpan tampilan"}
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
