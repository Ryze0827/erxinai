const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AFFILIATE_KEY = "affiliate_referral_code";

const errorMessages = {
  INVALID_CREDENTIALS: ["auth.error.invalidCredentials", "The email or password is incorrect."],
  USER_NOT_ACTIVE: ["auth.error.userInactive", "This account is not active."],
  BACKEND_MODE_ADMIN_ONLY: ["auth.error.adminOnly", "Only administrators can sign in while backend mode is active."],
  EMAIL_EXISTS: ["auth.error.emailExists", "An account already exists for this email address."],
  EMAIL_RESERVED: ["auth.error.emailReserved", "This email address cannot be used for registration."],
  EMAIL_VERIFY_REQUIRED: ["auth.error.emailVerificationRequired", "Email verification is required."],
  EMAIL_SUFFIX_NOT_ALLOWED: ["auth.error.emailSuffixNotAllowed", "This email domain is not allowed for registration."],
  REGISTRATION_DISABLED: ["auth.error.registrationDisabled", "Registration is currently closed."],
  INVITATION_CODE_REQUIRED: ["auth.error.invitationCodeRequired", "An invitation code is required."],
  INVITATION_CODE_INVALID: ["auth.error.invitationCodeInvalid", "The invitation code is invalid or has already been used."],
  TURNSTILE_VERIFICATION_FAILED: ["auth.error.securityFailed", "Security verification failed. Please try again."],
  TURNSTILE_NOT_CONFIGURED: ["auth.error.securityUnavailable", "Security verification is temporarily unavailable."],
  SERVICE_UNAVAILABLE: ["auth.error.serviceUnavailable", "The authentication service is temporarily unavailable."],
  TOKEN_EXPIRED: ["auth.error.tokenExpired", "This link or session has expired."],
  TIMEOUT: ["auth.error.timeout", "Request timed out. Please try again."],
};

export function isEmail(value) {
  return emailPattern.test(value.trim());
}

function translated(t, key, fallback) {
  return typeof t === "function" ? t(key) : fallback;
}

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.", t) {
  if (error?.status === 429) return translated(t, "auth.error.tooManyAttempts", "Too many attempts. Please wait a moment and try again.");
  const known = errorMessages[error?.reason];
  if (known) return translated(t, known[0], known[1]);
  if (error?.status >= 500) return translated(t, "auth.error.serviceUnavailable", "The authentication service is temporarily unavailable.");
  if (error?.status === 0) return translated(t, "auth.error.network", "Network error. Please check your connection.");
  return error?.message || fallback;
}

export function safeAuthRedirect(value, fallback = "/admin/dashboard") {
  const redirect = String(value || "").trim();
  if (!redirect || redirect.length > 2048 || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\") || /[\u0000-\u001f\u007f]/.test(redirect)) return fallback;
  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getAffiliateCode(searchParams) {
  const value = String(searchParams.get("aff") || searchParams.get("aff_code") || localStorage.getItem(AFFILIATE_KEY) || "").trim().slice(0, 128);
  if (value) localStorage.setItem(AFFILIATE_KEY, value);
  return value;
}

export function clearAffiliateCode() {
  localStorage.removeItem(AFFILIATE_KEY);
}

export function readOAuthFragment() {
  const fragment = window.location.hash.replace(/^#/, "");
  const values = Object.fromEntries(new URLSearchParams(fragment));
  if (fragment) window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
  return values;
}

export function booleanParam(value) {
  return value === true || value === "true" || value === "1";
}
