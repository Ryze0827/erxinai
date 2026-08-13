export const BRANDING_STORAGE_KEY = "sentence_public_branding";
export const DEFAULT_SITE_NAME = "WayX";
export const DEFAULT_SITE_LOGO = "/assets/img/wayx-mark-64.png";

function cleanBrandText(value, fallback, maximumLength) {
  return String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maximumLength) || fallback;
}

export function resolveBranding(settings = {}) {
  return {
    siteName: cleanBrandText(settings.site_name, DEFAULT_SITE_NAME, 100),
    siteLogo: DEFAULT_SITE_LOGO,
    siteSubtitle: cleanBrandText(settings.site_subtitle, "AI gateway", 240),
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
  if (!document.title) document.title = branding.siteName;
  return branding;
}
