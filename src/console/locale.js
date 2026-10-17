// Kept free of dictionaries so the boot script and API client can resolve the
// locale before the app bundle renders.
export const LOCALE_STORAGE_KEY = "sentence_locale";
export const DEFAULT_LOCALE = "zh";

export function normalizeLocale(value) {
  return value === "zh" || value === "en" ? value : null;
}

export function readStoredLocale() {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function detectLocale() {
  const stored = readStoredLocale();
  if (stored) return stored;
  const languages = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    const normalized = String(language || "").toLowerCase();
    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function intlLocaleFor(locale) {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function htmlLangFor(locale) {
  return locale === "zh" ? "zh-CN" : "en";
}
