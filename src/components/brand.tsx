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
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className={`brand-logo brand-logo-${variant} ${className}`.trim()}
      sizes={variant === "primary" ? "76px" : "48px"}
      priority={variant === "primary"}
    />
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
  className = "",
}: {
  variant?: BrandMascotVariant;
  decorative?: boolean;
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
    />
  );
}
