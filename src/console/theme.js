import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sentence_console_theme";
const PREFERENCES = ["light", "dark", "system"];
const THEME_EVENT = "sentence-console-theme";
const media = window.matchMedia?.("(prefers-color-scheme: dark)");

export function getThemePreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return PREFERENCES.includes(stored) ? stored : "system";
}

export function resolveTheme(preference = getThemePreference()) {
  if (preference === "system") return media?.matches ? "dark" : "light";
  return preference;
}

export function applyTheme(preference = getThemePreference()) {
  document.documentElement.dataset.consoleTheme = resolveTheme(preference);
}

export function setThemePreference(preference) {
  const next = PREFERENCES.includes(preference) ? preference : "system";
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
    const onSystemChange = () => {
      applyTheme();
      sync();
    };
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);
    media?.addEventListener("change", onSystemChange);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
      media?.removeEventListener("change", onSystemChange);
    };
  }, []);

  const setPreference = useCallback((next) => setThemePreference(next), []);
  const cycle = useCallback(() => {
    const order = ["light", "dark", "system"];
    const current = getThemePreference();
    setThemePreference(order[(order.indexOf(current) + 1) % order.length]);
  }, []);

  return { preference, resolved, setPreference, cycle };
}

// Apply the stored theme as soon as the console bundle loads so themed
// surfaces never flash the wrong palette.
applyTheme();
