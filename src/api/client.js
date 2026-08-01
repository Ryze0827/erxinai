import {
  clearAuthSession,
  getAccessToken,
  getAuthStorage,
  getRefreshToken,
  persistTokenResponse,
} from "./session";

const API_BASE_URL = normalizeBaseURL(import.meta.env.VITE_API_BASE_URL || "/api/v1");
const DEFAULT_LOCALE = "en";
const DEFAULT_TIMEOUT_MS = 60_000;
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
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  if (normalized.startsWith("//")) throw new Error("VITE_API_BASE_URL cannot be protocol-relative.");
  if (!/^https?:\/\//i.test(normalized)) return `/${normalized}`;
  const url = new URL(normalized);
  const localHosts = ["localhost", "127.0.0.1", "[::1]"];
  if (url.protocol === "https:" || (url.protocol === "http:" && localHosts.includes(window.location.hostname) && localHosts.includes(url.hostname))) return normalized;
  throw new Error("VITE_API_BASE_URL must use HTTPS outside local development.");
}

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildGatewayUrl(path) {
  const rawPath = String(path || "");
  if (rawPath.startsWith("//")) throw new ApiError("The gateway URL is invalid.", { status: 0, reason: "INVALID_GATEWAY_URL" });
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  try {
    const origin = new URL(API_BASE_URL, window.location.origin).origin;
    const url = /^https?:\/\//i.test(path) ? new URL(path) : new URL(normalizedPath, origin);
    if (url.protocol === "https:" || (url.protocol === "http:" && (url.origin === window.location.origin || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) return url.toString();
    throw new ApiError("Gateway requests require HTTPS.", { status: 0, reason: "INSECURE_GATEWAY_URL" });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("The gateway URL is invalid.", { status: 0, reason: "INVALID_GATEWAY_URL" });
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
  if (contentType.includes("application/json")) {
    try { return await response.json(); } catch { return null; }
  }
  const message = await response.text();
  return message ? { message: message.slice(0, 2000) } : null;
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
  const backendMessage = payload?.error?.message || payload?.message || "";
  const sanitizedMessage = typeof backendMessage === "string"
    ? backendMessage.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 300)
    : "";
  const message = response.status >= 500
    ? "The service is temporarily unavailable. Please try again later."
    : sanitizedMessage || `Request failed with status ${response.status}`;
  throw new ApiError(message, {
    status: response.status,
    code: payload?.code,
    reason: payload?.reason,
  });
}

function isRefreshableRequest(path, options) {
  if (options.skipRefresh) return false;
  return !["/auth/login", "/auth/register", "/auth/refresh"].some((endpoint) => path.includes(endpoint));
}

async function fetchWithTimeout(url, init, sourceSignal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (sourceSignal?.aborted) abort();
  else sourceSignal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new ApiError("Request timed out. Please try again.", { status: 0, reason: "TIMEOUT", cause: error });
    throw error;
  } finally {
    window.clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", abort);
  }
}

async function fetchJSON(path, options) {
  const method = options.method || "GET";
  const url = appendQuery(buildApiUrl(path), options.query, method);
  const body = options.body === undefined || options.rawBody || options.body instanceof FormData
    ? options.body
    : JSON.stringify(options.body);
  const response = await fetchWithTimeout(url, {
    method,
    credentials: "include",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: buildHeaders(options),
    body,
  }, options.signal, options.timeoutMs);
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
    const response = await fetchWithTimeout(url, {
      method,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      headers,
      body: options.body === undefined || options.body instanceof FormData ? options.body : JSON.stringify(options.body),
    }, options.signal, options.timeoutMs);
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
