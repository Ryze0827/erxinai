import { safeImageUrl } from "./console/utils";

export const BRANDING_STORAGE_KEY = "sentence_public_branding";
export const DEFAULT_SITE_NAME = "WayX";
export const DEFAULT_SITE_LOGO = "/assets/img/sentence-ai-icon.png";

export function resolveBranding(settings = {}) {
  return {
    siteName: String(settings.site_name || DEFAULT_SITE_NAME).trim() || DEFAULT_SITE_NAME,
    siteLogo: safeImageUrl(settings.site_logo) || DEFAULT_SITE_LOGO,
    siteSubtitle: String(settings.site_subtitle || "AI gateway").trim() || "AI gateway",
  };
}

export function readCachedBranding() {
  try {
    const cached = window.__sentencePublicBranding || JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || "null");
    return cached ? resolveBranding(cached) : null;
  } catch {
    return null;
  }
}

export function applyFavicon(siteLogo) {
  const favicon = document.querySelector('link[rel~="icon"]');
  if (favicon) favicon.setAttribute("href", safeImageUrl(siteLogo) || DEFAULT_SITE_LOGO);
}

export function persistBranding(settings) {
  const branding = resolveBranding(settings);
  const stored = {
    site_name: branding.siteName,
    site_logo: branding.siteLogo,
    site_subtitle: branding.siteSubtitle,
  };
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Brand rendering still works when storage is unavailable.
  }
  window.__sentencePublicBranding = stored;
  applyFavicon(branding.siteLogo);
  if (!document.title) document.title = branding.siteName;
  return branding;
}
