import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      setSettings(await fetchSettings(force));
    } catch {
      setError("We couldn't load the authentication settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!settings) load();
  }, [load, settings]);

  return { settings, loading, error, retry: () => load(true) };
}
