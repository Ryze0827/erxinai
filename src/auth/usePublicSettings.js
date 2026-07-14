import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "../api/auth";

let cachedSettings = null;
let settingsPromise = null;

function fetchSettings(force) {
  if (cachedSettings && !force) return Promise.resolve(cachedSettings);
  if (settingsPromise && !force) return settingsPromise;
  settingsPromise = authApi.getPublicSettings()
    .then((settings) => {
      cachedSettings = settings;
      return settings;
    })
    .finally(() => {
      settingsPromise = null;
    });
  return settingsPromise;
}

export function usePublicSettings() {
  const [settings, setSettings] = useState(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const nextSettings = await fetchSettings(force);
      if (mountedRef.current) setSettings(nextSettings);
    } catch {
      if (mountedRef.current) setError("We couldn't load the authentication settings.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!settings) load();
    return () => { mountedRef.current = false; };
  }, [load, settings]);

  return { settings, loading, error, retry: () => load(true) };
}
