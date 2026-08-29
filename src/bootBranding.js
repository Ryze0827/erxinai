import { DEFAULT_SITE_LOGO, normalizeSiteName } from "./branding";

const BRANDING_STORAGE_KEY = "sentence_public_branding";

function cleanText(value, maximumLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maximumLength);
}

try {
  const cached = JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || "null");
  if (cached && typeof cached === "object") {
    const branding = {
      site_name: normalizeSiteName(cached.site_name),
      site_logo: DEFAULT_SITE_LOGO,
      site_subtitle: cleanText(cached.site_subtitle, 240),
    };
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
    window.__sentencePublicBranding = branding;
    if (branding.site_name) document.title = branding.site_name;
  }
} catch {
  // Public settings will apply the final brand after the app starts.
}
