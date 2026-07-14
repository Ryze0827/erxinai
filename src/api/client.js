import {
  clearAuthSession,
  getAccessToken,
  getAuthStorage,
  getRefreshToken,
  persistTokenResponse,
} from "./session";

const API_BASE_URL = normalizeBaseURL(import.meta.env.VITE_API_BASE_URL || "/api/v1");
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiError";
    Object.assign(this, details);
  }
}

function normalizeBaseURL(value) {
  const normalized = String(value).trim().replace(/\/+$/, "");
  return normalized.startsWith("/") || /^https?:\/\//i.test(normalized) ? normalized : `/${normalized}`;
}

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function buildHeaders(options) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", navigator.language || "en");
  const token = getAccessToken();
  if (token && !options.skipAuth) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function unwrapResponse(response, payload) {
  const isEnvelope = payload && typeof payload === "object" && "code" in payload;
  if (response.ok && (!isEnvelope || payload.code === 0)) return isEnvelope ? payload.data : payload;
  const message = payload?.message || `Request failed with status ${response.status}`;
  throw new ApiError(message, {
    status: response.status,
    code: payload?.code,
    reason: payload?.reason,
    metadata: payload?.metadata,
    data: payload?.data,
  });
}

function isRefreshableRequest(path, options) {
  if (options.skipRefresh) return false;
  return !["/auth/login", "/auth/register", "/auth/refresh"].some((endpoint) => path.includes(endpoint));
}

async function fetchJSON(path, options) {
  const response = await fetch(buildApiUrl(path), {
    method: options.method || "GET",
    credentials: "include",
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  return { response, payload: await readResponse(response) };
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError("Session expired.", { status: 401 });
  const { response, payload } = await fetchJSON("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    skipAuth: true,
    skipRefresh: true,
  });
  const data = unwrapResponse(response, payload);
  persistTokenResponse(data, getAuthStorage());
  return data.access_token;
}

async function queueRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function refreshAuthSession() {
  try {
    return await queueRefresh();
  } catch (error) {
    clearExpiredSession();
    throw error;
  }
}

export async function apiRequest(path, options = {}) {
  try {
    const { response, payload } = await fetchJSON(path, options);
    if (response.status !== 401 || !getRefreshToken() || !isRefreshableRequest(path, options)) {
      return unwrapResponse(response, payload);
    }
    await refreshAuthSession();
    const retried = await fetchJSON(path, { ...options, skipRefresh: true });
    return unwrapResponse(retried.response, retried.payload);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Network error. Please check your connection.", { status: 0, cause: error });
  }
}

export function clearExpiredSession() {
  clearAuthSession();
  sessionStorage.setItem("auth_expired", "1");
}
