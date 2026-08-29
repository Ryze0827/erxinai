import { DEFAULT_SITE_LOGO, DEFAULT_STATIC_SITE_LOGO } from "./branding";

export function BrandLogo({ animated = false, src, staticSrc, ...props }) {
  const requestedSrc = src || DEFAULT_SITE_LOGO;
  const fallbackSrc = staticSrc || (requestedSrc === DEFAULT_SITE_LOGO ? DEFAULT_STATIC_SITE_LOGO : requestedSrc);
  const imageSrc = animated ? requestedSrc : fallbackSrc;
  return <picture className="contents"><source media="(prefers-reduced-motion: reduce)" srcSet={fallbackSrc} /><img {...props} src={imageSrc} /></picture>;
}
