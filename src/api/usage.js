import { apiRequest, gatewayRequest } from "./client";

export const usageApi = {
  list: (query = {}, signal) => apiRequest("/usage", { query, signal }),
  get: (id) => apiRequest(`/usage/${id}`),
  stats: (query = {}, signal) => apiRequest("/usage/stats", { query, signal }),
  dashboardStats: () => apiRequest("/usage/dashboard/stats"),
  dashboardTrend: (query = {}) => apiRequest("/usage/dashboard/trend", { query }),
  dashboardModels: (query = {}) => apiRequest("/usage/dashboard/models", { query }),
  dashboardSnapshot: (query = {}) => apiRequest("/usage/dashboard/snapshot-v2", { query }),
  keyUsageBatch: (apiKeyIds, signal) => apiRequest("/usage/dashboard/api-keys-usage", {
    method: "POST",
    body: { api_key_ids: apiKeyIds },
    signal,
  }),
  errors: (query = {}, signal) => apiRequest("/usage/errors", { query, signal }),
  error: (id) => apiRequest(`/usage/errors/${id}`),
  publicKeyUsage: (apiKey, query = {}, signal) => gatewayRequest("/v1/usage", { apiKey, query, signal }),
};
