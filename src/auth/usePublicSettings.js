import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "../api/auth";
import { normalizeSiteName, persistBranding } from "../branding";
import { useLocale } from "../console/i18n";

let cachedSettings = null;
let settingsPromise = null;

function fetchSettings(force) {
  if (cachedSettings && !force) return Promise.resolve(cachedSettings);
  if (settingsPromise && !force) return settingsPromise;
  settingsPromise = authApi.getPublicSettings()
    .then((settings) => {
      const normalizedSettings = { ...settings, site_name: normalizeSiteName(settings.site_name) };
      cachedSettings = normalizedSettings;
      persistBranding(normalizedSettings);
      return normalizedSettings;
    })
    .finally(() => {
      settingsPromise = null;
    });
  return settingsPromise;
}

export function usePublicSettings() {
  const { t } = useLocale();
  const [settings, setSettings] = useState(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setFailed(false);
    try {
      const nextSettings = await fetchSettings(force);
      if (mountedRef.current) setSettings(nextSettings);
    } catch {
      if (mountedRef.current) setFailed(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!settings) load();
    return () => { mountedRef.current = false; };
  }, [load, settings]);

  const retry = useCallback(() => load(true), [load]);
  const error = failed ? t("auth.error.settings") : "";

  return { settings, loading, error, retry };
}
