const BRANDING_STORAGE_KEY = "sentence_public_branding";

function cleanText(value, maximumLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maximumLength);
}

function safeBrandImage(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 512 * 1024) return "";
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=\s]+$/i.test(raw)) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    const localHosts = ["localhost", "127.0.0.1", "[::1]"];
    const localDevelopment = localHosts.includes(window.location.hostname);
    if (url.protocol === "https:" || (url.protocol === "http:" && (url.origin === window.location.origin || (localDevelopment && localHosts.includes(url.hostname))))) return url.toString();
  } catch {
    return "";
  }
  return "";
}

try {
  const cached = JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || "null");
  if (cached && typeof cached === "object") {
    const branding = {
      site_name: cleanText(cached.site_name, 100),
      site_logo: safeBrandImage(cached.site_logo),
      site_subtitle: cleanText(cached.site_subtitle, 240),
    };
    window.__sentencePublicBranding = branding;
    if (branding.site_logo) document.querySelector('link[rel~="icon"]')?.setAttribute("href", branding.site_logo);
    if (branding.site_name) document.title = branding.site_name;
  }
} catch {
  // Public settings will apply the final brand after the app starts.
}
