import { ApiError, refreshAuthSession } from "./client";
import { getAccessToken } from "./session";

const FLOWPOOL_BASE_URL = String(import.meta.env.VITE_FLOWPOOL_BASE_URL || "").trim().replace(/\/+$/, "");

function invoiceUrl(path, service) {
  const base = FLOWPOOL_BASE_URL;
  if (!base || (base.startsWith("/") && !base.startsWith("//"))) return `${base}/api/${service}${path}`;
  const url = new URL(base);
  const localHosts = ["localhost", "127.0.0.1", "[::1]"];
  const localHttp = url.protocol === "http:" && localHosts.includes(url.hostname) && localHosts.includes(window.location.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.search || url.hash) throw new ApiError("VITE_FLOWPOOL_BASE_URL must be a valid HTTPS base URL (HTTP is allowed for local debugging).", { status: 0 });
  return `${base}/api/${service}${path}`;
}

// FlowPool controls invoice availability; Sub2API continues to handle user login.
export async function flowpoolRequest(path, { method = "GET", body, signal, blob = false, service = "invoice-user" } = {}, retried = false) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, 60000);
  try {
    const response = await fetch(invoiceUrl(path, service), {
      method, signal: controller.signal, credentials: "omit", cache: "no-store", redirect: "error",
      headers: { Authorization: `Bearer ${getAccessToken() || ""}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401 && !retried) {
      await refreshAuthSession();
      return flowpoolRequest(path, { method, body, signal, blob, service }, true);
    }
    if (response.ok && blob) return response.blob();
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(typeof data?.detail === "string" ? data.detail : "FlowPool request failed", { status: response.status });
    if (!data) throw new ApiError("FlowPool service is unavailable", { status: 502 });
    return data;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export const invoiceApi = {
  settings: () => flowpoolRequest("/settings"),
  orders: ({ page, pageSize }) => flowpoolRequest(`/orders?page=${page}&page_size=${pageSize}`),
  quote: (orderIds, signal) => flowpoolRequest("/quote", { method: "POST", body: { order_ids: orderIds }, signal }),
  submit: (body) => flowpoolRequest("/requests", { method: "POST", body }),
  requests: (page = 1) => flowpoolRequest(`/requests?page=${page}`),
  download: (id) => flowpoolRequest(`/requests/${id}/file`, { blob: true }),
};

export const promotionsApi = {
  welfareSchedule: (signal) => flowpoolRequest("/welfare-schedule", { service: "model-plaza-user", signal }),
};
