"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

export type CoverPresentation = {
  zoom: number;
  x: number;
  y: number;
};

export function BookCover({
  title,
  publisher,
  format,
  presentation,
  src,
  alt,
}: {
  title: string;
  publisher: string;
  format?: string;
  presentation?: CoverPresentation | null;
  src?: string;
  alt?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const localSource = src?.startsWith("/") ? src : undefined;
  const storageSource = /^https:\/\/[^/]+\.convex\.cloud\/api\/storage\//.test(src || "") ? src : undefined;
  const previewSource = src?.startsWith("blob:") ? src : undefined;
  const presentationStyle = presentation
    ? ({
        "--cover-zoom": presentation.zoom,
        "--cover-x": `${presentation.x}%`,
        "--cover-y": `${presentation.y}%`,
      } as CSSProperties)
    : undefined;

  return (
    <div className="book-cover">
      {(storageSource || previewSource) && !imageFailed ? (
        // Convex returns short-lived signed storage URLs whose hostname is deployment-specific.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={presentation ? "book-cover-image is-positioned" : "book-cover-image"}
          src={storageSource || previewSource}
          alt={alt || `${title} cover`}
          onError={() => setImageFailed(true)}
          style={presentationStyle}
        />
      ) : localSource && !imageFailed ? (
        <Image
          className={`book-cover-image${presentation ? " is-positioned" : ""}`}
          src={localSource}
          alt={alt || `${title} cover`}
          fill
          sizes="(max-width: 640px) 96px, 132px"
          onError={() => setImageFailed(true)}
          style={presentationStyle}
        />
      ) : (
        <div className="book-cover-fallback" role="img" aria-label={`Cover placeholder for ${title}`}>
          <span className="book-cover-format">{format || "Buku"}</span>
          <strong>{title}</strong>
          <span>{publisher}</span>
        </div>
      )}
    </div>
  );
}
