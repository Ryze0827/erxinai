import { apiRequest } from "./client";

export const userApi = {
  getProfile: () => apiRequest("/user/profile"),
  update: (body) => apiRequest("/user", { method: "PUT", body }),
  changePassword: (oldPassword, newPassword) => apiRequest("/user/password", {
    method: "PUT",
    body: { old_password: oldPassword, new_password: newPassword },
  }),
  getAffiliate: () => apiRequest("/user/aff"),
  transferAffiliate: () => apiRequest("/user/aff/transfer", { method: "POST", body: {} }),
  getPlatformQuotas: () => apiRequest("/user/platform-quotas"),
  sendNotifyEmailCode: (email) => apiRequest("/user/notify-email/send-code", { method: "POST", body: { email } }),
  verifyNotifyEmail: (email, code) => apiRequest("/user/notify-email/verify", { method: "POST", body: { email, code } }),
  removeNotifyEmail: (email) => apiRequest("/user/notify-email", { method: "DELETE", body: { email } }),
  toggleNotifyEmail: (email, disabled) => apiRequest("/user/notify-email/toggle", { method: "PUT", body: { email, disabled } }),
  sendEmailBindingCode: (email) => apiRequest("/user/account-bindings/email/send-code", { method: "POST", body: { email } }),
  bindEmail: (body) => apiRequest("/user/account-bindings/email", { method: "POST", body }),
  unbindIdentity: (provider) => apiRequest(`/user/account-bindings/${provider}`, { method: "DELETE" }),
};

export const totpApi = {
  getStatus: () => apiRequest("/user/totp/status"),
  getVerificationMethod: () => apiRequest("/user/totp/verification-method"),
  sendCode: () => apiRequest("/user/totp/send-code", { method: "POST", body: {} }),
  setup: (body) => apiRequest("/user/totp/setup", { method: "POST", body }),
  enable: (body) => apiRequest("/user/totp/enable", { method: "POST", body }),
  disable: (body) => apiRequest("/user/totp/disable", { method: "POST", body }),
};
