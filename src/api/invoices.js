import { ApiError, refreshAuthSession } from "./client";
import { getAccessToken } from "./session";

const FLOWPOOL_BASE_URL = String(import.meta.env.VITE_FLOWPOOL_BASE_URL || "").trim().replace(/\/+$/, "");

function invoiceUrl(path) {
  const base = FLOWPOOL_BASE_URL;
  if (!base || (base.startsWith("/") && !base.startsWith("//"))) return `${base}/api/invoice-user${path}`;
  const url = new URL(base);
  const localHosts = ["localhost", "127.0.0.1", "[::1]"];
  const localHttp = url.protocol === "http:" && localHosts.includes(url.hostname) && localHosts.includes(window.location.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.search || url.hash) throw new ApiError("VITE_FLOWPOOL_BASE_URL must be a valid HTTPS base URL (HTTP is allowed for local debugging).", { status: 0 });
  return `${base}/api/invoice-user${path}`;
}

// FlowPool controls invoice availability; Sub2API continues to handle user login.
async function request(path, { method = "GET", body, signal, blob = false } = {}, retried = false) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, 60000);
  try {
    const response = await fetch(invoiceUrl(path), {
      method, signal: controller.signal, credentials: "omit", cache: "no-store", redirect: "error",
      headers: { Authorization: `Bearer ${getAccessToken() || ""}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401 && !retried) {
      await refreshAuthSession();
      return request(path, { method, body, signal, blob }, true);
    }
    if (response.ok && blob) return response.blob();
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(typeof data?.detail === "string" ? data.detail : "Invoice request failed", { status: response.status });
    if (!data) throw new ApiError("Invoice service is unavailable", { status: 502 });
    return data;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export const invoiceApi = {
  settings: () => request("/settings"),
  orders: ({ page, pageSize }) => request(`/orders?page=${page}&page_size=${pageSize}`),
  quote: (orderIds, signal) => request("/quote", { method: "POST", body: { order_ids: orderIds }, signal }),
  submit: (body) => request("/requests", { method: "POST", body }),
  requests: (page = 1) => request(`/requests?page=${page}`),
  download: (id) => request(`/requests/${id}/file`, { blob: true }),
};
