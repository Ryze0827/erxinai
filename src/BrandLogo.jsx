import { DEFAULT_SITE_LOGO, DEFAULT_STATIC_SITE_LOGO } from "./branding";

export function BrandLogo({ src = DEFAULT_SITE_LOGO, staticSrc, ...props }) {
  const reducedMotionSrc = staticSrc || (src === DEFAULT_SITE_LOGO ? DEFAULT_STATIC_SITE_LOGO : src);
  return <picture className="contents"><source media="(prefers-reduced-motion: reduce)" srcSet={reducedMotionSrc} /><img {...props} src={src} /></picture>;
}
