import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ToastProvider, useToastManager } from "@appica/ui-react/toast";
import { authApi } from "../api/auth";
import { clearAuthSession, AUTH_SESSION_EVENT, getAccessToken, getRefreshToken, getStoredUser, setStoredUser } from "../api/session";
import { usePublicSettings } from "../auth/usePublicSettings";
import { readCachedBranding, resolveBranding } from "../branding";
import { Icon } from "./Icon";

const ConsoleContext = createContext(null);

export function resolveFeature(settings, key, mode = "opt-in") {
  const value = settings?.[key];
  if (typeof value === "boolean") return value;
  return mode === "opt-out";
}

function ConsoleProviderValue({ children }) {
  const { settings, loading: settingsLoading, error: settingsError, retry: retrySettings } = usePublicSettings();
  const { add: addToast, close: closeToast, toasts } = useToastManager();
  const cachedBranding = useMemo(() => readCachedBranding() || resolveBranding(), []);
  const branding = useMemo(() => settings ? resolveBranding(settings) : cachedBranding, [cachedBranding, settings]);
  const [user, setUser] = useState(() => getStoredUser());

  const syncSession = useCallback(() => setUser(getStoredUser()), []);
  useEffect(() => {
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [syncSession]);
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
    closeToast(String(id));
  }, [closeToast]);

  const notify = useCallback((type, message, duration = 4200) => {
    const icon = type === "success" ? "check" : type === "info" ? "info" : "warning";
    return addToast({
      type,
      title: message,
      timeout: duration,
      priority: type === "error" ? "high" : "low",
      data: { icon: <Icon name={icon} size={18} /> },
    });
  }, [addToast]);

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
    branding,
    brandingReady: Boolean(branding),
    retrySettings,
    refreshUser,
    updateUser,
    logout,
    notify,
    toasts,
    dismissToast,
  }), [user, settings, settingsLoading, settingsError, branding, retrySettings, refreshUser, updateUser, logout, notify, toasts, dismissToast]);

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function ConsoleProvider({ children }) {
  return <ToastProvider timeout={4200}><ConsoleProviderValue>{children}</ConsoleProviderValue></ToastProvider>;
}

export function useConsole() {
  return useContext(ConsoleContext);
}
