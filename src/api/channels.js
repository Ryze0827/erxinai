import { apiRequest } from "./client";

export const channelsApi = {
  available: (signal) => apiRequest("/channels/available", { signal }),
};

export const monitorApi = {
  list: (signal) => apiRequest("/channel-monitors", { signal }),
  status: (id) => apiRequest(`/channel-monitors/${id}/status`),
};
