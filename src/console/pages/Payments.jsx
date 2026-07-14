import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { paymentApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Modal, Page, Pagination, Panel, SelectInput, Spinner, StatusBadge, TextArea, TextInput } from "../UI";
import { clearRecovery, createRecovery, paymentQuery, readRecovery, saveRecovery, successfulOrder, terminalOrder, visibleMethods } from "../paymentFlow";
import { safeExternalUrl, safeImageUrl, statusLabel } from "../utils";

const WECHAT_PENDING_KEY = "payment.wechat.pending";

function paymentLabel(type, locale = "en") {
  const normalized = type === "alipay_direct" ? "alipay" : type === "wxpay_direct" ? "wxpay" : type;
  const labels = locale === "zh"
    ? { alipay: "支付宝", wxpay: "微信支付", stripe: "Stripe", easypay: "易支付", airwallex: "Airwallex" }
    : { alipay: "Alipay", wxpay: "WeChat Pay", stripe: "Stripe", easypay: "EasyPay", airwallex: "Airwallex" };
  return labels[normalized] || type;
}

function PaymentMark({ type, method }) {
  const normalized = type === "alipay_direct" ? "alipay" : type === "wxpay_direct" ? "wxpay" : type;
  const customIcon = safeImageUrl(method?.icon_url || method?.icon);
  if (customIcon) return <span className="console-payment-mark"><img src={customIcon} alt="" /></span>;
  if (normalized === "alipay") return <span className="console-payment-mark"><svg viewBox="0 0 1024 1024" aria-hidden="true"><path fill="#02A9F1" d="M902 653 651 568s19-29 40-85c20-57 24-88 24-88l-163-1v-56l197-1v-39H552v-89h-96v89H272v39l184-1v59H308v31h303s-3 25-14 57c-12 31-24 59-24 59s-142-50-217-50-166 30-175 118c-9 87 42 134 114 152 73 17 139 0 197-29 58-28 115-93 115-93l293 142c-12 69-72 120-142 120H266c-80 0-144-65-144-144V266c0-80 64-144 144-144h492c80 0 144 64 144 144v387ZM536 604s-91 115-199 115c-107 0-130-55-130-94 0-40 22-82 114-88 91-6 215 67 215 67Z" /></svg></span>;
  if (normalized === "wxpay") return <span className="console-payment-mark"><svg viewBox="0 0 1024 1024" aria-hidden="true"><path fill="#09BB07" d="M396 604c-4 2-8 3-13 3-11 0-20-6-25-15l-2-4-78-168c-1-2-1-4-1-6 0-8 6-13 14-13 3 0 6 1 9 3l92 64c7 4 15 7 24 7 5 0 10-1 15-3l431-190c-77-90-205-148-349-148-236 0-428 157-428 351 0 106 58 202 148 266 7 5 12 14 12 22 0 3-1 6-2 9l-19 71c-1 3-2 7-2 11 0 8 6 14 14 14 3 0 6-1 8-3l93-54c7-4 15-7 23-7 4 0 9 1 13 2 43 13 91 20 139 20 236 0 427-158 427-352 0-58-18-114-48-163L399 602l-3 2Z" /></svg></span>;
  if (normalized === "stripe") return <span className="console-payment-mark"><svg viewBox="0 0 1024 1024" aria-hidden="true"><circle cx="512" cy="512" r="448" fill="#676BE5" /><path fill="#fff" d="M472 417c0-21 17-29 45-29 44 0 89 13 133 35V297c-42-17-87-25-133-25-109 0-181 57-181 152 0 148 204 124 204 188 0 25-22 33-52 33-49 0-98-14-146-43v121c47 20 96 30 146 30 112 0 188-48 188-144 0-160-204-132-204-192Z" /></svg></span>;
  if (normalized === "airwallex") return <span className="console-payment-mark"><svg viewBox="0 0 48 33" aria-hidden="true"><defs><linearGradient id="console-airwallex" x1="0" y1="2" x2="48" y2="30"><stop stopColor="#FF4F42" /><stop offset="1" stopColor="#FF8E3C" /></linearGradient></defs><path fill="url(#console-airwallex)" d="M46.6 12.7a6 6 0 0 1 1.4 6.4l-3.2 8.6a6.9 6.9 0 0 1-5 4.5 6.6 6.6 0 0 1-6.4-2.3L14.4 7.2a.4.4 0 0 0-.7.1L7.5 24a.4.4 0 0 0 .6.5l7.5-3.1a3.3 3.3 0 0 1 4.5 2.1 3.5 3.5 0 0 1-2 4.2l-9.9 4A5.9 5.9 0 0 1 .3 24.2L7.6 4.5A6.8 6.8 0 0 1 19.3 2.4l10.9 13 10-4.1a5.8 5.8 0 0 1 6.4 1.4Zm-5.8 6.5a.4.4 0 0 0-.5-.5l-5.6 2.2 3.4 4a.4.4 0 0 0 .7-.1Z" /></svg></span>;
  return <span className="console-payment-mark console-payment-mark--generic"><Icon name="card" size={22} /></span>;
}

function currency(value, code, locale) {
  try { return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency: code || "CNY", maximumFractionDigits: 2 }).format(Number(value) || 0); }
  catch { return `${code || ""} ${(Number(value) || 0).toFixed(2)}`; }
}

function methodFits(method, amount) {
  if (!method || method.available === false) return false;
  if (Number(method.single_min) > 0 && amount < Number(method.single_min)) return false;
  return !(Number(method.single_max) > 0 && amount > Number(method.single_max));
}

function PaymentMethods({ methods, selected, setSelected, amount, amountForMethod, locale }) {
  return <div className="console-payment-methods">{Object.entries(methods).map(([type, method]) => <button type="button" key={type} className={selected === type ? "is-selected" : ""} disabled={!methodFits(method, amountForMethod ? amountForMethod(method) : amount)} onClick={() => setSelected(type)}><PaymentMark type={type} method={method} /><div><strong>{method.display_name || paymentLabel(type, locale)}</strong><small>{Number(method.fee_rate || 0) > 0 ? `${method.fee_rate}% ${locale === "zh" ? "手续费" : "fee"}` : (locale === "zh" ? "无额外手续费" : "No extra fee")}</small></div>{selected === type && <Icon name="check" size={17} />}</button>)}</div>;
}

function makeOrderBody({ amount, paymentType, orderType, planId, resumeToken, openid, forceQr }) {
  const mobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const wechat = /MicroMessenger/i.test(navigator.userAgent);
  const body = {
    amount, payment_type: paymentType, order_type: orderType, return_url: `${window.location.origin}/payment/result`,
    is_mobile: forceQr && paymentType === "alipay" ? false : mobile,
    payment_source: paymentType === "wxpay" && wechat ? "wechat_in_app_resume" : "hosted_redirect",
  };
  if (planId) body.plan_id = planId;
  if (resumeToken) body.wechat_resume_token = resumeToken;
  if (openid) body.openid = openid;
  return body;
}

async function invokeWechat(payload) {
  const bridge = await waitForWechatBridge();
  return new Promise((resolve) => bridge.invoke("getBrandWCPayRequest", payload, resolve));
}

function waitForWechatBridge(timeout = 4000) {
  if (window.WeixinJSBridge) return Promise.resolve(window.WeixinJSBridge);
  return new Promise((resolve, reject) => {
    const onReady = () => { window.clearTimeout(timer); resolve(window.WeixinJSBridge); };
    const timer = window.setTimeout(() => {
      document.removeEventListener("WeixinJSBridgeReady", onReady);
      reject(new Error("WeChat JSAPI is unavailable."));
    }, timeout);
    document.addEventListener("WeixinJSBridgeReady", onReady, { once: true });
  });
}

function subscriptionCharge(price, checkout, method) {
  const rate = Number(checkout?.subscription_usd_to_cny_rate || 0);
  const currencyCode = String(method?.currency || "CNY").toUpperCase();
  return roundPaymentAmount(rate > 0 && currencyCode === "CNY" ? Number(price || 0) * rate : Number(price || 0), currencyCode);
}

function withWechatResumeContext(authorizeUrl, context) {
  try {
    const target = new URL(authorizeUrl, window.location.origin);
    const redirect = new URL(target.searchParams.get("redirect") || "/purchase", window.location.origin);
    redirect.searchParams.set("payment_type", context.paymentType || "wxpay");
    redirect.searchParams.set("order_type", context.orderType || "balance");
    if (context.planId) redirect.searchParams.set("plan_id", String(context.planId));
    if (Number(context.amount) > 0) redirect.searchParams.set("amount", String(context.amount));
    target.searchParams.set("redirect", `${redirect.pathname}${redirect.search}`);
    return target.toString();
  } catch {
    return authorizeUrl;
  }
}

function paymentFractionDigits(currencyCode) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode || "CNY" }).resolvedOptions().maximumFractionDigits ?? 2; }
  catch { return 2; }
}

function roundPaymentAmount(value, currencyCode) {
  const factor = 10 ** paymentFractionDigits(currencyCode);
  return Math.round(Number(value || 0) * factor) / factor;
}

function paymentFee(amount, rate, currencyCode) {
  const factor = 10 ** paymentFractionDigits(currencyCode);
  return Math.ceil((Number(amount || 0) * Number(rate || 0) / 100) * factor) / factor;
}

function paymentTotal(amount, rate, currencyCode) {
  return roundPaymentAmount(Number(amount || 0) + paymentFee(amount, rate, currencyCode), currencyCode);
}

function launchPayment(result, context, navigate) {
  const snapshot = createRecovery(result, context);
  saveRecovery(snapshot);
  const common = paymentQuery(snapshot);
  if (result.result_type === "oauth_required" && result.oauth?.authorize_url) {
    sessionStorage.setItem(WECHAT_PENDING_KEY, JSON.stringify({ amount: context.amount, paymentType: context.paymentType, orderType: context.orderType, planId: context.planId || 0 }));
    window.location.assign(withWechatResumeContext(result.oauth.authorize_url, context));
    return snapshot;
  }
  if (result.result_type === "jsapi_ready" && (result.jsapi || result.jsapi_payload)) return { ...snapshot, jsapi: result.jsapi || result.jsapi_payload };
  if (context.paymentType === "airwallex" && snapshot.clientSecret && snapshot.intentId) navigate(`/payment/airwallex?${common}`);
  else if (snapshot.clientSecret) {
    const method = context.paymentType === "stripe" ? "" : context.paymentType === "wxpay" ? "wechat_pay" : "alipay";
    navigate(`/payment/stripe?${common}&client_secret=${encodeURIComponent(snapshot.clientSecret)}${method ? `&method=${method}` : ""}`);
  } else if (snapshot.qrCode || snapshot.payUrl) navigate(`/payment/qrcode?${common}`);
  else throw new Error("The payment provider did not return a payment target.");
  return snapshot;
}

function PlanCard({ plan, selected, onSelect, locale }) {
  return <button className={`console-plan-card ${selected ? "is-selected" : ""}`} onClick={() => onSelect(plan)}><div><span>{plan.group_platform || "AI"}</span>{selected && <Icon name="check" size={17} />}</div><h3>{plan.name}</h3><p>{plan.description}</p><strong>{currency(plan.price, "USD", locale)}</strong><small>/ {plan.validity_days} {locale === "zh" ? "天" : "days"}</small><div className="console-chip-list">{plan.daily_limit_usd != null && <span className="console-chip">${plan.daily_limit_usd}/day</span>}{plan.weekly_limit_usd != null && <span className="console-chip">${plan.weekly_limit_usd}/week</span>}{plan.monthly_limit_usd != null && <span className="console-chip">${plan.monthly_limit_usd}/month</span>}{(plan.features || []).slice(0, 3).map((feature) => <span className="console-chip" key={feature}>{feature}</span>)}</div></button>;
}

export function PurchasePage() {
  const { t, locale, formatCurrency } = useLocale();
  const { user, notify } = useConsole();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [checkout, setCheckout] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", busy: false });
  const [tab, setTab] = useState("balance");
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState("");
  const [plan, setPlan] = useState(null);
  const resumeHandled = useRef(false);
  const mountedRef = useRef(true);
  const initialQueryRef = useRef({ tab: params.get("tab") || "", group: params.get("group") || "" });
  const methods = useMemo(() => visibleMethods(checkout?.methods), [checkout]);
  const selectedLimit = methods[method];
  const orderAmount = tab === "subscription" ? Number(plan?.price || 0) : Number(amount || 0);
  const chargeAmount = tab === "subscription" ? subscriptionCharge(orderAmount, checkout, selectedLimit) : orderAmount;
  const feeRate = Number(checkout?.recharge_fee_rate || 0);
  const selectedCurrency = selectedLimit?.currency || "CNY";
  const fee = paymentFee(chargeAmount, feeRate, selectedCurrency);
  const payable = paymentTotal(chargeAmount, feeRate, selectedCurrency);
  const subscriptionTotalForMethod = (candidate) => paymentTotal(subscriptionCharge(orderAmount, checkout, candidate), feeRate, candidate?.currency || "CNY");

  const load = useCallback(async () => {
    setState({ loading: true, error: "", busy: false });
    try {
      const data = await paymentApi.checkout();
      if (!mountedRef.current) return;
      setCheckout(data);
      const available = Object.entries(visibleMethods(data.methods)).find(([, value]) => value.available !== false)?.[0] || "";
      setMethod((current) => current || available);
      const requestedSubscription = initialQueryRef.current.tab === "subscription" || data.balance_disabled;
      setTab(requestedSubscription ? "subscription" : "balance");
      if (initialQueryRef.current.group) {
        const matchingPlan = (data.plans || []).find((item) => String(item.group_id) === initialQueryRef.current.group);
        if (matchingPlan) setPlan(matchingPlan);
      }
      setState({ loading: false, error: "", busy: false });
    } catch (error) { if (mountedRef.current) setState({ loading: false, error: error.message, busy: false }); }
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const create = useCallback(async (options = {}) => {
    const pending = options.pending;
    const activeAmount = pending?.amount ?? orderAmount;
    const activeType = pending?.orderType ?? tab;
    const activeMethod = pending?.paymentType ?? method;
    const activePlanId = pending?.planId || plan?.id;
    if ((!activeAmount && !options.resumeToken) || !activeMethod) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      const body = makeOrderBody({ amount: activeAmount, paymentType: activeMethod, orderType: activeType, planId: activePlanId, resumeToken: options.resumeToken, openid: options.openid, forceQr: checkout?.alipay_force_qrcode });
      const result = await paymentApi.createOrder(body);
      const launched = launchPayment(result, { amount: activeAmount, paymentType: activeMethod, orderType: activeType, planId: activePlanId, currency: methods[activeMethod]?.currency, stripePublishableKey: checkout?.stripe_publishable_key }, navigate);
      if (launched.jsapi) {
        const response = await invokeWechat(launched.jsapi);
        const message = String(response?.err_msg || "").toLowerCase();
        if (message.includes("cancel")) throw new Error(locale === "zh" ? "支付已取消。" : "Payment was cancelled.");
        navigate(`/payment/result?${paymentQuery(launched)}`);
      }
    } catch (error) { notify("error", error.message); } finally { if (mountedRef.current) setState((current) => ({ ...current, busy: false })); }
  }, [checkout, locale, method, methods, navigate, notify, orderAmount, plan?.id, tab]);

  useEffect(() => {
    if (!checkout || resumeHandled.current || params.get("wechat_resume") !== "1") return;
    resumeHandled.current = true;
    try {
      const stored = JSON.parse(sessionStorage.getItem(WECHAT_PENDING_KEY)) || {};
      const planId = Number(stored.planId || params.get("plan_id")) || 0;
      const orderType = stored.orderType || params.get("order_type") || (planId ? "subscription" : "balance");
      const fallbackAmount = orderType === "subscription" ? Number((checkout.plans || []).find((item) => item.id === planId)?.price || 0) : Number(amount || 0);
      const pending = {
        amount: params.get("wechat_resume_token") ? 0 : Number(stored.amount ?? params.get("amount") ?? fallbackAmount),
        paymentType: stored.paymentType || params.get("payment_type") || "wxpay",
        orderType,
        planId,
      };
      create({ pending, resumeToken: params.get("wechat_resume_token") || "", openid: params.get("openid") || "" });
    } catch { notify("error", locale === "zh" ? "无法恢复微信支付。" : "Could not resume WeChat payment."); }
    sessionStorage.removeItem(WECHAT_PENDING_KEY);
    const nextParams = new URLSearchParams(params);
    ["wechat_resume", "wechat_resume_token", "openid", "state", "scope", "payment_type", "amount", "order_type", "plan_id"].forEach((key) => nextParams.delete(key));
    setParams(nextParams, { replace: true });
  }, [amount, checkout, create, locale, notify, params, setParams]);

  if (state.loading) return <Page title={t("purchase.title")}><Panel><Spinner /></Panel></Page>;
  if (state.error || !checkout) return <Page title={t("purchase.title")}><Panel><ErrorState message={state.error} onRetry={load} /></Panel></Page>;
  const methodAvailable = methodFits(selectedLimit, tab === "subscription" ? payable : orderAmount);
  return <Page title={t("purchase.title")} subtitle={t("purchase.subtitle")}>
    {!checkout.balance_disabled && <div className="console-tabs"><button className={tab === "balance" ? "is-active" : ""} onClick={() => { setTab("balance"); setPlan(null); }}>{t("purchase.balance")}</button><button className={tab === "subscription" ? "is-active" : ""} onClick={() => setTab("subscription")}>{t("purchase.plan")}</button></div>}
    {tab === "balance" ? <div className="console-grid console-grid--sidebar"><Panel title={t("purchase.balance")}><div className="console-panel-body console-payment-form"><div className="console-payment-account"><span>{locale === "zh" ? "充值账户" : "Recharge account"}</span><strong>{user?.username || user?.email}</strong><small>{t("common.balance")}: {formatCurrency(user?.balance)}</small></div><Field label={t("purchase.amount")}><TextInput type="number" min={checkout.global_min || 0} max={checkout.global_max || undefined} value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><div className="console-amounts">{[10, 20, 50, 100, 200, 500, 1000].map((value) => <button type="button" className={Number(amount) === value ? "is-selected" : ""} key={value} onClick={() => setAmount(value)}>{value}</button>)}</div><PaymentMethods methods={methods} selected={method} setSelected={setMethod} amount={orderAmount} locale={locale} /></div></Panel><Panel title={locale === "zh" ? "订单摘要" : "Order summary"}><div className="console-panel-body console-order-summary"><div><span>{t("purchase.amount")}</span><strong>{currency(chargeAmount, selectedLimit?.currency, locale)}</strong></div>{feeRate > 0 && <div><span>{t("purchase.fee")} ({feeRate}%)</span><strong>{currency(fee, selectedLimit?.currency, locale)}</strong></div>}<div className="is-total"><span>{t("purchase.total")}</span><strong>{currency(payable, selectedLimit?.currency, locale)}</strong></div>{Number(checkout.balance_recharge_multiplier || 1) !== 1 && <p>{locale === "zh" ? `到账余额：${formatCurrency(orderAmount * Number(checkout.balance_recharge_multiplier || 1))}` : `Balance credited: ${formatCurrency(orderAmount * Number(checkout.balance_recharge_multiplier || 1))}`}</p>}<Button variant="primary" icon="card" onClick={() => create()} disabled={state.busy || !methodAvailable || orderAmount <= 0}>{state.busy ? t("common.loading") : t("purchase.pay")}</Button></div></Panel></div> : <><div className="console-plan-grid">{checkout.plans.map((item) => <PlanCard key={item.id} plan={item} selected={plan?.id === item.id} onSelect={setPlan} locale={locale} />)}</div>{!checkout.plans.length && <Panel><EmptyState icon="gift" /></Panel>}{plan && <Panel title={locale === "zh" ? "确认套餐" : "Confirm your plan"}><div className="console-panel-body console-subscribe-checkout"><div><strong>{plan.name}</strong><span>{currency(chargeAmount, selectedLimit?.currency, locale)}</span></div><PaymentMethods methods={methods} selected={method} setSelected={setMethod} amount={payable} amountForMethod={subscriptionTotalForMethod} locale={locale} /><Button variant="primary" onClick={() => create()} disabled={state.busy || !methodAvailable}>{state.busy ? t("common.loading") : `${t("purchase.pay")} · ${currency(payable, selectedLimit?.currency, locale)}`}</Button></div></Panel>}</>}
    {(checkout.help_text || checkout.help_image_url) && <Panel><div className="console-panel-body console-payment-help">{safeExternalUrl(checkout.help_image_url) && <img src={safeExternalUrl(checkout.help_image_url)} alt="" />}<p>{checkout.help_text}</p></div></Panel>}
  </Page>;
}

export function OrdersPage() {
  const { t, locale, formatDate } = useLocale();
  const { notify } = useConsole();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [state, setState] = useState({ loading: true, error: "", items: [], total: 0, pages: 1, eligible: new Set(), busy: false });
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState("");
  const mountedRef = useRef(true);
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [orders, eligible] = await Promise.allSettled([paymentApi.orders({ page: paging.page, page_size: paging.pageSize, status: filter }), paymentApi.refundableProviders()]);
      if (orders.status === "rejected") throw orders.reason;
      if (mountedRef.current) setState((current) => ({ ...current, loading: false, items: orders.value.items || [], total: orders.value.total || 0, pages: orders.value.pages || 1, eligible: new Set(eligible.value?.provider_instance_ids || []) }));
    } catch (error) { if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [filter, paging]);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);
  const submitAction = async () => {
    setState((current) => ({ ...current, busy: true }));
    try { if (dialog.type === "cancel") await paymentApi.cancel(dialog.item.id); else await paymentApi.refund(dialog.item.id, reason.trim()); notify("success", t("common.success")); setDialog(null); setReason(""); load(); }
    catch (error) { notify("error", error.message); } finally { setState((current) => ({ ...current, busy: false })); }
  };
  const columns = [
    { key: "out_trade_no", label: t("orders.number"), render: (row) => <span className="console-mono">{row.out_trade_no}</span> },
    { key: "order_type", label: t("orders.type"), render: (row) => <span className="console-chip">{row.order_type}</span> },
    { key: "amount", label: t("orders.amount"), render: (row) => currency(row.pay_amount || row.amount, row.currency, locale), align: "right" },
    { key: "payment_type", label: t("orders.method"), render: (row) => paymentLabel(row.payment_type, locale) },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={String(row.status).toLowerCase()} label={statusLabel(String(row.status).toLowerCase(), locale)} /> },
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
    { key: "actions", label: t("common.actions"), align: "right", render: (row) => <div className="console-inline-actions">{String(row.status).toUpperCase() === "PENDING" && <Button variant="danger" onClick={() => setDialog({ type: "cancel", item: row })}>{t("orders.cancel")}</Button>}{String(row.status).toUpperCase() === "COMPLETED" && row.provider_instance_id && state.eligible.has(row.provider_instance_id) && <Button onClick={() => setDialog({ type: "refund", item: row })}>{t("orders.refund")}</Button>}</div> },
  ];
  return <Page title={t("orders.title")} subtitle={t("orders.subtitle")} actions={<Button variant="primary" icon="cart" onClick={() => navigate("/purchase")}>{t("purchase.title")}</Button>}><Panel><div className="console-toolbar"><Field label={t("common.status")}><SelectInput value={filter} onChange={(event) => { setFilter(event.target.value); setPaging((current) => ({ ...current, page: 1 })); }}><option value="">{t("common.all")}</option>{["PENDING", "PAID", "RECHARGING", "COMPLETED", "EXPIRED", "FAILED", "CANCELLED", "REFUND_REQUESTED", "REFUNDING", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "REFUND_FAILED"].map((status) => <option key={status}>{status}</option>)}</SelectInput></Field><Button icon="refresh" onClick={load}>{t("common.refresh")}</Button></div>{state.loading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : <><DataTable columns={columns} rows={state.items} empty={<EmptyState icon="order" />} /><Pagination page={paging.page} pageSize={paging.pageSize} total={state.total} pages={state.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>}</Panel><ConfirmDialog open={dialog?.type === "cancel"} title={t("orders.cancel")} description={locale === "zh" ? "确定取消这个待支付订单吗？" : "Cancel this pending order?"} busy={state.busy} onClose={() => setDialog(null)} onConfirm={submitAction} /><Modal open={dialog?.type === "refund"} title={t("orders.refund")} onClose={() => setDialog(null)} size="small" footer={<><Button onClick={() => setDialog(null)}>{t("common.cancel")}</Button><Button variant="primary" onClick={submitAction} disabled={!reason.trim() || state.busy}>{t("common.confirm")}</Button></>}><Field label={t("orders.reason")}><TextArea rows="4" value={reason} onChange={(event) => setReason(event.target.value)} /></Field></Modal></Page>;
}

function PaymentShell({ children }) {
  const { settings } = useConsole();
  const logo = safeImageUrl(settings?.site_logo) || "/assets/img/sentence-ai-icon.png";
  return <div className="console-public-shell"><div className="console-scene" /><Link className="console-public-brand" to="/"><img src={logo} alt="" /><strong>{settings?.site_name || "Sentence AI"}</strong></Link><main>{children}</main></div>;
}

function countdownText(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PaymentQRCodePage() {
  const { t, locale } = useLocale();
  const { notify } = useConsole();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const snapshot = readRecovery(params.get("resume_token") || "");
  const [qr, setQr] = useState("");
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor(((Date.parse(snapshot?.expiresAt) || Date.now() + 1800000) - Date.now()) / 1000)));
  const [expired, setExpired] = useState(false);
  const pollBusy = useRef(false);
  const paymentUrl = safeExternalUrl(snapshot?.payUrl);
  useEffect(() => {
    let mounted = true;
    if (snapshot?.qrCode) import("qrcode").then((module) => (module.default || module).toDataURL(snapshot.qrCode, { width: 280, margin: 2 })).then((url) => mounted && setQr(url)).catch(() => mounted && setQr(snapshot.qrCode));
    const countdown = window.setInterval(() => setRemaining((value) => { if (value <= 1) { setExpired(true); return 0; } return value - 1; }), 1000);
    const poll = window.setInterval(async () => {
      if (!snapshot?.orderId || pollBusy.current) return;
      pollBusy.current = true;
      try { const order = await paymentApi.order(snapshot.orderId); if (!mounted) return; if (successfulOrder(order.status)) { clearRecovery(); navigate(`/payment/result?${paymentQuery(snapshot)}`, { replace: true }); } else if (terminalOrder(order.status)) setExpired(true); } catch { /* keep polling transient failures */ } finally { pollBusy.current = false; }
    }, 3000);
    return () => { mounted = false; window.clearInterval(countdown); window.clearInterval(poll); };
  }, [navigate, snapshot?.orderId, snapshot?.qrCode]);
  const cancel = async () => { try { await paymentApi.cancel(snapshot.orderId); clearRecovery(); navigate("/purchase", { replace: true }); } catch (error) { notify("error", error.message); } };
  if (!snapshot) return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body"><ErrorState message={locale === "zh" ? "支付参数不完整或已过期。" : "Payment details are missing or expired."} /><Link className="console-button console-button--primary" to="/purchase">{t("payment.back")}</Link></div></Panel></PaymentShell>;
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body"><span className="console-payment-state-icon"><Icon name={expired ? "warning" : "card"} size={30} /></span><h1>{expired ? t("payment.failed") : t("payment.waiting")}</h1><p>{snapshot?.qrCode ? t("payment.scan") : (locale === "zh" ? "在新窗口完成付款。" : "Complete payment in the provider window.")}</p>{qr && !expired && <img className="console-qr" src={qr} alt="Payment QR code" />}{paymentUrl && !snapshot?.qrCode && !expired && <a className="console-button console-button--primary" href={paymentUrl} target="_blank" rel="noreferrer">{locale === "zh" ? "打开支付页面" : "Open payment page"}</a>}<strong className="console-countdown">{countdownText(remaining)}</strong><div className="console-payment-state-actions"><Button onClick={() => navigate("/purchase")}>{t("payment.back")}</Button>{snapshot?.orderId && !expired && <Button variant="danger" onClick={cancel}>{t("orders.cancel")}</Button>}</div></div></Panel></PaymentShell>;
}

function pendingStatus(status) {
  return ["PENDING", "CREATED", "WAITING", "PROCESSING"].includes(String(status || "").toUpperCase());
}

export function PaymentResultPage() {
  const { t, locale } = useLocale();
  const [params] = useSearchParams();
  const resumeToken = params.get("resume_token") || "";
  const restored = readRecovery(resumeToken);
  const [state, setState] = useState({ loading: true, order: null, error: "" });
  const refreshRef = useRef(null);
  const mountedRef = useRef(true);
  const resolve = useCallback(async () => {
    try {
      let order = null;
      if (resumeToken) order = await paymentApi.resolvePublic(resumeToken).catch(() => null);
      const orderId = Number(params.get("order_id") || restored?.orderId || 0);
      if (!order && orderId) order = await paymentApi.order(orderId).catch(() => null);
      const tradeNo = params.get("out_trade_no") || restored?.outTradeNo;
      if (!order && tradeNo) order = await paymentApi.verifyPublic(tradeNo).catch(() => null);
      if (!order) throw new Error(locale === "zh" ? "暂时无法确认订单状态。" : "We could not confirm the order yet.");
      if (mountedRef.current) setState({ loading: false, order, error: "" });
      if (terminalOrder(order.status)) clearRecovery();
      return order;
    } catch (error) { if (mountedRef.current) setState({ loading: false, order: null, error: error.message }); return null; }
  }, [locale, params, restored?.orderId, restored?.outTradeNo, resumeToken]);
  useEffect(() => {
    mountedRef.current = true;
    let mounted = true;
    resolve().then((order) => {
      if (!mounted || !pendingStatus(order?.status)) return;
      let attempts = 0;
      refreshRef.current = window.setInterval(async () => { attempts += 1; const next = await resolve(); if (!mounted || terminalOrder(next?.status) || attempts >= 40) window.clearInterval(refreshRef.current); }, 3000);
    });
    return () => { mounted = false; mountedRef.current = false; window.clearInterval(refreshRef.current); };
  }, [resolve]);
  const success = successfulOrder(state.order?.status);
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body"><span className={`console-payment-state-icon ${success ? "is-success" : state.error ? "is-error" : ""}`}><Icon name={success ? "check" : state.error ? "warning" : "clock"} size={30} /></span>{state.loading ? <Spinner label={t("payment.processing")} /> : <><h1>{success ? t("payment.success") : pendingStatus(state.order?.status) ? t("payment.processing") : t("payment.failed")}</h1><p>{state.error || (success ? (locale === "zh" ? "余额或订阅权益将在片刻内更新。" : "Your balance or subscription will update shortly.") : state.order?.status)}</p>{state.order && <div className="console-result-order"><span>{t("orders.number")}</span><strong className="console-mono">{state.order.out_trade_no}</strong><span>{t("common.status")}</span><StatusBadge status={String(state.order.status).toLowerCase()} label={statusLabel(String(state.order.status).toLowerCase(), locale)} /></div>}<div className="console-payment-state-actions"><Link className="console-button console-button--primary" to="/orders">{t("payment.viewOrders")}</Link><Link className="console-button console-button--secondary" to="/purchase">{t("payment.back")}</Link></div></>}</div></Panel></PaymentShell>;
}

export function StripePaymentPage({ popup = false }) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", ready: false, busy: false, success: false, qr: "" });
  const paymentElementRef = useRef(null);
  const intervalRef = useRef(null);
  const closeTimerRef = useRef(null);
  const resumeToken = params.get("resume_token") || "";
  const clientSecretParam = params.get("client_secret") || "";
  const methodParam = params.get("method") || "";
  const snapshot = useMemo(() => readRecovery(resumeToken), [resumeToken]);
  const finish = useCallback(() => {
    setState((current) => ({ ...current, success: true, qr: "" }));
    window.clearInterval(intervalRef.current);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => popup || window.opener ? window.close() : navigate(`/payment/result?${paymentQuery(snapshot)}`, { replace: true }), 1500);
  }, [navigate, popup, snapshot]);
  useEffect(() => {
    let active = true;
    let element = null;
    const initialize = async () => {
      const clientSecret = clientSecretParam || snapshot?.clientSecret;
      if (!snapshot?.orderId || !clientSecret) throw new Error(locale === "zh" ? "支付参数不完整。" : "Payment parameters are incomplete.");
      const checkout = await paymentApi.checkout().catch(() => ({}));
      const publishableKey = snapshot.stripePublishableKey || checkout.stripe_publishable_key;
      if (!publishableKey) throw new Error(locale === "zh" ? "Stripe 尚未配置。" : "Stripe is not configured.");
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(publishableKey);
      if (!active || !stripe) return;
      const method = methodParam;
      if (method === "alipay") {
        setState((current) => ({ ...current, loading: false }));
        const result = await stripe.confirmAlipayPayment(clientSecret, { return_url: `${window.location.origin}/payment/result?${paymentQuery(snapshot)}` });
        if (result.error) throw new Error(result.error.message);
        return;
      }
      if (method === "wechat_pay") {
        const result = await stripe.confirmWechatPayPayment(clientSecret, { payment_method_options: { wechat_pay: { client: /Mobi/i.test(navigator.userAgent) ? "mobile_web" : "web" } } });
        if (result.error) throw new Error(result.error.message);
        const qr = result.paymentIntent?.next_action?.wechat_pay_display_qr_code?.image_data_url || "";
        if (result.paymentIntent?.status === "succeeded") finish(); else setState((current) => ({ ...current, loading: false, qr }));
        return;
      }
      const elements = stripe.elements({ clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "12px", colorPrimary: "#397eab" } } });
      element = elements.create("payment", { layout: "tabs" });
      element.mount("#stripe-payment-element");
      element.on("ready", () => active && setState((current) => ({ ...current, loading: false, ready: true })));
      paymentElementRef.current = { stripe, elements };
    };
    initialize().catch((error) => active && setState({ loading: false, error: error.message, ready: false, busy: false, success: false, qr: "" }));
    if (snapshot?.orderId) intervalRef.current = window.setInterval(async () => { try { const order = await paymentApi.order(snapshot.orderId); if (active && successfulOrder(order.status)) finish(); } catch { /* transient poll error */ } }, 3000);
    return () => { active = false; element?.unmount(); window.clearInterval(intervalRef.current); window.clearTimeout(closeTimerRef.current); };
  }, [clientSecretParam, finish, locale, methodParam, snapshot?.clientSecret, snapshot?.orderId, snapshot?.stripePublishableKey]);
  const pay = async () => {
    if (!paymentElementRef.current) return;
    setState((current) => ({ ...current, busy: true, error: "" }));
    const { stripe, elements } = paymentElementRef.current;
    const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/payment/result?${paymentQuery(snapshot)}` }, redirect: "if_required" });
    if (result.error) setState((current) => ({ ...current, busy: false, error: result.error.message })); else finish();
  };
  return <PaymentShell><Panel className="console-stripe-card"><div className="console-panel-body">{state.loading && <Spinner />}{state.error && <ErrorState message={state.error} />}{state.success && <div className="console-payment-success"><Icon name="check" size={28} /><h1>{t("payment.success")}</h1></div>}{state.qr && <div className="console-payment-success"><h1>{t("payment.waiting")}</h1><img className="console-qr" src={state.qr} alt="WeChat Pay QR code" /></div>}<div id="stripe-payment-element" hidden={state.loading || state.error || state.success || state.qr} />{state.ready && !state.success && <Button variant="primary" onClick={pay} disabled={state.busy}>{state.busy ? t("common.loading") : t("purchase.pay")}</Button>}<Link className="console-text-link" to="/purchase">{t("payment.back")}</Link></div></Panel></PaymentShell>;
}

export function StripePopupPage() { return <StripePaymentPage popup />; }

export function AirwallexPaymentPage() {
  const { t, locale } = useLocale();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const snapshot = readRecovery(params.get("resume_token") || "");
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      if (!snapshot?.intentId || !snapshot?.clientSecret) throw new Error(locale === "zh" ? "支付参数不完整。" : "Payment parameters are incomplete.");
      const sdk = await import("@airwallex/components-sdk");
      const result = await sdk.init({ env: snapshot.paymentEnv === "prod" ? "prod" : "demo", enabledElements: ["payments"], locale: locale === "zh" ? "zh" : "en" });
      if (!active || !result.payments) return;
      const successUrl = `${window.location.origin}/payment/result?${paymentQuery(snapshot)}`;
      const redirect = result.payments.redirectToCheckout({ intent_id: snapshot.intentId, client_secret: snapshot.clientSecret, currency: snapshot.currency || "CNY", country_code: snapshot.countryCode || "CN", successUrl });
      if (typeof redirect === "string") window.location.assign(redirect);
    };
    initialize().catch((loadError) => active && setError(loadError.message));
    return () => { active = false; };
  }, [locale, snapshot?.clientSecret, snapshot?.countryCode, snapshot?.currency, snapshot?.intentId, snapshot?.paymentEnv]);
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body">{error ? <ErrorState message={error} /> : <Spinner label={t("payment.processing")} />}<Link className="console-text-link" to="/purchase">{t("payment.back")}</Link></div></Panel></PaymentShell>;
}

function fragmentParams() {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function safeRedirect(value) {
  const path = String(value || "").trim();
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://") ? (path === "/payment" ? "/purchase" : path.replace(/^\/payment\?/, "/purchase?")) : "/purchase";
}

export function WeChatPaymentCallbackPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  useEffect(() => {
    const fragment = fragmentParams();
    const read = (key) => fragment.get(key) || params.get(key) || "";
    const callbackError = read("error") || read("err_msg") || read("errmsg");
    if (callbackError) { setError(read("error_description") || read("message") || callbackError); return; }
    const resumeToken = read("wechat_resume_token");
    const openid = read("openid");
    if (!resumeToken && !openid) { setError(locale === "zh" ? "微信回调缺少恢复信息。" : "The WeChat callback is missing recovery information."); return; }
    const redirect = new URL(safeRedirect(read("redirect")), window.location.origin);
    redirect.searchParams.set("wechat_resume", "1");
    if (resumeToken) redirect.searchParams.set("wechat_resume_token", resumeToken);
    else {
      redirect.searchParams.set("openid", openid);
      ["state", "scope", "payment_type", "amount", "order_type", "plan_id"].forEach((key) => { if (read(key)) redirect.searchParams.set(key, read(key)); });
    }
    navigate(`${redirect.pathname}${redirect.search}`, { replace: true });
  }, [locale, navigate, params]);
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body">{error ? <ErrorState message={error} /> : <Spinner label={locale === "zh" ? "正在恢复微信支付…" : "Resuming WeChat payment…"} />}{error && <Link className="console-button console-button--primary" to="/purchase">{locale === "zh" ? "返回支付" : "Back to payment"}</Link>}</div></Panel></PaymentShell>;
}
