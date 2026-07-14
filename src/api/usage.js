import { apiRequest, gatewayRequest } from "./client";

export const usageApi = {
  list: (query = {}, signal) => apiRequest("/usage", { query, signal }),
  get: (id) => apiRequest(`/usage/${id}`),
  stats: (query = {}, signal) => apiRequest("/usage/stats", { query, signal }),
  dashboardStats: () => apiRequest("/usage/dashboard/stats"),
  dashboardTrend: (query = {}, signal) => apiRequest("/usage/dashboard/trend", { query, signal }),
  dashboardModels: (query = {}, signal) => apiRequest("/usage/dashboard/models", { query, signal }),
  dashboardSnapshot: (query = {}, signal) => apiRequest("/usage/dashboard/snapshot-v2", { query, signal }),
  keyUsageBatch: (apiKeyIds, signal) => apiRequest("/usage/dashboard/api-keys-usage", {
    method: "POST",
    body: { api_key_ids: apiKeyIds },
    signal,
  }),
  errors: (query = {}, signal) => apiRequest("/usage/errors", { query, signal }),
  error: (id, signal) => apiRequest(`/usage/errors/${id}`, { signal }),
  publicKeyUsage: (apiKey, query = {}, signal) => gatewayRequest("/v1/usage", { apiKey, query, signal }),
};
