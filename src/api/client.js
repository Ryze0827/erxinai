import {
  clearAuthSession,
  getAccessToken,
  getAuthStorage,
  getRefreshToken,
  persistTokenResponse,
} from "./session";

const API_BASE_URL = normalizeBaseURL(import.meta.env.VITE_API_BASE_URL || "/api/v1");
const DEFAULT_LOCALE = "en";
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

export function buildGatewayUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  try {
    const origin = new URL(API_BASE_URL, window.location.origin).origin;
    return new URL(normalizedPath, origin).toString();
  } catch {
    return normalizedPath;
  }
}

function getRequestLocale() {
  return localStorage.getItem("sentence_locale") || DEFAULT_LOCALE;
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function appendQuery(url, query = {}, method = "GET") {
  const parsed = new URL(url, window.location.origin);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    parsed.searchParams.set(key, String(value));
  });
  if (method === "GET" && !parsed.searchParams.has("timezone")) {
    parsed.searchParams.set("timezone", getTimezone());
  }
  return url.startsWith("http") ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
}

function buildHeaders(options) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !(options.body instanceof FormData) && !options.rawBody) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", getRequestLocale());
  const token = getAccessToken();
  if (token && !options.skipAuth) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function readErrorResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const message = await response.text();
  return message ? { message } : null;
}

async function readResponse(response, responseType = "json") {
  if (!response.ok) return readErrorResponse(response);
  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();
  if (responseType === "response") return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function unwrapResponse(response, payload) {
  const isEnvelope = payload && typeof payload === "object" && "code" in payload;
  if (response.ok && (!isEnvelope || payload.code === 0)) return isEnvelope ? payload.data : payload;
  const message = payload?.error?.message || payload?.message || `Request failed with status ${response.status}`;
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
  const method = options.method || "GET";
  const url = appendQuery(buildApiUrl(path), options.query, method);
  const body = options.body === undefined || options.rawBody || options.body instanceof FormData
    ? options.body
    : JSON.stringify(options.body);
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: buildHeaders(options),
    body,
    signal: options.signal,
  });
  return { response, payload: await readResponse(response, options.responseType) };
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
    if (error?.name === "AbortError") throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError("Network error. Please check your connection.", { status: 0, cause: error });
  }
}

export async function gatewayRequest(path, options = {}) {
  const method = options.method || "GET";
  const url = appendQuery(buildGatewayUrl(path), options.query, method);
  const headers = new Headers(options.headers || {});
  headers.set("Accept-Language", getRequestLocale());
  if (options.apiKey) headers.set("Authorization", `Bearer ${options.apiKey}`);
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined || options.body instanceof FormData ? options.body : JSON.stringify(options.body),
      signal: options.signal,
    });
    const payload = await readResponse(response, options.responseType);
    return unwrapResponse(response, payload);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError("Network error. Please check your connection.", { status: 0, cause: error });
  }
}

export function clearExpiredSession() {
  clearAuthSession();
  sessionStorage.setItem("auth_expired", "1");
}
