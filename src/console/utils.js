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
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

export function formatDuration(value) {
  const milliseconds = Number(value) || 0;
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 2 : 1)} s`;
}

export function statusLabel(status, locale = "en") {
  const normalized = String(status || "unknown").toLowerCase();
  const labels = {
    en: { active: "Active", inactive: "Inactive", pending: "Pending", created: "Created", waiting: "Waiting", paid: "Paid", recharging: "Crediting", completed: "Completed", failed: "Failed", cancelled: "Cancelled", suspended: "Suspended", quota_exhausted: "Quota exhausted", indexing: "Indexing", processing_results: "Processing results", settling: "Settling", output_deleted: "Output deleted", refund_requested: "Refund requested", refunding: "Refunding", refund_pending: "Refund pending", partially_refunded: "Partially refunded", refunded: "Refunded", refund_failed: "Refund failed", running: "Running", queued: "Queued", processing: "Processing", operational: "Operational", degraded: "Degraded", expired: "Expired" },
    zh: { active: "启用", inactive: "停用", pending: "待处理", created: "已创建", waiting: "等待中", paid: "已支付", recharging: "入账中", completed: "已完成", failed: "失败", cancelled: "已取消", suspended: "已暂停", quota_exhausted: "额度已用尽", indexing: "正在建立索引", processing_results: "正在处理结果", settling: "正在结算", output_deleted: "结果已删除", refund_requested: "已申请退款", refunding: "退款中", refund_pending: "等待退款", partially_refunded: "部分退款", refunded: "已退款", refund_failed: "退款失败", running: "运行中", queued: "排队中", processing: "处理中", operational: "正常", degraded: "降级", expired: "已过期" },
  };
  return labels[locale]?.[normalized] || normalized.replaceAll("_", " ");
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
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
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
