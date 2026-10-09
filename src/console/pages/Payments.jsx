import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandAlipay, BrandStripe, BrandWechat, CreditCard } from "@appica/icons-react";
import { Radio } from "@appica/ui-react/radio";
import { RadioGroup } from "@appica/ui-react/radio-group";
import { NumberField } from "@appica/ui-react/number-field";
import { Badge } from "@appica/ui-react/badge";
import { Alert } from "@appica/ui-react/alert";
import ReactMarkdown from "react-markdown";
import { Toggle as AppicaToggle } from "@appica/ui-react/toggle";
import { ToggleGroup } from "@appica/ui-react/toggle-group";
import { Link, useNavigate, useSearchParams } from "react-router";
import { paymentApi, usageApi } from "../../api";
import { BrandLogo } from "../../BrandLogo";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, InlineButton, Modal, Page, Pagination, Panel, SelectInput, Skeleton, Spinner, StatusBadge, TableSkeleton, TextArea, buttonLinkClass } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";
import { ConsoleBackgroundPattern } from "../components/ConsoleBackgroundPattern";
import { clearRecovery, createRecovery, paymentQuery, readRecovery, saveRecovery, successfulOrder, terminalOrder, visibleMethods } from "../paymentFlow";
import { safeExternalUrl, safeImageUrl, statusLabel } from "../utils";
import { describeRechargeBonusIntervals, normalizeRechargeBonusTiers, quoteRechargeBonus, rechargeMultiplier, roundRechargeAmount } from "../rechargeBonus";

const WECHAT_PENDING_KEY = "payment.wechat.pending";
const BALANCE_AMOUNT_PRESETS = [10, 20, 50, 100, 200, 500, 1000, 2000];
const DEFAULT_BALANCE_AMOUNT = 50;

function paymentLabel(type, locale = "en") {
  const normalized = type === "alipay_direct" ? "alipay" : type === "wxpay_direct" ? "wxpay" : type;
  const labels = locale === "zh"
    ? { alipay: "支付宝", wxpay: "微信支付", stripe: "Stripe", easypay: "易支付", airwallex: "Airwallex" }
    : { alipay: "Alipay", wxpay: "WeChat Pay", stripe: "Stripe", easypay: "EasyPay", airwallex: "Airwallex" };
  return labels[normalized] || type;
}

function orderPaymentLabel(type) {
  const normalized = type === "alipay_direct" ? "alipay" : type === "wxpay_direct" ? "wxpay" : type;
  const labels = { alipay: "支付宝", wxpay: "微信支付", stripe: "银行卡支付", easypay: "易支付", airwallex: "银行卡支付" };
  return labels[normalized] || "其他支付";
}

function paymentDescription(type, locale = "en") {
  const normalized = type === "alipay_direct" ? "alipay" : type === "wxpay_direct" ? "wxpay" : type;
  const descriptions = locale === "zh"
    ? {
      alipay: "安全快捷，推荐使用支付宝支付",
      wxpay: "即时支付，微信扫码完成付款",
      stripe: "使用银行卡安全完成在线支付",
      easypay: "通过聚合支付通道完成付款",
      airwallex: "使用银行卡或本地方式完成付款",
    }
    : {
      alipay: "Fast and secure payment with Alipay",
      wxpay: "Scan with WeChat to pay instantly",
      stripe: "Secure online card payment",
      easypay: "Pay through the available payment gateway",
      airwallex: "Pay by card or a supported local method",
    };
  return descriptions[normalized] || (locale === "zh" ? "安全快捷的在线支付" : "Fast and secure online payment");
}

function PaymentMark({ type, method }) {
  const normalized = type === "alipay_direct" ? "alipay" : type === "wxpay_direct" ? "wxpay" : type;
  const customIcon = safeImageUrl(method?.icon_url || method?.icon);
  if (normalized === "alipay") return <span className="console-payment-mark is-alipay"><BrandAlipay size={22} aria-hidden="true" /></span>;
  if (customIcon) return <span className="console-payment-mark"><img src={customIcon} alt="" /></span>;
  const marks = { alipay: BrandAlipay, wxpay: BrandWechat, stripe: BrandStripe };
  const Mark = marks[normalized] || CreditCard;
  return <span className={`console-payment-mark ${marks[normalized] ? "" : "console-payment-mark--generic"}`}><Mark size={22} aria-hidden="true" /></span>;
}

function currency(value, code, locale) {
  try { return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency: code || "CNY", currencyDisplay: "narrowSymbol", minimumFractionDigits: paymentFractionDigits(code), maximumFractionDigits: paymentFractionDigits(code) }).format(Number(value) || 0); }
  catch { return `${code || ""} ${(Number(value) || 0).toFixed(2)}`; }
}

function orderAmountDetails(order, locale) {
  const rows = [];
  if (order.pay_amount != null) rows.push([locale === "zh" ? "支付金额" : "Payment amount", currency(order.pay_amount, order.currency, locale)]);
  if (order.amount != null) rows.push([locale === "zh" ? (order.order_type === "subscription" ? "套餐金额" : "到账额度") : (order.order_type === "subscription" ? "Plan amount" : "Credit amount"), currency(order.amount, "USD", locale)]);
  // 历史订单只展示后端快照；bonus_amount 在两种模式下都是到账额内的优惠部分。
  if (order.order_type !== "subscription" && Number(order.bonus_amount) > 0) rows.push([locale === "zh" ? "其中优惠额度" : "Included promotional credit", currency(order.bonus_amount, "USD", locale)]);
  return rows;
}

function PaymentAmountSummary({ order, locale }) {
  const rows = orderAmountDetails(order, locale);
  if (!rows.length) return null;
  return <dl className="console-payment-amount-summary">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function methodFits(method, amount) {
  if (!method || method.available === false || !Number.isFinite(amount) || amount <= 0) return false;
  if (Number(method.single_min) > 0 && amount < Number(method.single_min)) return false;
  return !(Number(method.single_max) > 0 && amount > Number(method.single_max));
}

function PaymentMethods({ methods, selected, setSelected, amount, amountForMethod, locale, showSelection = false }) {
  const entries = Object.entries(methods);
  const enabled = ([, method]) => methodFits(method, amountForMethod ? amountForMethod(method) : amount);
  return <RadioGroup value={selected} onValueChange={setSelected} className="console-payment-methods" aria-label={locale === "zh" ? "支付方式" : "Payment method"}>{entries.map(([type, method]) => {
    const available = enabled([type, method]);
    return <label key={type} className={`${selected === type ? "is-selected" : ""} ${available ? "" : "is-disabled"}`}><PaymentMark type={type} method={method} /><div><strong>{method.display_name || paymentLabel(type, locale)}</strong><small>{paymentDescription(type, locale)}</small></div><span className={`console-payment-method-selected ${showSelection ? "" : "console-visually-hidden"}`}><Radio value={type} disabled={!available} aria-label={method.display_name || paymentLabel(type, locale)} /></span></label>;
  })}</RadioGroup>;
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

function balanceCharge(credit, checkout, method) {
  const currencyCode = String(method?.currency || "CNY").toUpperCase();
  return roundPaymentAmount(Number(credit || 0) / rechargeMultiplier(checkout), currencyCode);
}

function withWechatResumeContext(authorizeUrl, context) {
  try {
    const allowed = safeExternalUrl(authorizeUrl);
    if (!allowed) return "";
    const target = new URL(allowed);
    const requestedRedirect = new URL(target.searchParams.get("redirect") || "/purchase", window.location.origin);
    const redirect = requestedRedirect.origin === window.location.origin ? requestedRedirect : new URL("/purchase", window.location.origin);
    redirect.searchParams.set("payment_type", context.paymentType || "wxpay");
    redirect.searchParams.set("order_type", context.orderType || "balance");
    if (context.planId) redirect.searchParams.set("plan_id", String(context.planId));
    if (Number(context.amount) > 0) redirect.searchParams.set("amount", String(context.amount));
    target.searchParams.set("redirect", `${redirect.pathname}${redirect.search}`);
    return safeExternalUrl(target.toString());
  } catch {
    return "";
  }
}

function paymentFractionDigits(currencyCode) {
  const code = String(currencyCode || "CNY").trim().toUpperCase();
  // 与后端 CurrencyMaxFractionDigits 保持一致（含 MGA / ISK / UGX）。
  if (["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "VND", "VUV", "XAF", "XOF", "XPF", "ISK", "UGX"].includes(code)) return 0;
  if (["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"].includes(code)) return 3;
  return 2;
}

function roundPaymentAmount(value, currencyCode) {
  return roundRechargeAmount(Number(value || 0), paymentFractionDigits(currencyCode));
}

function paymentFee(amount, rate, currencyCode) {
  const factor = 10 ** paymentFractionDigits(currencyCode);
  // 支付金额按币种最小单位、费率按后端两位小数约束转为整数，避免浮点误差多收一分。
  return Math.ceil(Math.round(Number(amount || 0) * factor) * Math.round(Number(rate || 0) * 100) / 10000) / factor;
}

function paymentTotal(amount, rate, currencyCode) {
  return roundPaymentAmount(Number(amount || 0) + paymentFee(amount, rate, currencyCode), currencyCode);
}

function stripeMethod(paymentType) {
  if (paymentType === "stripe") return "";
  return paymentType === "wxpay" ? "wechat_pay" : "alipay";
}

function stripeTarget(snapshot, context, common) {
  const method = stripeMethod(context.paymentType);
  const suffix = method ? `&method=${method}` : "";
  return `/payment/stripe?${common}${suffix}`;
}

function shouldRedirectHosted(hostedUrl, forceQr) {
  return Boolean(hostedUrl && /Mobi|Android|iPhone/i.test(navigator.userAgent) && !forceQr);
}

function openHostedTarget(hostedUrl, common, navigate) {
  const popup = window.open("", "_blank", "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes");
  if (!popup || popup.closed) { window.location.assign(hostedUrl); return; }
  popup.opener = null;
  popup.location.replace(hostedUrl);
  navigate(`/payment/qrcode?${common}`);
}

function routePaymentTarget(snapshot, context, common, hostedUrl, navigate) {
  if (context.paymentType === "airwallex" && snapshot.clientSecret && snapshot.intentId) { navigate(`/payment/airwallex?${common}`); return; }
  if (snapshot.clientSecret) { navigate(stripeTarget(snapshot, context, common)); return; }
  if (shouldRedirectHosted(hostedUrl, context.forceQr)) { window.location.assign(hostedUrl); return; }
  if (snapshot.qrCode) { navigate(`/payment/qrcode?${common}`); return; }
  if (hostedUrl) { openHostedTarget(hostedUrl, common, navigate); return; }
  throw new Error("The payment provider did not return a payment target.");
}

function launchPayment(result, context, navigate) {
  const snapshot = createRecovery(result, context);
  saveRecovery(snapshot);
  const common = paymentQuery(snapshot);
  const hostedUrl = safeExternalUrl(snapshot.payUrl);
  if (result.result_type === "oauth_required" && result.oauth?.authorize_url) {
    const authorizeUrl = withWechatResumeContext(result.oauth.authorize_url, context);
    if (!authorizeUrl) throw new Error("The payment provider returned an invalid authorization URL.");
    sessionStorage.setItem(WECHAT_PENDING_KEY, JSON.stringify({ amount: context.amount, paymentType: context.paymentType, orderType: context.orderType, planId: context.planId || 0 }));
    window.location.assign(authorizeUrl);
    return snapshot;
  }
  if (result.result_type === "jsapi_ready" && (result.jsapi || result.jsapi_payload)) return { ...snapshot, jsapi: result.jsapi || result.jsapi_payload };
  routePaymentTarget(snapshot, context, common, hostedUrl, navigate);
  return snapshot;
}

function planPeriod(plan, locale) {
  const count = Number(plan.validity_days) || 0;
  const unit = ["weeks", "months"].includes(plan.validity_unit) ? plan.validity_unit : "days";
  const label = locale === "zh" ? { days: "天", weeks: "周", months: "个月" }[unit] : (count === 1 ? unit.slice(0, -1) : unit);
  return `${count} ${label}`;
}

function PlanCard({ plan, selected, locale }) {
  const limits = [["daily_limit_usd", "每日额度", "Daily credit"], ["weekly_limit_usd", "每周额度", "Weekly credit"], ["monthly_limit_usd", "每月额度", "Monthly credit"]].filter(([key]) => plan[key] != null);
  return <label className={`console-plan-card ${selected ? "is-selected" : ""}`}>
    <div className="console-plan-card-heading"><Badge variant="soft" size="sm" className="console-plan-platform">{plan.group_platform?.toUpperCase() || "AI"}</Badge><Radio value={String(plan.id)} aria-label={plan.name} /></div>
    <div className="console-plan-intro"><h3>{plan.name}</h3>{plan.description && <p>{plan.description}</p>}</div>
    <div className="console-plan-price"><div><strong>{currency(plan.price, "USD", locale)}</strong><span>USD</span></div><small>{locale === "zh" ? "有效期" : "Valid for"} {planPeriod(plan, locale)}{Number(plan.original_price) > Number(plan.price) && <del>{currency(plan.original_price, "USD", locale)}</del>}</small></div>
    {limits.length > 0 && <dl className="console-plan-limits">{limits.map(([key, zh, en]) => <div key={key}><dt>{locale === "zh" ? zh : en}</dt><dd>{currency(plan[key], "USD", locale)}</dd></div>)}</dl>}
    {plan.features?.length > 0 && <ul className="console-plan-features">{plan.features.map((feature, index) => <li key={index}><Icon name="check" size={14} aria-hidden="true" /><span>{feature}</span></li>)}</ul>}
    <span className="console-plan-select-hint"><Icon name={selected ? "check" : "plus"} size={15} aria-hidden="true" />{selected ? (locale === "zh" ? "已选择此套餐" : "Plan selected") : (locale === "zh" ? "选择此套餐" : "Select this plan")}</span>
  </label>;
}

function PurchaseTabs({ hidden, tab, setTab, setPlan, locale, t }) {
  if (hidden) return null;
  const items = [
    { value: "balance", label: <><Icon name="card" size={16} data-icon="start" />{locale === "zh" ? "充值" : t("purchase.balance")}</> },
    { value: "subscription", label: <><Icon name="gift" size={16} data-icon="start" />{locale === "zh" ? "订阅" : t("purchase.plan")}</> },
  ];
  return <CompactTabs value={tab} items={items} label={locale === "zh" ? "购买类型" : "Purchase type"} className="console-purchase-tabs" onChange={(next) => { setTab(next); if (next === "balance") setPlan(null); }} />;
}

function RechargeBonusPreview({ tiers, mode, amount, locale }) {
  const intervals = describeRechargeBonusIntervals(tiers);
  if (!intervals.length) return null;
  const formatNumber = (value) => Number(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 });
  return <div className="console-recharge-bonus-preview">
    <div className="console-recharge-bonus-heading"><strong><Icon name="gift" size={14} aria-hidden="true" />{locale === "zh" ? "充值优惠" : "Top-up offers"}</strong><span>{locale === "zh" ? "按优惠前支付金额匹配，含起始金额、不含结束金额" : "Based on payment before discounts. Start included; end excluded."}</span></div>
    <div className="console-recharge-bonus-ranges">{intervals.map((interval) => {
      const current = amount > 0 && amount >= interval.from && (interval.to == null || amount < interval.to);
      const range = interval.to == null ? `≥ ${formatNumber(interval.from)}` : `${formatNumber(interval.from)} ~ ${formatNumber(interval.to)}`;
      const benefit = interval.percent > 0 ? (mode === "discount" ? (locale === "zh" ? `立减 ${formatNumber(interval.percent)}%` : `${formatNumber(interval.percent)}% off`) : (locale === "zh" ? `赠送 ${formatNumber(interval.percent)}%` : `${formatNumber(interval.percent)}% bonus`)) : (locale === "zh" ? (mode === "discount" ? "无折扣" : "不赠送") : (mode === "discount" ? "No discount" : "No bonus"));
      return <Badge key={interval.from} variant="soft" size="sm" className={`console-recharge-bonus-range ${current ? "is-current" : ""}`} aria-current={current ? "true" : undefined}>{current && <Icon name="check" size={12} aria-label={locale === "zh" ? "当前区间" : "Current range"} />}<span>{range}：{benefit}</span></Badge>;
    })}</div>
  </div>;
}

function AmountPresets({ amount, setAmount, quoteForCredit, hasBonus, locale, formatUsd }) {
  const selected = BALANCE_AMOUNT_PRESETS.includes(Number(amount)) ? [String(amount)] : [];
  return <ToggleGroup value={selected} className={`console-amounts console-purchase-amounts ${hasBonus ? "has-bonus" : ""}`} aria-label={locale === "zh" ? "充值额度（USD）" : "Top-up credit (USD)"} onValueChange={(values) => values.at(-1) && setAmount(Number(values.at(-1)))}>{BALANCE_AMOUNT_PRESETS.map((value) => {
    const quote = quoteForCredit(value);
    return <AppicaToggle type="button" value={String(value)} className={Number(amount) === value ? "is-selected" : ""} key={value}>
      <span className="console-purchase-preset-top"><strong>${value.toLocaleString("en-US")}</strong>{quote.percent > 0 && <Badge variant="soft" size="sm" className="console-purchase-preset-benefit">{quote.mode === "discount" ? (locale === "zh" ? `减 ${quote.percent}%` : `${quote.percent}% off`) : (locale === "zh" ? `赠 ${quote.percent}%` : `+${quote.percent}%`)}</Badge>}</span>
      <small>{hasBonus && quote.mode === "discount" ? `${locale === "zh" ? "应付" : "Pay"} ${formatUsd(quote.payBase)}` : `${locale === "zh" ? "到账" : "Credit"} ${formatUsd(quote.credited)}`}</small>
      <span className="console-purchase-amount-check" aria-hidden="true"><Icon name="check" size={13} /></span>
    </AppicaToggle>;
  })}</ToggleGroup>;
}

function defaultBalanceAmount(lastRechargeAmount) {
  const amount = Number(lastRechargeAmount);
  if (!Number.isFinite(amount) || amount <= 0) return DEFAULT_BALANCE_AMOUNT;
  return BALANCE_AMOUNT_PRESETS.find((preset) => preset >= amount) ?? BALANCE_AMOUNT_PRESETS.at(-1);
}

function PurchaseSectionTitle({ title, description }) {
  return <div className="console-purchase-section-title"><strong>{title}</strong>{description && <small>{description}</small>}</div>;
}


function successfulBalanceOrders(items = []) {
  return items.filter((item) => item.order_type === "balance" && successfulOrder(item.status));
}

async function purchaseOrders() {
  const first = await paymentApi.orders({ page: 1, page_size: 100, order_type: "balance" });
  const pages = Number(first.pages || 1);
  if (pages <= 1) return first.items || [];
  const remaining = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => paymentApi.orders({ page: index + 2, page_size: 100, order_type: "balance" })));
  return [first, ...remaining].flatMap((page) => page.items || []);
}

function purchaseOverview(ordersResult, usageResult) {
  const orders = ordersResult.status === "fulfilled" ? successfulBalanceOrders(ordersResult.value) : [];
  const latest = orders.reduce((current, item) => {
    const itemDate = item.completed_at || item.paid_at || item.created_at;
    const currentDate = current?.completed_at || current?.paid_at || current?.created_at;
    return !current || Date.parse(itemDate) > Date.parse(currentDate) ? item : current;
  }, null);
  return {
    loading: false,
    totalRecharge: ordersResult.status === "fulfilled" ? orders.reduce((sum, item) => sum + Number(item.amount || 0), 0) : null,
    totalSpend: usageResult.status === "fulfilled" ? Number(usageResult.value?.total_actual_cost ?? 0) : null,
    lastRecharge: latest?.completed_at || latest?.paid_at || latest?.created_at || null,
    lastRechargeAmount: latest?.amount ?? null,
  };
}

async function loadPurchaseOverview() {
  const [orders, usage] = await Promise.allSettled([purchaseOrders(), usageApi.dashboardStats()]);
  return purchaseOverview(orders, usage);
}

function OverviewMetric({ label, value, description, loading }) {
  return <div className="console-purchase-overview-metric"><small>{label}</small>{loading ? <Skeleton className="h-6 w-20" /> : <div className="console-purchase-overview-value"><strong>{value}</strong>{description && <span>{description}</span>}</div>}</div>;
}

function overviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function BalanceOverview({ user, overview, formatUsd, locale }) {
  const account = user?.username || user?.email;
  const recharge = overview.totalRecharge == null ? "—" : formatUsd(overview.totalRecharge);
  const spend = overview.totalSpend == null ? "—" : formatUsd(overview.totalSpend);
  const latest = overview.lastRechargeAmount == null ? "—" : formatUsd(overview.lastRechargeAmount);
  const latestDate = overview.lastRecharge ? overviewDate(overview.lastRecharge) : null;
  return <Panel className="console-purchase-overview">
    <div className="console-purchase-overview-balance">
      <span className="console-purchase-overview-icon"><Icon name="wallet" size={30} /></span>
      <div className="console-purchase-overview-copy"><small>{locale === "zh" ? "可用余额" : "Available balance"}</small><strong>{formatUsd(user?.balance)}</strong><span>{locale === "zh" ? "账户" : "Account"} · {account || "—"}</span></div>
    </div>
    <div className="console-purchase-overview-stats">
      <OverviewMetric label={locale === "zh" ? "累计充值" : "Total recharged"} value={recharge} loading={overview.loading} />
      <OverviewMetric label={locale === "zh" ? "累计消费" : "Total spent"} value={spend} loading={overview.loading} />
      <OverviewMetric label={locale === "zh" ? "最近充值" : "Latest recharge"} value={latest} description={latestDate} loading={overview.loading} />
    </div>
  </Panel>;
}

function BalancePurchase({ checkout, user, overview, locale, t, formatUsd, amount, setAmount, methods, method, setMethod, orderAmount, selectedLimit, payable, fee, feeRate, state, methodAvailable, quote, quoteForCredit, bonusTiers, balanceTotalForMethod, onPay }) {
  const methodCount = Object.keys(methods).length;
  const formatPayment = formatUsd;
  const balance = Number(user?.balance || 0);
  const notice = String(checkout.recharge_bonus_notice || "").trim();
  const validCredit = Number.isFinite(Number(amount)) && Number(amount) >= 10;
  return <div className="console-purchase-balance">
    <BalanceOverview user={user} overview={overview} formatUsd={formatUsd} locale={locale} />
    <Panel className="console-purchase-checkout console-recharge-layout">
      {notice && <div className="console-recharge-banner"><Alert variant="info" role="note" className="console-recharge-notice"><div className="console-recharge-notice-content"><strong><Icon name="gift" size={16} />{locale === "zh" ? "充值活动" : "Top-up offer"}</strong><ReactMarkdown skipHtml components={{ a: ({ href, children }) => <a href={safeExternalUrl(href) || undefined} target="_blank" rel="noopener noreferrer">{children}</a> }}>{notice}</ReactMarkdown></div></Alert></div>}
      <div className="console-recharge-form">
        <section className="console-recharge-section" aria-labelledby="recharge-amount-title">
          <div className="console-recharge-section-heading"><h2 id="recharge-amount-title">{locale === "zh" ? "选择充值额度" : "Choose your credit"}</h2><span>USD</span></div>
          <p className="console-recharge-description">{locale === "zh" ? "额度以美元计价，充值优惠自动生效。" : "Credit is in USD. Eligible offers apply automatically."}</p>
          <RechargeBonusPreview tiers={bonusTiers} mode={quote.mode} amount={orderAmount} locale={locale} />
          <AmountPresets amount={amount} setAmount={setAmount} quoteForCredit={quoteForCredit} hasBonus={bonusTiers.length > 0} locale={locale} formatUsd={formatUsd} />
          <div className="console-recharge-custom"><div><PurchaseSectionTitle title={locale === "zh" ? "其他金额" : "Custom amount"} /><small className="console-purchase-minimum">{locale === "zh" ? "最低 $10，不含赠送额度" : "From $10, before bonus credit"}</small></div><NumberField className="console-purchase-custom-input" min={10} step={10} value={amount} format={{ style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 2 }} locale={locale === "zh" ? "zh-CN" : "en-US"} inputProps={{ "aria-label": locale === "zh" ? "自定义充值金额" : "Custom top-up amount" }} onValueChange={(value) => setAmount(value)} /></div>
          {bonusTiers.length > 0 && <p className="console-recharge-hint"><Icon name="gift" size={14} />{quote.mode === "discount" ? (locale === "zh" ? "优惠抵扣实付，到账额度不变；卡片金额未含手续费。" : "Discounts reduce payment, not credit. Card prices exclude fees.") : (locale === "zh" ? "赠送额度随充值一起到账，可直接用于消费。" : "Bonus credit arrives with your top-up, ready to use.")}</p>}
        </section>
        <section className="console-recharge-section console-recharge-payment" aria-labelledby="recharge-method-title">
          <div className="console-recharge-section-heading"><h2 id="recharge-method-title">{locale === "zh" ? "支付方式" : "Payment method"}</h2></div>
          {methodCount ? <PaymentMethods methods={methods} selected={method} setSelected={setMethod} amountForMethod={balanceTotalForMethod} locale={locale} showSelection /> : <div className="console-payment-empty">{locale === "zh" ? "暂未配置可用支付方式" : "No payment methods are available"}</div>}
          {selectedLimit && <p className="console-recharge-limits">{locale === "zh" ? "单笔实付" : "Per payment"} · {formatPayment(selectedLimit.single_min || 0)}{Number(selectedLimit.single_max) > 0 ? ` – ${formatPayment(selectedLimit.single_max)}` : (locale === "zh" ? " 起" : " minimum")}</p>}
          {methodCount > 0 && validCredit && !methodAvailable && <p role="status" className="console-recharge-error">{locale === "zh" ? "当前支付方式不可用于此金额，请调整金额或选择其他支付方式。" : "This method is unavailable for this amount. Adjust the amount or choose another method."}</p>}
        </section>
      </div>
      <aside className="console-recharge-summary" aria-labelledby="recharge-summary-title">
        <h2 id="recharge-summary-title">{locale === "zh" ? "充值明细" : "Top-up summary"}</h2>
        <div className="console-recharge-summary-amounts" aria-live="polite" aria-atomic="true">
          <div className="console-recharge-total"><span>{locale === "zh" ? "实际支付" : "Total payment"}<small>USD</small></span><strong>{formatPayment(payable)}</strong></div>
          <dl className="console-purchase-review">
            {quote.mode === "bonus" && quote.bonus > 0 && <div><dt>{locale === "zh" ? "充值额度" : "Base credit"}</dt><dd>{formatUsd(quote.base)}</dd></div>}
            {quote.mode === "bonus" && quote.bonus > 0 && <div className="is-benefit"><dt>{locale === "zh" ? "优惠赠送" : "Bonus credit"}<small>+{quote.percent}%</small></dt><dd>+{formatUsd(quote.bonus)}</dd></div>}
            {(quote.discount > 0 || fee > 0) && <div><dt>{locale === "zh" ? "支付原价" : "Payment subtotal"}</dt><dd>{quote.discount > 0 ? <del>{formatPayment(orderAmount)}</del> : formatPayment(orderAmount)}</dd></div>}
            {quote.discount > 0 && <div className="is-benefit"><dt>{locale === "zh" ? "优惠抵扣" : "Discount"}<small>{quote.percent}%</small></dt><dd>−{formatPayment(quote.discount)}</dd></div>}
            {fee > 0 && <div><dt>{locale === "zh" ? "手续费" : "Processing fee"}<small>{feeRate}%</small></dt><dd>+{formatPayment(fee)}</dd></div>}
            <div className="is-credit-total"><dt>{locale === "zh" ? "合计到账" : "Total credit"}</dt><dd>{formatUsd(quote.credited)}</dd></div>
          </dl>
          <div className="console-recharge-balance-after"><span>{locale === "zh" ? "充值后余额" : "Balance after top-up"}</span><strong>{formatUsd(roundRechargeAmount(balance + quote.credited))}</strong></div>
        </div>
        <Button variant="primary" className="console-purchase-submit" icon="shield" onClick={onPay} disabled={state.busy || !methodAvailable || !validCredit || orderAmount <= 0}>{state.busy ? t("common.loading") : (locale === "zh" ? "确认支付" : "Confirm payment")}</Button>
        <Link className="console-purchase-history" to="/orders">{locale === "zh" ? "查看充值记录" : "View payment history"}<Icon name="chevronRight" size={14} /></Link>
      </aside>
    </Panel>
  </div>;
}

function SubscriptionCheckout({ plan, locale, formatUsd, chargeAmount, methods, method, setMethod, payable, fee, subscriptionTotalForMethod, state, methodAvailable, onPay, t }) {
  const formatPayment = formatUsd;
  return <Panel className="console-subscription-checkout"><div className="console-subscription-checkout-body">
    <section className="console-subscription-payment console-recharge-payment" aria-labelledby="subscription-payment-title"><div className="console-recharge-section-heading"><h2 id="subscription-payment-title">{locale === "zh" ? "支付方式" : "Payment method"}</h2></div><p className="console-recharge-description">{locale === "zh" ? "支付成功后自动开通，同分组续购可延长有效期。" : "Activated after payment. Renewals extend access to the same group."}</p>{Object.keys(methods).length ? <PaymentMethods methods={methods} selected={method} setSelected={setMethod} amount={payable} amountForMethod={subscriptionTotalForMethod} locale={locale} showSelection /> : <div className="console-payment-empty">{locale === "zh" ? "暂未配置可用支付方式" : "No payment methods are available"}</div>}{Object.keys(methods).length > 0 && !methodAvailable && <p className="console-recharge-error" role="status">{locale === "zh" ? "当前支付方式不可用于此套餐，请选择其他支付方式。" : "This payment method is unavailable for this plan. Choose another method."}</p>}</section>
    <aside className="console-recharge-summary" aria-labelledby="subscription-summary-title"><h2 id="subscription-summary-title">{locale === "zh" ? "订阅明细" : "Subscription summary"}</h2><div className="console-subscription-selection"><strong>{plan.name}</strong><span>{locale === "zh" ? "有效期" : "Valid for"} {planPeriod(plan, locale)}</span></div><dl className="console-purchase-review"><div><dt>{locale === "zh" ? "套餐金额" : "Plan price"}</dt><dd>{formatPayment(chargeAmount)}</dd></div>{fee > 0 && <div><dt>{locale === "zh" ? "手续费" : "Processing fee"}</dt><dd>{formatPayment(fee)}</dd></div>}</dl><div className="console-recharge-total"><span>{locale === "zh" ? "实际支付" : "Total payment"}<small>USD</small></span><strong>{formatPayment(payable)}</strong></div><Button variant="primary" className="console-purchase-submit" icon="shield" onClick={onPay} disabled={state.busy || !methodAvailable}>{state.busy ? t("common.loading") : (locale === "zh" ? "确认订阅" : "Confirm subscription")}</Button></aside>
  </div></Panel>;
}

function SubscriptionPurchase(props) {
  const { checkout, plan, setPlan, locale } = props;
  return <div className="console-subscription-purchase"><div className="console-subscription-heading"><h2>{locale === "zh" ? "选择适合你的订阅" : "Choose your subscription"}</h2><p>{locale === "zh" ? "按周期购买分组使用权益，额度与有效期一目了然。" : "Choose group access with clear credit limits and validity."}</p></div><RadioGroup value={plan ? String(plan.id) : ""} onValueChange={(id) => setPlan(checkout.plans.find((item) => String(item.id) === id) || null)} className="console-plan-grid" aria-label={locale === "zh" ? "订阅套餐" : "Subscription plan"}>{checkout.plans.map((item) => <PlanCard key={item.id} plan={item} selected={plan?.id === item.id} locale={locale} />)}</RadioGroup>{!checkout.plans.length && <Panel><EmptyState icon="gift" title={locale === "zh" ? "暂无可购买的订阅" : "No subscriptions available"} description={locale === "zh" ? "套餐上架后将显示在这里。" : "Plans will appear here when available."} /></Panel>}{plan && <SubscriptionCheckout {...props} />}</div>;
}

function PurchaseHelp({ checkout }) {
  if (!checkout.help_text && !checkout.help_image_url) return null;
  const image = safeImageUrl(checkout.help_image_url);
  return <Panel><div className="console-panel-body console-payment-help">{image && <img src={image} alt="" />}<p>{checkout.help_text}</p></div></Panel>;
}

function PurchaseOverviewLoading() {
  return <Panel className="console-purchase-overview console-purchase-overview-skeleton" aria-hidden="true">
    <div className="console-purchase-overview-balance"><Skeleton className="console-purchase-overview-icon" /><div className="console-purchase-overview-copy"><Skeleton /><Skeleton /><Skeleton /></div></div>
    <div className="console-purchase-overview-stats">{Array.from({ length: 3 }, (_, index) => <div className="console-purchase-overview-metric" key={index}><Skeleton /><Skeleton /></div>)}</div>
  </Panel>;
}

function PurchaseLoading({ title }) {
  return <Page title={title} className="console-purchase-page console-purchase-loading">
    <Skeleton className="console-purchase-tabs-skeleton" />
    <div className="console-purchase-balance">
      <PurchaseOverviewLoading />
      <Panel className="console-purchase-checkout console-recharge-layout" aria-hidden="true">
        <div className="console-recharge-form"><Skeleton className="h-5 w-32" /><div className="console-recharge-preset-skeletons">{BALANCE_AMOUNT_PRESETS.map((value) => <Skeleton key={value} />)}</div><Skeleton className="h-12 w-full" /><Skeleton className="h-16 w-full" /></div>
        <div className="console-recharge-summary"><Skeleton className="h-5 w-24" /><Skeleton className="h-12 w-40" /><Skeleton className="h-32 w-full" /><Skeleton className="h-12 w-full" /></div>
      </Panel>
    </div>
  </Page>;
}

export function PurchasePage() {
  const { t, locale, formatCurrency, formatUsd } = useLocale();
  const { user, notify } = useConsole();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [checkout, setCheckout] = useState(null);
  const [overview, setOverview] = useState({ loading: true, totalRecharge: null, totalSpend: null, lastRecharge: null, lastRechargeAmount: null });
  const [state, setState] = useState({ loading: true, error: "", busy: false });
  const [tab, setTab] = useState("balance");
  const [amount, setAmount] = useState(DEFAULT_BALANCE_AMOUNT);
  const [method, setMethod] = useState("");
  const [plan, setPlan] = useState(null);
  const resumeHandled = useRef(false);
  const mountedRef = useRef(true);
  const initialQueryRef = useRef({ tab: params.get("tab") || "", group: params.get("group") || "" });
  const methods = useMemo(() => visibleMethods(checkout?.methods), [checkout]);
  const selectedLimit = methods[method];
  const creditAmount = Number(amount || 0);
  const orderAmount = tab === "subscription" ? Number(plan?.price || 0) : balanceCharge(creditAmount, checkout, selectedLimit);
  const bonusTiers = useMemo(() => normalizeRechargeBonusTiers(checkout?.recharge_bonus_tiers), [checkout]);
  const quoteForCredit = (credit, candidate = selectedLimit) => quoteRechargeBonus(balanceCharge(credit, checkout, candidate), checkout, bonusTiers, paymentFractionDigits(candidate?.currency));
  const quote = quoteForCredit(creditAmount);
  const chargeAmount = tab === "subscription" ? subscriptionCharge(orderAmount, checkout, selectedLimit) : quote.payBase;
  const feeRate = Number(checkout?.recharge_fee_rate || 0);
  const selectedCurrency = selectedLimit?.currency || "CNY";
  const fee = paymentFee(chargeAmount, feeRate, selectedCurrency);
  const payable = paymentTotal(chargeAmount, feeRate, selectedCurrency);
  const balanceTotalForMethod = (candidate) => paymentTotal(quoteForCredit(creditAmount, candidate).payBase, feeRate, candidate?.currency || "CNY");
  const subscriptionTotalForMethod = (candidate) => paymentTotal(subscriptionCharge(orderAmount, checkout, candidate), feeRate, candidate?.currency || "CNY");

  const load = useCallback(async () => {
    setState({ loading: true, error: "", busy: false });
    setOverview({ loading: true, totalRecharge: null, totalSpend: null, lastRecharge: null, lastRechargeAmount: null });
    try {
      const [data, nextOverview] = await Promise.all([
        paymentApi.checkout(),
        loadPurchaseOverview(),
      ]);
      if (!mountedRef.current) return;
      setCheckout(data);
      setOverview(nextOverview);
      setAmount(defaultBalanceAmount(nextOverview.lastRechargeAmount));
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
    if (!pending && !options.resumeToken && (!methodFits(selectedLimit, payable) || (activeType === "balance" && (!Number.isFinite(creditAmount) || creditAmount < 10)))) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      const body = makeOrderBody({ amount: activeAmount, paymentType: activeMethod, orderType: activeType, planId: activePlanId, resumeToken: options.resumeToken, openid: options.openid, forceQr: checkout?.alipay_force_qrcode });
      const result = await paymentApi.createOrder(body);
      const launched = launchPayment(result, { amount: activeAmount, paymentType: activeMethod, orderType: activeType, planId: activePlanId, currency: methods[activeMethod]?.currency, stripePublishableKey: checkout?.stripe_publishable_key, forceQr: checkout?.alipay_force_qrcode && activeMethod === "alipay" }, navigate);
      if (launched.jsapi) {
        const response = await invokeWechat(launched.jsapi);
        const message = String(response?.err_msg || "").toLowerCase();
        if (message.includes("cancel")) throw new Error(locale === "zh" ? "支付已取消。" : "Payment was cancelled.");
        if (message && !message.includes("ok")) throw new Error(locale === "zh" ? `微信支付失败：${message}` : `WeChat Pay failed: ${message}`);
        navigate(`/payment/result?${paymentQuery(launched)}`);
      }
    } catch (error) { notify("error", error.message); } finally { if (mountedRef.current) setState((current) => ({ ...current, busy: false })); }
  }, [checkout, creditAmount, locale, method, methods, navigate, notify, orderAmount, payable, plan?.id, selectedLimit, tab]);

  useEffect(() => {
    if (!checkout || resumeHandled.current || params.get("wechat_resume") !== "1") return;
    resumeHandled.current = true;
    try {
      const stored = JSON.parse(sessionStorage.getItem(WECHAT_PENDING_KEY)) || {};
      const planId = Number(stored.planId || params.get("plan_id")) || 0;
      const orderType = stored.orderType || params.get("order_type") || (planId ? "subscription" : "balance");
      const fallbackAmount = orderType === "subscription" ? Number((checkout.plans || []).find((item) => item.id === planId)?.price || 0) : Number(orderAmount || 0);
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
  }, [checkout, create, locale, notify, orderAmount, params, setParams]);

  if (state.loading) return <PurchaseLoading title={t("purchase.title")} />;
  if (state.error || !checkout) return <Page title={t("purchase.title")}><Panel><ErrorState message={state.error} onRetry={load} /></Panel></Page>;
  const methodAvailable = methodFits(selectedLimit, payable);
  const purchaseProps = { checkout, user, overview, locale, t, formatCurrency, formatUsd, amount, setAmount, methods, method, setMethod, orderAmount, chargeAmount, selectedLimit, feeRate, fee, payable, state, methodAvailable, quote, quoteForCredit, bonusTiers, balanceTotalForMethod, plan, setPlan, subscriptionTotalForMethod, onPay: () => create() };
  return <Page title={t("purchase.title")} className="console-purchase-page">
    <PurchaseTabs hidden={checkout.balance_disabled} tab={tab} setTab={setTab} setPlan={setPlan} locale={locale} t={t} />
    {tab === "balance" ? <BalancePurchase {...purchaseProps} /> : <SubscriptionPurchase {...purchaseProps} />}
    <PurchaseHelp checkout={checkout} />
  </Page>;
}

export function OrdersPage() {
  const { t, locale, formatDate, formatUsd } = useLocale();
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
      if (mountedRef.current) setState((current) => ({ ...current, loading: false, items: orders.value.items || [], total: orders.value.total || 0, pages: orders.value.pages || 1, eligible: new Set(eligible.status === "fulfilled" ? eligible.value?.provider_instance_ids || [] : []) }));
    } catch (error) { if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [filter, paging]);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);
  const submitAction = async () => {
    if (!dialog?.item || !["cancel", "refund"].includes(dialog.type)) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      if (dialog.type === "cancel") await paymentApi.cancel(dialog.item.id);
      else await paymentApi.refund(dialog.item.id, reason.trim());
      notify("success", t("common.success"));
      setDialog(null);
      setReason("");
      load();
    } catch (error) { notify("error", error.message); } finally { if (mountedRef.current) setState((current) => ({ ...current, busy: false })); }
  };
  const displayAmount = (item) => {
    if (item?.amount == null) return "—";
    const amount = Number(item.amount);
    const formatted = formatUsd(amount);
    return successfulOrder(item.status) && amount > 0 ? `+${formatted}` : formatted;
  };
  const columns = [
    { key: "id", label: t("orders.id"), render: (row) => <span className="console-order-id">{row.id ?? "—"}</span> },
    { key: "out_trade_no", label: t("orders.number"), render: (row) => <span className="console-order-number">{row.out_trade_no || "—"}</span> },
    { key: "amount", label: t("orders.amount"), render: (row) => <div><span className={`console-order-amount text-sm font-medium tabular-nums ${successfulOrder(row.status) ? "text-success-emphasis" : "text-foreground"}`}>{displayAmount(row)}</span>{row.pay_amount != null && <small className="console-order-payment">{locale === "zh" ? "支付" : "Paid"} {currency(row.pay_amount, row.currency, locale)}</small>}{row.order_type !== "subscription" && Number(row.bonus_amount) > 0 && <small className="console-order-benefit">{locale === "zh" ? "含优惠" : "Includes offer"} {formatUsd(row.bonus_amount)}</small>}</div> },
    { key: "payment_type", label: t("orders.method"), render: (row) => orderPaymentLabel(row.payment_type) },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={String(row.status).toLowerCase()} label={statusLabel(String(row.status).toLowerCase(), locale)} /> },
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
    { key: "actions", label: t("common.actions"), render: (row) => <div className="console-inline-actions"><InlineButton className="console-order-view" onClick={() => setDialog({ type: "view", item: row })}>{locale === "zh" ? "查看" : "View"}</InlineButton>{String(row.status).toUpperCase() === "PENDING" && <InlineButton variant="danger" onClick={() => setDialog({ type: "cancel", item: row })}>{t("orders.cancel")}</InlineButton>}{String(row.status).toUpperCase() === "COMPLETED" && row.provider_instance_id && state.eligible.has(row.provider_instance_id) && <InlineButton onClick={() => setDialog({ type: "refund", item: row })}>{t("orders.refund")}</InlineButton>}</div> },
  ];
  const filterOptions = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];
  const setStatusFilter = (value) => { setFilter(value); setPaging((current) => ({ ...current, page: 1 })); };
  const statusTabs = [{ value: "", label: t("common.all") }, ...filterOptions.map((status) => ({ value: status, label: statusLabel(status.toLowerCase(), locale) }))];
  const orderTable = <><DataTable className="console-orders-table" columns={columns} rows={state.items} empty={<EmptyState icon="order" />} /><Pagination page={paging.page} pageSize={paging.pageSize} total={state.total} pages={state.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;
  return <Page title={t("orders.title")} className="console-orders-page" actions={<Button variant="primary" icon="plus" onClick={() => navigate("/purchase")}>{t("purchase.title")}</Button>}><Panel className="console-orders-panel" aria-busy={state.loading}><div className="console-orders-toolbar"><CompactTabs value={filter} items={statusTabs} label={locale === "zh" ? "订单状态" : "Order status"} className="console-orders-status-tabs" onChange={setStatusFilter} /><Button icon="refresh" onClick={load} loading={state.loading}>{t("common.refresh")}</Button></div>{state.loading && !state.items.length ? <TableSkeleton columns={7} /> : state.error && !state.items.length ? <ErrorState message={state.error} onRetry={load} /> : orderTable}</Panel><ConfirmDialog open={dialog?.type === "cancel"} title={t("orders.cancel")} description={locale === "zh" ? "确定取消这个待支付订单吗？" : "Cancel this pending order?"} busy={state.busy} onClose={() => setDialog(null)} onConfirm={submitAction} /><Modal open={dialog?.type === "refund"} title={t("orders.refund")} onClose={() => setDialog(null)} size="small" footer={<><Button onClick={() => setDialog(null)}>{t("common.cancel")}</Button><Button variant="primary" onClick={submitAction} disabled={!reason.trim() || state.busy}>{t("common.confirm")}</Button></>}><Field label={t("orders.reason")}><TextArea rows="4" value={reason} onChange={(event) => setReason(event.target.value)} /></Field></Modal><Modal open={dialog?.type === "view"} title={locale === "zh" ? "订单详情" : "Order details"} onClose={() => setDialog(null)} size="small"><dl className="console-order-detail">{dialog?.item && [[t("orders.id"), dialog.item.id ?? "—"], [t("orders.number"), dialog.item.out_trade_no || "—"], ...orderAmountDetails(dialog.item, locale), [t("orders.method"), orderPaymentLabel(dialog.item.payment_type)], [t("common.status"), statusLabel(String(dialog.item.status).toLowerCase(), locale)], [t("common.date"), formatDate(dialog.item.created_at)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Modal></Page>;
}

function PaymentShell({ children }) {
  const { branding, brandingReady } = useConsole();
  return <ConsoleBackgroundPattern variant="dots" spotlight track="window" className="console-public-shell"><Link className={`console-public-brand ${brandingReady ? "" : "is-pending"}`} to="/">{brandingReady && <BrandLogo key={branding.siteLogo} src={branding.siteLogo} alt="" />}{brandingReady && <strong>{branding.siteName}</strong>}</Link><main>{children}</main></ConsoleBackgroundPattern>;
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
  if (!snapshot) return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body"><ErrorState message={locale === "zh" ? "支付参数不完整或已过期。" : "Payment details are missing or expired."} /><Link className={buttonLinkClass({ variant: "primary" })} to="/purchase">{t("payment.back")}</Link></div></Panel></PaymentShell>;
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body"><span className="console-payment-state-icon"><Icon name={expired ? "warning" : "card"} size={30} /></span><h1>{expired ? t("payment.failed") : t("payment.waiting")}</h1><p>{snapshot?.qrCode ? t("payment.scan") : (locale === "zh" ? "在新窗口完成付款。" : "Complete payment in the provider window.")}</p>{qr && !expired && <img className="console-qr" src={qr} alt="Payment QR code" />}{paymentUrl && !snapshot?.qrCode && !expired && <a className={buttonLinkClass({ variant: "primary" })} href={paymentUrl} target="_blank" rel="noopener noreferrer">{locale === "zh" ? "打开支付页面" : "Open payment page"}</a>}<PaymentAmountSummary order={{ amount: snapshot.amount, pay_amount: snapshot.payAmount, bonus_amount: snapshot.bonusAmount, order_type: snapshot.orderType, currency: snapshot.currency }} locale={locale} /><strong className="console-countdown">{countdownText(remaining)}</strong><div className="console-payment-state-actions"><Button onClick={() => navigate("/purchase")}>{t("payment.back")}</Button>{snapshot?.orderId && !expired && <Button variant="danger" onClick={cancel}>{t("orders.cancel")}</Button>}</div></div></Panel></PaymentShell>;
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
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body"><span className={`console-payment-state-icon ${success ? "is-success" : state.error ? "is-error" : ""}`}><Icon name={success ? "check" : state.error ? "warning" : "clock"} size={30} /></span>{state.loading ? <Spinner label={t("payment.processing")} /> : <><h1>{success ? t("payment.success") : pendingStatus(state.order?.status) ? t("payment.processing") : t("payment.failed")}</h1><p>{state.error || (success ? (locale === "zh" ? "余额或订阅权益将在片刻内更新。" : "Your balance or subscription will update shortly.") : state.order?.status)}</p>{state.order && <div className="console-result-order"><span>{t("orders.number")}</span><strong className="console-mono">{state.order.out_trade_no}</strong><span>{t("common.status")}</span><StatusBadge status={String(state.order.status).toLowerCase()} label={statusLabel(String(state.order.status).toLowerCase(), locale)} /></div>}{state.order && <PaymentAmountSummary order={state.order} locale={locale} />}<div className="console-payment-state-actions"><Link className={buttonLinkClass({ variant: "primary" })} to="/orders">{t("payment.viewOrders")}</Link><Link className={buttonLinkClass()} to="/purchase">{t("payment.back")}</Link></div></>}</div></Panel></PaymentShell>;
}

async function loadStripePaymentClient(snapshot, locale) {
  const clientSecret = snapshot?.clientSecret;
  if (!snapshot?.orderId || !clientSecret) throw new Error(locale === "zh" ? "支付参数不完整。" : "Payment parameters are incomplete.");
  const checkout = await paymentApi.checkout().catch(() => ({}));
  const publishableKey = snapshot.stripePublishableKey || checkout.stripe_publishable_key;
  if (!publishableKey) throw new Error(locale === "zh" ? "Stripe 尚未配置。" : "Stripe is not configured.");
  const { loadStripe } = await import("@stripe/stripe-js");
  return { clientSecret, stripe: await loadStripe(publishableKey) };
}

async function confirmStripeMethod({ stripe, method, clientSecret, snapshot, finish, setState }) {
  if (method === "alipay") {
    setState((current) => ({ ...current, loading: false }));
    const result = await stripe.confirmAlipayPayment(clientSecret, { return_url: `${window.location.origin}/payment/result?${paymentQuery(snapshot)}` });
    if (result.error) throw new Error(result.error.message);
    return true;
  }
  if (method !== "wechat_pay") return false;
  const client = /Mobi/i.test(navigator.userAgent) ? "mobile_web" : "web";
  const result = await stripe.confirmWechatPayPayment(clientSecret, { payment_method_options: { wechat_pay: { client } } });
  if (result.error) throw new Error(result.error.message);
  const qr = result.paymentIntent?.next_action?.wechat_pay_display_qr_code?.image_data_url || "";
  if (result.paymentIntent?.status === "succeeded") finish();
  else setState((current) => ({ ...current, loading: false, qr }));
  return true;
}

function mountStripeElement(stripe, clientSecret, onReady) {
  const darkTheme = document.documentElement.dataset.consoleTheme === "dark";
  const rootStyle = getComputedStyle(document.documentElement);
  const accent = rootStyle.getPropertyValue("--primary").trim();
  const borderRadius = rootStyle.getPropertyValue("--radius").trim();
  const appearanceVariables = { ...(accent && { colorPrimary: accent }), ...(borderRadius && { borderRadius }) };
  const elements = stripe.elements({ clientSecret, appearance: { theme: darkTheme ? "night" : "stripe", variables: appearanceVariables } });
  const element = elements.create("payment", { layout: "tabs" });
  element.mount("#stripe-payment-element");
  element.on("ready", onReady);
  return { element, elements };
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
  const methodParam = params.get("method") || "";
  const routeOrderId = Number(params.get("order_id") || 0);
  const snapshot = useMemo(() => {
    const restored = readRecovery(resumeToken);
    return restored && (!routeOrderId || restored.orderId === routeOrderId) ? restored : null;
  }, [resumeToken, routeOrderId]);
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
      const { clientSecret, stripe } = await loadStripePaymentClient(snapshot, locale);
      if (!active || !stripe) return;
      if (await confirmStripeMethod({ stripe, method: methodParam, clientSecret, snapshot, finish, setState })) return;
      const mounted = mountStripeElement(stripe, clientSecret, () => active && setState((current) => ({ ...current, loading: false, ready: true })));
      element = mounted.element;
      paymentElementRef.current = { stripe, elements: mounted.elements };
    };
    initialize().catch((error) => active && setState({ loading: false, error: error.message, ready: false, busy: false, success: false, qr: "" }));
    if (snapshot?.orderId) intervalRef.current = window.setInterval(async () => { try { const order = await paymentApi.order(snapshot.orderId); if (active && successfulOrder(order.status)) finish(); } catch { /* transient poll error */ } }, 3000);
    return () => { active = false; element?.unmount(); window.clearInterval(intervalRef.current); window.clearTimeout(closeTimerRef.current); };
  }, [finish, locale, methodParam, snapshot?.clientSecret, snapshot?.orderId, snapshot?.stripePublishableKey]);
  const pay = async () => {
    if (!paymentElementRef.current) return;
    setState((current) => ({ ...current, busy: true, error: "" }));
    const { stripe, elements } = paymentElementRef.current;
    const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/payment/result?${paymentQuery(snapshot)}` }, redirect: "if_required" });
    if (result.error) setState((current) => ({ ...current, busy: false, error: result.error.message })); else finish();
  };
  return <PaymentShell><Panel className="console-stripe-card"><div className="console-panel-body">{state.loading && <Spinner />}{state.error && <ErrorState message={state.error} />}{state.success && <div className="console-payment-success"><Icon name="check" size={28} /><h1>{t("payment.success")}</h1></div>}{state.qr && <div className="console-payment-success"><h1>{t("payment.waiting")}</h1><img className="console-qr" src={state.qr} alt="WeChat Pay QR code" /></div>}<div id="stripe-payment-element" hidden={state.loading || state.error || state.success || state.qr} />{state.ready && !state.success && <Button variant="primary" onClick={pay} disabled={state.busy}>{state.busy ? t("common.loading") : t("purchase.pay")}</Button>}<Link className={buttonLinkClass({ variant: "ghost" })} to="/purchase">{t("payment.back")}</Link></div></Panel></PaymentShell>;
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
      if (!active) return;
      const result = await sdk.init({ env: snapshot.paymentEnv === "prod" ? "prod" : "demo", enabledElements: ["payments"], locale: locale === "zh" ? "zh" : "en" });
      if (!active || !result.payments) return;
      const successUrl = `${window.location.origin}/payment/result?${paymentQuery(snapshot)}`;
      const redirect = result.payments.redirectToCheckout({ intent_id: snapshot.intentId, client_secret: snapshot.clientSecret, currency: snapshot.currency || "CNY", country_code: snapshot.countryCode || "CN", successUrl });
      if (typeof redirect === "string") {
        const allowed = safeExternalUrl(redirect);
        if (!allowed) throw new Error(locale === "zh" ? "支付服务返回了无效地址。" : "The payment provider returned an invalid URL.");
        window.location.assign(allowed);
      }
    };
    initialize().catch((loadError) => active && setError(loadError.message));
    return () => { active = false; };
  }, [locale, snapshot?.clientSecret, snapshot?.countryCode, snapshot?.currency, snapshot?.intentId, snapshot?.paymentEnv]);
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body">{error ? <ErrorState message={error} /> : <Spinner label={t("payment.processing")} />}<Link className={buttonLinkClass({ variant: "ghost" })} to="/purchase">{t("payment.back")}</Link></div></Panel></PaymentShell>;
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
  return <PaymentShell><Panel className="console-payment-state"><div className="console-panel-body">{error ? <ErrorState message={error} /> : <Spinner label={locale === "zh" ? "正在恢复微信支付…" : "Resuming WeChat payment…"} />}{error && <Link className={buttonLinkClass({ variant: "primary" })} to="/purchase">{locale === "zh" ? "返回支付" : "Back to payment"}</Link>}</div></Panel></PaymentShell>;
}
