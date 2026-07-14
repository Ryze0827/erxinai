import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { subscriptionsApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, ProgressBar, Spinner, StatusBadge } from "../UI";
import { statusLabel } from "../utils";

function resetLabel(seconds, locale) {
  if (seconds === null || seconds === undefined) return locale === "zh" ? "等待周期开始" : "Window not active";
  const hours = Math.floor(Number(seconds) / 3600);
  const minutes = Math.floor((Number(seconds) % 3600) / 60);
  return locale === "zh" ? `${hours} 小时 ${minutes} 分后重置` : `Resets in ${hours}h ${minutes}m`;
}

function quotaFromSubscription(subscription, key) {
  const names = { daily: "daily", weekly: "weekly", monthly: "monthly" };
  const prefix = names[key];
  const limit = subscription.group?.[`${prefix}_limit_usd`];
  const used = subscription[`${prefix}_usage_usd`];
  return limit === null || limit === undefined ? null : { used: Number(used || 0), limit: Number(limit), percentage: Number(limit) > 0 ? Number(used || 0) / Number(limit) * 100 : 0 };
}

function QuotaRow({ label, progress, fallback, formatCurrency, locale }) {
  const item = progress || fallback;
  if (!item) return null;
  return <div className="console-subscription-quota"><div><strong>{label}</strong><span>{item.limit ? `${formatCurrency(item.used)} / ${formatCurrency(item.limit)}` : (locale === "zh" ? "不限" : "Unlimited")}</span></div>{item.limit > 0 && <ProgressBar value={item.percentage ?? item.used / item.limit * 100} tone={(item.percentage || 0) >= 90 ? "danger" : "green"} />}<small>{resetLabel(item.reset_in_seconds, locale)}</small></div>;
}

export function SubscriptionsPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { settings } = useConsole();
  const [state, setState] = useState({ loading: true, error: "", items: [], progress: {} });
  const mountedRef = useRef(true);
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [subscriptions, progress] = await Promise.allSettled([subscriptionsApi.list(), subscriptionsApi.progress()]);
      if (subscriptions.status === "rejected") throw subscriptions.reason;
      const items = Array.isArray(subscriptions.value) ? subscriptions.value : subscriptions.value?.items || [];
      const progressItems = Array.isArray(progress.value) ? progress.value : progress.value?.items || progress.value?.progress || [];
      const progressMap = Object.fromEntries(progressItems.map((item) => [item.subscription_id, item]));
      if (mountedRef.current) setState({ loading: false, error: "", items, progress: progressMap });
    } catch (error) { if (mountedRef.current) setState({ loading: false, error: error.message, items: [], progress: {} }); }
  }, []);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);

  return <Page title={t("subscriptions.title")} subtitle={t("subscriptions.subtitle")} actions={settings?.payment_enabled !== false && <Button variant="primary" icon="cart" onClick={() => { window.location.href = "/purchase"; }}>{t("subscriptions.renew")}</Button>}>
    {state.loading ? <Panel><Spinner /></Panel> : state.error ? <Panel><ErrorState message={state.error} onRetry={load} /></Panel> : !state.items.length ? <Panel><EmptyState icon="card" title={locale === "zh" ? "暂无有效订阅" : "No subscriptions yet"} description={locale === "zh" ? "购买套餐后，配额与重置时间会显示在这里。" : "Your plan limits and reset windows will appear here."} action={settings?.payment_enabled !== false && <Link className="console-button console-button--primary" to="/purchase">{t("purchase.title")}</Link>} /></Panel> : <div className="console-grid console-grid--2">{state.items.map((subscription) => {
      const progress = state.progress[subscription.id] || {};
      return <Panel key={subscription.id} className="console-subscription-card"><div className="console-panel-body"><div className="console-subscription-head"><span className="console-platform-icon">{String(subscription.group?.platform || "AI").slice(0, 2).toUpperCase()}</span><div><h3>{subscription.group?.name || `${t("subscriptions.title")} #${subscription.id}`}</h3><p>{subscription.group?.description}</p></div><StatusBadge status={subscription.status} label={statusLabel(subscription.status, locale)} /></div><div className="console-subscription-meta"><span>{t("subscriptions.expires")}</span><strong>{subscription.expires_at ? formatDate(subscription.expires_at) : t("common.never")}</strong></div><div className="console-subscription-quotas"><QuotaRow label={t("subscriptions.daily")} progress={progress.daily} fallback={quotaFromSubscription(subscription, "daily")} formatCurrency={formatCurrency} locale={locale} /><QuotaRow label={t("subscriptions.weekly")} progress={progress.weekly} fallback={quotaFromSubscription(subscription, "weekly")} formatCurrency={formatCurrency} locale={locale} /><QuotaRow label={t("subscriptions.monthly")} progress={progress.monthly} fallback={quotaFromSubscription(subscription, "monthly")} formatCurrency={formatCurrency} locale={locale} /></div>{subscription.group?.rate_multiplier && <div className="console-subscription-rate"><span>{locale === "zh" ? "计费倍率" : "Billing multiplier"}</span><strong>{subscription.group.rate_multiplier}×</strong></div>}{settings?.payment_enabled !== false && subscription.group_id && <Link className="console-button console-button--secondary" to={`/purchase?tab=subscription&group=${subscription.group_id}`}>{t("subscriptions.renew")}</Link>}</div></Panel>;
    })}</div>}
  </Page>;
}
