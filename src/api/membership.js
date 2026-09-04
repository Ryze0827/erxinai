import { wayxRequest } from "./client";
import { membershipMockApi } from "./membershipMock";

const liveMembershipApi = {
  isMock: false,
  me(signal) {
    return wayxRequest("/membership/me", { signal });
  },
  quote(amount, signal) {
    return wayxRequest("/membership/quote", { query: { amount }, signal });
  },
  claim(orderId, signal) {
    return wayxRequest(`/membership/orders/${orderId}/claim`, { method: "POST", signal });
  },
  levels(signal) {
    return wayxRequest("/admin/membership/levels", { signal });
  },
  createLevel(body) {
    return wayxRequest("/admin/membership/levels", { method: "POST", body });
  },
  updateLevel(levelId, body) {
    return wayxRequest(`/admin/membership/levels/${levelId}`, { method: "PUT", body });
  },
  disableLevel(levelId) {
    return wayxRequest(`/admin/membership/levels/${levelId}`, { method: "DELETE" });
  },
  grants(query = {}, signal) {
    return wayxRequest("/admin/membership/grants", { query, signal });
  },
  resolveGrant(orderId, body) {
    return wayxRequest(`/admin/membership/grants/${orderId}/resolve`, { method: "POST", body });
  },
};

export const membershipApi = import.meta.env.DEV && import.meta.env.VITE_WAYX_MOCK !== "false"
  ? membershipMockApi
  : liveMembershipApi;
