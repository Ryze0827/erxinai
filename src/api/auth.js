import { apiRequest, buildApiUrl } from "./client";

export const authApi = {
  getPublicSettings: () => apiRequest("/settings/public", { skipAuth: true }),
  getCurrentUser: () => apiRequest("/auth/me"),
  prepareOAuthBind: () => apiRequest("/auth/oauth/bind-token", { method: "POST" }),
  logout: (refreshToken) => apiRequest("/auth/logout", {
    method: "POST",
    body: { refresh_token: refreshToken },
    skipRefresh: true,
  }),
  login: (body) => apiRequest("/auth/login", { method: "POST", body, skipRefresh: true }),
  login2FA: (body) => apiRequest("/auth/login/2fa", { method: "POST", body, skipRefresh: true }),
  register: (body) => apiRequest("/auth/register", { method: "POST", body, skipRefresh: true }),
  sendVerifyCode: (body) => apiRequest("/auth/send-verify-code", { method: "POST", body, skipAuth: true }),
  validatePromoCode: (code) => apiRequest("/auth/validate-promo-code", { method: "POST", body: { code }, skipAuth: true }),
  validateInvitationCode: (code) => apiRequest("/auth/validate-invitation-code", { method: "POST", body: { code }, skipAuth: true }),
  forgotPassword: (body) => apiRequest("/auth/forgot-password", { method: "POST", body, skipAuth: true }),
  resetPassword: (body) => apiRequest("/auth/reset-password", { method: "POST", body, skipAuth: true }),
  exchangePendingOAuth: (body = {}) => apiRequest("/auth/oauth/pending/exchange", { method: "POST", body, skipAuth: true }),
  sendPendingVerifyCode: (body) => apiRequest("/auth/oauth/pending/send-verify-code", { method: "POST", body, skipAuth: true }),
  createPendingAccount: (body) => apiRequest("/auth/oauth/pending/create-account", { method: "POST", body, skipAuth: true }),
  bindPendingLogin: (body) => apiRequest("/auth/oauth/pending/bind-login", { method: "POST", body, skipAuth: true }),
  completeOAuthRegistration: (provider, body) => apiRequest(`/auth/oauth/${provider}/complete-registration`, { method: "POST", body, skipAuth: true }),
};

export function getOAuthStartUrl(provider, params = {}) {
  const query = new URLSearchParams({ redirect: "/" });
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return `${buildApiUrl(`/auth/oauth/${provider}/start`)}?${query.toString()}`;
}

export function getOAuthCallbackUrl(provider, search) {
  return `${buildApiUrl(`/auth/oauth/${provider}/callback`)}${search}`;
}

export function getOAuthBindingUrl(provider, { redirect = "/profile", mode } = {}) {
  const query = new URLSearchParams({ redirect, intent: "bind_current_user" });
  if (mode) query.set("mode", mode);
  return `${buildApiUrl(`/auth/oauth/${provider}/bind/start`)}?${query.toString()}`;
}
