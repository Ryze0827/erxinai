import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "../api/auth";
import { clearAuthSession, AUTH_SESSION_EVENT, getAccessToken, getRefreshToken, getStoredUser, setStoredUser } from "../api/session";
import { usePublicSettings } from "../auth/usePublicSettings";

const ConsoleContext = createContext(null);

export function resolveFeature(settings, key, mode = "opt-in") {
  const value = settings?.[key];
  if (typeof value === "boolean") return value;
  return mode === "opt-out";
}

export function ConsoleProvider({ children }) {
  const { settings, loading: settingsLoading, error: settingsError, retry: retrySettings } = usePublicSettings();
  const [user, setUser] = useState(() => getStoredUser());
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(0);
  const toastTimers = useRef(new Set());

  const syncSession = useCallback(() => setUser(getStoredUser()), []);
  useEffect(() => {
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [syncSession]);
  useEffect(() => () => {
    toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    toastTimers.current.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) return null;
    const nextUser = await authApi.getCurrentUser();
    setStoredUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const updateUser = useCallback((nextUser) => {
    setStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((type, message, duration = 4200) => {
    const id = ++nextToastId.current;
    setToasts((current) => [...current, { id, type, message }]);
    const timer = window.setTimeout(() => {
      toastTimers.current.delete(timer);
      dismissToast(id);
    }, duration);
    toastTimers.current.add(timer);
    return id;
  }, [dismissToast]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Local logout must still complete if the server is unavailable.
    }
    clearAuthSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    authenticated: Boolean(user && getAccessToken()),
    settings,
    settingsLoading,
    settingsError,
    retrySettings,
    refreshUser,
    updateUser,
    logout,
    notify,
    toasts,
    dismissToast,
  }), [user, settings, settingsLoading, settingsError, retrySettings, refreshUser, updateUser, logout, notify, toasts, dismissToast]);

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole() {
  return useContext(ConsoleContext);
}
