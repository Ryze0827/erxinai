import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sentence_console_theme";
const GLASS_STORAGE_KEY = "sentence_console_glass_transparency";
const BACKGROUND_STORAGE_KEY = "sentence_console_background";
const PREFERENCES = ["light", "dark"];
const BACKGROUND_PREFERENCES = ["scene", "white"];
const THEME_EVENT = "sentence-console-theme";
const GLASS_EVENT = "sentence-console-glass-transparency";
const BACKGROUND_EVENT = "sentence-console-background";
const DEFAULT_GLASS_TRANSPARENCY = 50;
const GLASS_ALPHA = {
  light: { surface: 0.46, raised: 0.72, subtle: 0.38, muted: 0.5 },
  dark: { surface: 0.56, raised: 0.76, subtle: 0.48, muted: 0.52 },
};
function normalizeGlassTransparency(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, Math.round(numeric))) : DEFAULT_GLASS_TRANSPARENCY;
}

function scaledGlassAlpha(base, transparency) {
  const scale = 1.6 - transparency * 0.012;
  return Math.min(0.96, Math.max(0.14, base * scale)).toFixed(3);
}

export function getThemePreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return PREFERENCES.includes(stored) ? stored : "light";
}

export function getGlassTransparency() {
  return normalizeGlassTransparency(localStorage.getItem(GLASS_STORAGE_KEY) ?? DEFAULT_GLASS_TRANSPARENCY);
}

export function getConsoleBackground() {
  const stored = localStorage.getItem(BACKGROUND_STORAGE_KEY);
  return BACKGROUND_PREFERENCES.includes(stored) ? stored : "scene";
}

export function resolveTheme(preference = getThemePreference()) {
  return PREFERENCES.includes(preference) ? preference : "light";
}

export function applyGlassTransparency(transparency = getGlassTransparency()) {
  const next = normalizeGlassTransparency(transparency);
  const alpha = GLASS_ALPHA[resolveTheme()];
  const root = document.documentElement;
  root.style.setProperty("--console-surface-alpha", scaledGlassAlpha(alpha.surface, next));
  root.style.setProperty("--console-surface-raised-alpha", scaledGlassAlpha(alpha.raised, next));
  root.style.setProperty("--console-surface-subtle-alpha", scaledGlassAlpha(alpha.subtle, next));
  root.style.setProperty("--console-surface-muted-alpha", scaledGlassAlpha(alpha.muted, next));
}

export function applyConsoleBackground(background = getConsoleBackground(), theme = resolveTheme()) {
  const next = BACKGROUND_PREFERENCES.includes(background) ? background : "scene";
  document.documentElement.dataset.consoleBackground = theme === "dark" && next === "white" ? "scene" : next;
}

export function applyTheme(preference = getThemePreference()) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.consoleTheme = resolved;
  applyGlassTransparency();
  applyConsoleBackground(getConsoleBackground(), resolved);
}

export function setThemePreference(preference) {
  const next = PREFERENCES.includes(preference) ? preference : "light";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
}

export function setGlassTransparencyPreference(transparency) {
  const next = normalizeGlassTransparency(transparency);
  localStorage.setItem(GLASS_STORAGE_KEY, String(next));
  applyGlassTransparency(next);
  window.dispatchEvent(new CustomEvent(GLASS_EVENT, { detail: next }));
}

export function setConsoleBackgroundPreference(background) {
  const next = BACKGROUND_PREFERENCES.includes(background) ? background : "scene";
  localStorage.setItem(BACKGROUND_STORAGE_KEY, next);
  applyConsoleBackground(next);
  window.dispatchEvent(new CustomEvent(BACKGROUND_EVENT, { detail: next }));
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

export function useGlassTransparency() {
  const [transparency, setTransparencyState] = useState(getGlassTransparency);

  useEffect(() => {
    const sync = () => {
      const next = getGlassTransparency();
      applyGlassTransparency(next);
      setTransparencyState(next);
    };
    window.addEventListener(GLASS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GLASS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setTransparency = useCallback((next) => setGlassTransparencyPreference(next), []);
  return { transparency, setTransparency };
}

export function useConsoleBackground() {
  const [background, setBackgroundState] = useState(getConsoleBackground);

  useEffect(() => {
    const sync = () => {
      const next = getConsoleBackground();
      applyConsoleBackground(next);
      setBackgroundState(next);
    };
    window.addEventListener(BACKGROUND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BACKGROUND_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setBackground = useCallback((next) => setConsoleBackgroundPreference(next), []);
  return { background, setBackground };
}

// Apply stored appearance preferences as soon as the console bundle loads so
// themed surfaces never flash the wrong palette or backdrop.
applyTheme();
