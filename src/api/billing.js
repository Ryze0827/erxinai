import { apiRequest } from "./client";

export const subscriptionsApi = {
  list: () => apiRequest("/subscriptions"),
  active: () => apiRequest("/subscriptions/active"),
  progress: () => apiRequest("/subscriptions/progress"),
  summary: () => apiRequest("/subscriptions/summary"),
};

export const redeemApi = {
  redeem: (code) => apiRequest("/redeem", { method: "POST", body: { code } }),
  history: () => apiRequest("/redeem/history"),
};

export const announcementsApi = {
  list: (unreadOnly = false) => apiRequest("/announcements", { query: unreadOnly ? { unread_only: 1 } : {} }),
  markRead: (id) => apiRequest(`/announcements/${id}/read`, { method: "POST", body: {} }),
};

export const paymentApi = {
  config: () => apiRequest("/payment/config"),
  checkout: () => apiRequest("/payment/checkout-info"),
  plans: () => apiRequest("/payment/plans"),
  limits: () => apiRequest("/payment/limits"),
  createOrder: (body) => apiRequest("/payment/orders", { method: "POST", body }),
  orders: (query = {}) => apiRequest("/payment/orders/my", { query }),
  order: (id) => apiRequest(`/payment/orders/${id}`),
  cancel: (id) => apiRequest(`/payment/orders/${id}/cancel`, { method: "POST", body: {} }),
  verify: (outTradeNo) => apiRequest("/payment/orders/verify", { method: "POST", body: { out_trade_no: outTradeNo } }),
  verifyPublic: (outTradeNo) => apiRequest("/payment/public/orders/verify", {
    method: "POST",
    body: { out_trade_no: outTradeNo },
    skipAuth: true,
    skipRefresh: true,
  }),
  resolvePublic: (resumeToken) => apiRequest("/payment/public/orders/resolve", {
    method: "POST",
    body: { resume_token: resumeToken },
    skipAuth: true,
    skipRefresh: true,
  }),
  refund: (id, reason) => apiRequest(`/payment/orders/${id}/refund-request`, { method: "POST", body: { reason } }),
  refundableProviders: () => apiRequest("/payment/orders/refund-eligible-providers"),
};
