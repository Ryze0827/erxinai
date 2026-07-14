const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const EXPIRES_AT_KEY = "token_expires_at";
const USER_KEY = "auth_user";
const PENDING_AUTH_KEY = "pending_auth_session";
export const AUTH_SESSION_EVENT = "sentence-auth-session-changed";

const authKeys = [TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, USER_KEY];

function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

function removeAuthSessionData() {
  authKeys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function storageHasToken(storage) {
  return Boolean(storage.getItem(TOKEN_KEY));
}

export function getAuthStorage() {
  if (storageHasToken(sessionStorage)) return sessionStorage;
  return localStorage;
}

export function isPersistentSession() {
  return storageHasToken(localStorage) && !storageHasToken(sessionStorage);
}

export function clearAuthSession() {
  removeAuthSessionData();
  notifyAuthSessionChanged();
}

export function getAccessToken() {
  return getAuthStorage().getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return getAuthStorage().getItem(REFRESH_TOKEN_KEY);
}

export function getTokenExpiresAt() {
  return Number(getAuthStorage().getItem(EXPIRES_AT_KEY)) || 0;
}

export function getStoredUser() {
  const value = getAuthStorage().getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function persistAuthResponse(response, persistent = true) {
  removeAuthSessionData();
  const storage = persistent ? localStorage : sessionStorage;
  persistTokenResponse(response, storage);
  if (response.user) storage.setItem(USER_KEY, JSON.stringify(response.user));
  notifyAuthSessionChanged();
}

export function persistTokenResponse(response, storage = getAuthStorage()) {
  if (response.access_token) storage.setItem(TOKEN_KEY, response.access_token);
  if (response.refresh_token) storage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
  if (response.expires_in) {
    storage.setItem(EXPIRES_AT_KEY, String(Date.now() + response.expires_in * 1000));
  }
}

export function setStoredUser(user) {
  if (user) {
    getAuthStorage().setItem(USER_KEY, JSON.stringify(user));
    notifyAuthSessionChanged();
  }
}

export function savePendingAuthSession(session) {
  localStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(session));
}

export function getPendingAuthSession() {
  const value = localStorage.getItem(PENDING_AUTH_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function clearPendingAuthSession() {
  localStorage.removeItem(PENDING_AUTH_KEY);
}
