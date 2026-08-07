const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AFFILIATE_KEY = "affiliate_referral_code";

const errorMessages = {
  INVALID_CREDENTIALS: "The email or password is incorrect.",
  USER_NOT_ACTIVE: "This account is not active.",
  BACKEND_MODE_ADMIN_ONLY: "Only administrators can sign in while backend mode is active.",
  EMAIL_EXISTS: "An account already exists for this email address.",
  EMAIL_RESERVED: "This email address cannot be used for registration.",
  EMAIL_VERIFY_REQUIRED: "Email verification is required.",
  EMAIL_SUFFIX_NOT_ALLOWED: "This email domain is not allowed for registration.",
  REGISTRATION_DISABLED: "Registration is currently closed.",
  INVITATION_CODE_REQUIRED: "An invitation code is required.",
  INVITATION_CODE_INVALID: "The invitation code is invalid or has already been used.",
  TURNSTILE_VERIFICATION_FAILED: "Security verification failed. Please try again.",
  TURNSTILE_NOT_CONFIGURED: "Security verification is temporarily unavailable.",
  SERVICE_UNAVAILABLE: "The authentication service is temporarily unavailable.",
  TOKEN_EXPIRED: "This link or session has expired.",
};

export function isEmail(value) {
  return emailPattern.test(value.trim());
}

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.status === 429) return "Too many attempts. Please wait a moment and try again.";
  return errorMessages[error?.reason] || error?.message || fallback;
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
