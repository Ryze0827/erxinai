import { apiRequest } from "./client";

// These endpoints are protected by the backend's administrator middleware.
export const adminInspectionApi = {
  groups: (signal) => apiRequest("/admin/groups/all", { signal }),
  users: (page, signal, search = "") => apiRequest("/admin/users", {
    query: { page, page_size: 100, sort_by: "id", sort_order: "asc", include_subscriptions: false, search },
    signal,
  }),
  groupRates: (id, signal) => apiRequest(`/admin/groups/${id}/rate-multipliers`, { signal }),
  // The backend replaces the group's complete rate list, so callers must
  // send existing entries they intend to preserve.
  updateGroupRates: (id, entries, signal) => apiRequest(`/admin/groups/${id}/rate-multipliers`, {
    method: "PUT",
    body: { entries },
    signal,
  }),
  recharge: (id, signal) => apiRequest(`/admin/users/${id}/balance-history`, {
    query: { page: 1, page_size: 1 },
    signal,
  }),
};
