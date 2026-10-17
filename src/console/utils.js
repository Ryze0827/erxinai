import { translate, formatNumberFor } from "./i18n";

export function dateInput(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function asItems(value) {
  if (Array.isArray(value)) return value;
  return value?.items || value?.data || value?.records || [];
}

export function formatCompact(value, locale = "en") {
  return formatNumberFor(locale, value, { notation: "compact", maximumFractionDigits: 1 });
}

// Token totals keep one notation ("1.23M") in every locale so charts and
// tables line up; grouping and decimals match in en-US and zh-CN anyway.
export function formatTokenMillions(value) {
  const millions = (Number(value) || 0) / 1_000_000;
  if (!millions) return "0M";
  const magnitude = Math.abs(millions);
  const maximumFractionDigits = magnitude >= 100 ? 1 : magnitude >= 1 ? 2 : magnitude >= 0.01 ? 3 : magnitude >= 0.001 ? 4 : 6;
  return `${formatNumberFor("en", millions, { maximumFractionDigits, minimumFractionDigits: Math.min(1, maximumFractionDigits) })}M`;
}

export function formatTokenMillionsFixed(value, fractionDigits = 2) {
  const millions = (Number(value) || 0) / 1_000_000;
  return `${formatNumberFor("en", millions, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}M`;
}

export function formatDuration(value) {
  const milliseconds = Number(value) || 0;
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 2 : 1)} s`;
}

export function statusLabel(status, locale = "en") {
  const normalized = String(status || "unknown").toLowerCase();
  const key = `status.${normalized}`;
  const label = translate(locale, key);
  return label === key ? normalized.replaceAll("_", " ") : label;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeExternalUrl(value) {
  try {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const url = new URL(raw, window.location.origin);
    if (url.protocol === "https:") return url.toString();
    if (url.protocol !== "http:") return "";
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const localDevelopment = localHosts.has(window.location.hostname);
    return url.origin === window.location.origin || (localDevelopment && localHosts.has(url.hostname)) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function safeImageUrl(value) {
  const raw = String(value || "").trim();
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=\s]+$/i.test(raw)) return raw;
  return safeExternalUrl(raw);
}

export function maskKey(value) {
  const key = String(value || "");
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}••••${key.slice(-4)}`;
}

export function makeIdempotencyKey() {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
