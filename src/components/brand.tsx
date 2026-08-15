import Image from "next/image";
import Link from "next/link";
import { brandAssets } from "@/config/assets";

export type BrandLogoVariant = keyof typeof brandAssets.logos;
export type BrandMascotVariant = keyof typeof brandAssets.mascots;

export function BrandLogo({
  variant = "primary",
  linkToHome = true,
  className = "",
}: {
  variant?: BrandLogoVariant;
  linkToHome?: boolean;
  className?: string;
}) {
  const asset = brandAssets.logos[variant];
  const image = (
    <span className={`brand-logo-frame brand-logo-frame-${variant}`}>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        className={`brand-logo brand-logo-${variant} ${className}`.trim()}
        sizes={variant === "primary" || variant === "admin" ? "180px" : "64px"}
        priority={variant === "primary"}
        unoptimized={asset.src === "/brand/logos/Logo-1"}
      />
    </span>
  );

  return linkToHome ? (
    <Link className="brand-logo-link" href="/" aria-label="Blessing For Goods home">
      {image}
    </Link>
  ) : (
    image
  );
}

export function BrandMascot({
  variant = "default",
  decorative = false,
  priority = false,
  className = "",
}: {
  variant?: BrandMascotVariant;
  decorative?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const asset = brandAssets.mascots[variant];
  return (
    <Image
      src={asset.src}
      alt={decorative ? "" : asset.alt}
      width={asset.width}
      height={asset.height}
      className={`brand-mascot brand-mascot-${variant} ${className}`.trim()}
      sizes="(max-width: 640px) 112px, 160px"
      priority={priority}
    />
  );
}
