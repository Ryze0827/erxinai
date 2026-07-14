export const PAYMENT_RECOVERY_KEY = "payment.recovery.current";

const aliases = { alipay_direct: "alipay", wxpay_direct: "wxpay" };

export function visibleMethods(methods = {}) {
  return Object.entries(methods).reduce((result, [key, value]) => {
    const normalized = aliases[key] || key;
    if (!result[normalized] || key === normalized) result[normalized] = value;
    return result;
  }, {});
}

export function createRecovery(result, context = {}) {
  return {
    orderId: Number(result.order_id || 0), amount: Number(result.amount || context.amount || 0),
    qrCode: result.qr_code || "", expiresAt: result.expires_at || "", paymentType: context.paymentType || result.payment_type || "",
    payUrl: result.pay_url || "", outTradeNo: result.out_trade_no || "", clientSecret: result.client_secret || "",
    intentId: result.intent_id || "", currency: result.currency || context.currency || "CNY", countryCode: result.country_code || "CN",
    paymentEnv: result.payment_env || "", payAmount: Number(result.pay_amount || 0), orderType: context.orderType || "balance",
    paymentMode: result.payment_mode || "", resumeToken: result.resume_token || "", stripePublishableKey: context.stripePublishableKey || "",
    createdAt: Date.now(),
  };
}

export function saveRecovery(snapshot) {
  localStorage.setItem(PAYMENT_RECOVERY_KEY, JSON.stringify(snapshot));
}

export function clearRecovery() {
  localStorage.removeItem(PAYMENT_RECOVERY_KEY);
}

export function readRecovery(resumeToken = "") {
  try {
    const value = JSON.parse(localStorage.getItem(PAYMENT_RECOVERY_KEY));
    if (!value || typeof value.orderId !== "number" || (resumeToken && value.resumeToken !== resumeToken)) return null;
    if (value.expiresAt && Date.parse(value.expiresAt) <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

export function paymentQuery(snapshot, extra = {}) {
  const query = new URLSearchParams({ order_id: String(snapshot.orderId), ...extra });
  if (snapshot.outTradeNo) query.set("out_trade_no", snapshot.outTradeNo);
  if (snapshot.resumeToken) query.set("resume_token", snapshot.resumeToken);
  return query.toString();
}

export function terminalOrder(status) {
  const normalized = String(status || "").toUpperCase();
  return Boolean(normalized) && !["PENDING", "CREATED", "WAITING", "PROCESSING"].includes(normalized);
}

export function successfulOrder(status) {
  return ["COMPLETED", "PAID", "RECHARGING"].includes(String(status || "").toUpperCase());
}
