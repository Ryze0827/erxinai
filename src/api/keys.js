import { apiRequest } from "./client";

export const keysApi = {
  list: (page = 1, pageSize = 20, filters = {}, signal) => apiRequest("/keys", {
    query: { page, page_size: pageSize, ...filters },
    signal,
  }),
  get: (id) => apiRequest(`/keys/${id}`),
  create: (body) => apiRequest("/keys", { method: "POST", body }),
  update: (id, body) => apiRequest(`/keys/${id}`, { method: "PUT", body }),
  remove: (id) => apiRequest(`/keys/${id}`, { method: "DELETE" }),
  getDailyUsage: (id, days = 30) => apiRequest(`/user/api-keys/${id}/usage/daily`, { query: { days } }),
};

export const groupsApi = {
  available: () => apiRequest("/groups/available"),
  rates: () => apiRequest("/groups/rates"),
};
