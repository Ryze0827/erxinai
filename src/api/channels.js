import { apiRequest } from "./client";

export const channelsApi = {
  available: (signal) => apiRequest("/channels/available", { signal }),
};

export const monitorApi = {
  list: (signal) => apiRequest("/channel-monitors", { signal }),
  status: (id, signal) => apiRequest(`/channel-monitors/${id}/status`, { signal }),
  matrix: (query, signal) => apiRequest("/channel-monitor-v2/matrix", { query, signal }),
  models: (query, signal) => apiRequest("/channel-monitor-v2/models", { query, signal }),
};
