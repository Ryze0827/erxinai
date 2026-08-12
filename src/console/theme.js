import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sentence_console_theme";
const PREFERENCES = ["light", "dark"];
const THEME_EVENT = "sentence-console-theme";
const LEGACY_APPEARANCE_STORAGE_KEYS = ["sentence_console_glass_transparency", "sentence_console_background"];
const LEGACY_APPEARANCE_PROPERTIES = [
  "--console-surface-alpha",
  "--console-surface-raised-alpha",
  "--console-surface-subtle-alpha",
  "--console-surface-muted-alpha",
  "--console-announcement-surface-alpha",
];

function clearLegacyAppearance() {
  const root = document.documentElement;
  LEGACY_APPEARANCE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_APPEARANCE_PROPERTIES.forEach((property) => root.style.removeProperty(property));
  delete root.dataset.consoleBackground;
}

export function getThemePreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return PREFERENCES.includes(stored) ? stored : "light";
}

export function resolveTheme(preference = getThemePreference()) {
  return PREFERENCES.includes(preference) ? preference : "light";
}

export function applyTheme(preference = getThemePreference()) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.consoleTheme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  clearLegacyAppearance();
}

export function setThemePreference(preference) {
  const next = PREFERENCES.includes(preference) ? preference : "light";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
}

export function useTheme() {
  const [preference, setPreferenceState] = useState(getThemePreference);
  const [resolved, setResolved] = useState(() => resolveTheme());

  useEffect(() => {
    const sync = () => {
      applyTheme();
      setPreferenceState(getThemePreference());
      setResolved(resolveTheme());
    };
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setPreference = useCallback((next) => setThemePreference(next), []);
  const cycle = useCallback(() => {
    const order = ["light", "dark"];
    const current = getThemePreference();
    setThemePreference(order[(order.indexOf(current) + 1) % order.length]);
  }, []);

  return { preference, resolved, setPreference, cycle };
}
// Apply the selected Appica theme before the console renders.
applyTheme();
