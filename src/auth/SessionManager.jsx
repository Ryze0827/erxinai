import { useEffect, useState } from "react";
import { refreshAuthSession } from "../api/client";
import { authApi } from "../api/auth";
import { AUTH_SESSION_EVENT, getAccessToken, getTokenExpiresAt, setStoredUser } from "../api/session";

const REFRESH_EARLY_MS = 60_000;
const MAX_TIMER_MS = 2_147_000_000;

function getRefreshDelay() {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return null;
  return Math.min(Math.max(expiresAt - Date.now() - REFRESH_EARLY_MS, 0), MAX_TIMER_MS);
}

export function SessionManager() {
  const [sessionToken, setSessionToken] = useState(() => getAccessToken());

  useEffect(() => {
    const sync = () => setSessionToken(getAccessToken());
    window.addEventListener(AUTH_SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!getAccessToken()) return undefined;
    let cancelled = false;
    let refreshTimer;

    const scheduleRefresh = () => {
      const delay = getRefreshDelay();
      if (cancelled || delay === null) return;
      refreshTimer = window.setTimeout(async () => {
        try {
          await refreshAuthSession();
          scheduleRefresh();
        } catch {
          // The API layer clears an expired session.
        }
      }, delay);
    };

    const restoreSession = async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (cancelled) return;
        setStoredUser(user);
        scheduleRefresh();
      } catch {
        // A failed restore is handled by the API refresh path.
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
    };
  }, [sessionToken]);

  return null;
}
