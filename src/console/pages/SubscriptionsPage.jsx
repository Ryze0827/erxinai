import { useCallback, useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@appica/ui-react/table";
import { Link } from "react-router";
import { subscriptionsApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { PlatformMark } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, ProgressBar, Skeleton, StatusBadge, TableSkeleton, buttonLinkClass } from "../UI";
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

function QuotaCell({ progress, fallback, formatCurrency, locale }) {
  const item = progress || fallback;
  if (!item) return <div className="console-subscription-quota is-inactive"><strong>{locale === "zh" ? "周期未生效" : "Window not active"}</strong><small>—</small></div>;
  const percentage = Number(item.percentage ?? (item.limit > 0 ? item.used / item.limit * 100 : 0));
  const tone = percentage >= 90 ? "danger" : percentage >= 60 ? "warning" : "green";
  return <div className={`console-subscription-quota is-${tone}`}><div><span>{item.limit ? <><strong>{formatCurrency(item.used)}</strong> / {formatCurrency(item.limit)}</> : (locale === "zh" ? "不限" : "Unlimited")}</span>{item.limit > 0 && <b>{Math.round(percentage)}%</b>}</div>{item.limit > 0 && <ProgressBar value={percentage} tone={tone} />}<small>{resetLabel(item.reset_in_seconds, locale)}</small></div>;
}

function remainingDays(expiresAt, locale) {
  if (!expiresAt) return "";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0 || days > 30) return "";
  return locale === "zh" ? `${days} 天` : `${days} days`;
}

function subscriptionProgress(subscription, progress, key) {
  return progress?.[key] || quotaFromSubscription(subscription, key);
}

function monthlyUsed(subscription, progress) {
  return Number(subscriptionProgress(subscription, progress, "monthly")?.used || 0);
}

function SubscriptionsLoading({ title }) {
  return <Page title={title} className="console-subscriptions-page console-subscriptions-loading">
    <Panel className="console-subscriptions-toolbar"><div className="console-panel-body"><p><Skeleton /><Skeleton /></p><div><Skeleton /><Skeleton /></div></div></Panel>
    <Panel className="console-subscriptions-ledger"><div className="console-subscriptions-ledger-head"><Skeleton /></div><div className="console-subscriptions-table-wrap"><TableSkeleton columns={8} rows={3} pagination={false} /></div><footer><Skeleton /><div><Skeleton /><Skeleton /><Skeleton /></div></footer></Panel>
  </Page>;
}

export function SubscriptionsPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { settings } = useConsole();
  const [state, setState] = useState({ loading: true, refreshing: false, error: "", items: [], progress: {} });
  const mountedRef = useRef(true);
  const load = useCallback(async (silent = false) => {
    setState((current) => ({ ...current, loading: silent ? current.loading : true, refreshing: silent, error: "" }));
    try {
      const [subscriptions, progress] = await Promise.allSettled([subscriptionsApi.list(), subscriptionsApi.progress()]);
      if (subscriptions.status === "rejected") throw subscriptions.reason;
      const items = Array.isArray(subscriptions.value) ? subscriptions.value : subscriptions.value?.items || [];
      const progressItems = Array.isArray(progress.value) ? progress.value : progress.value?.items || progress.value?.progress || [];
      const progressMap = Object.fromEntries(progressItems.map((item) => [
        item.subscription_id ?? item.subscription?.id,
        item.progress ?? item,
      ]).filter(([subscriptionId]) => subscriptionId != null));
      if (mountedRef.current) setState({ loading: false, refreshing: false, error: "", items, progress: progressMap });
    } catch (error) { if (mountedRef.current) setState((current) => ({ ...current, loading: false, refreshing: false, error: error.message })); }
  }, []);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);

  if (state.loading) return <SubscriptionsLoading title={t("subscriptions.title")} />;
  if (state.error && !state.items.length) return <Page title={t("subscriptions.title")} className="console-subscriptions-page"><Panel><ErrorState message={state.error} onRetry={load} /></Panel></Page>;
  const activeCount = state.items.filter((item) => String(item.status).toLowerCase() === "active").length;
  const monthlyUsage = state.items.reduce((total, item) => total + monthlyUsed(item, state.progress[item.id] || {}), 0);
  const buyClass = buttonLinkClass({ variant: "primary" });
  const renewClass = buttonLinkClass({ variant: "secondary", size: "sm", className: "console-subscription-renew" });
  return <Page title={t("subscriptions.title")} className="console-subscriptions-page">
    <Panel className="console-subscriptions-toolbar"><div className="console-panel-body"><p><strong>{activeCount} {locale === "zh" ? "个有效" : "active"}</strong> {locale === "zh" ? "订阅" : "subscriptions"}<i>·</i><b>{formatCurrency(monthlyUsage)}</b> {locale === "zh" ? "本月用量" : "monthly usage"}</p><div><Button icon="refresh" onClick={() => load(true)} disabled={state.refreshing}>{state.refreshing ? t("common.loading") : t("common.refresh")}</Button>{settings?.payment_enabled !== false && <Link className={buyClass} to="/purchase?tab=subscription"><Icon name="cart" size={17} />{locale === "zh" ? "购买订阅" : "Buy subscription"}</Link>}</div></div></Panel>
    {!state.items.length ? <Panel><EmptyState icon="card" title={locale === "zh" ? "暂无订阅" : "No subscriptions yet"} description={locale === "zh" ? "购买套餐后，配额与重置时间会显示在这里。" : "Your plan limits and reset windows will appear here."} action={settings?.payment_enabled !== false && <Link className={buyClass} to="/purchase?tab=subscription">{locale === "zh" ? "购买订阅" : "Buy subscription"}</Link>} /></Panel> : <Panel className="console-subscriptions-ledger">
      <div className="console-subscriptions-ledger-head"><h2>{locale === "zh" ? "订阅台账" : "Subscription ledger"}</h2></div>
      <div className="console-subscriptions-table-wrap"><Table className="console-subscriptions-table" size="sm" borderStyle="solid" hoverableRows><TableHeader><TableRow><TableHead>{locale === "zh" ? "套餐" : "Plan"}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead>{t("subscriptions.expires")}</TableHead><TableHead>{locale === "zh" ? "倍率" : "Rate"}</TableHead><TableHead>{t("subscriptions.daily")}</TableHead><TableHead>{t("subscriptions.weekly")}</TableHead><TableHead>{t("subscriptions.monthly")}</TableHead><TableHead>{locale === "zh" ? "操作" : "Action"}</TableHead></TableRow></TableHeader><TableBody>{state.items.map((subscription) => {
        const progress = state.progress[subscription.id] || {};
        const platform = subscription.group?.platform || "default";
        const status = String(subscription.status || "unknown").toLowerCase();
        const renewal = settings?.payment_enabled !== false && subscription.group_id && !["expired", "cancelled"].includes(status);
        const expiryWarning = remainingDays(subscription.expires_at, locale);
        return <TableRow key={subscription.id}><TableCell><div className={`console-subscription-plan is-${String(platform).toLowerCase()}`}><i><PlatformMark platform={platform} /></i><span><strong>{subscription.group?.name || `${t("subscriptions.title")} #${subscription.id}`}</strong><small>{subscription.group?.description}</small></span></div></TableCell><TableCell><StatusBadge status={status} label={statusLabel(status, locale)} /></TableCell><TableCell><strong>{subscription.expires_at ? formatDate(subscription.expires_at, { dateOnly: true }) : t("common.never")}</strong>{expiryWarning && <small className="console-subscription-expiry-warning">{expiryWarning}</small>}</TableCell><TableCell><strong>{Number(subscription.group?.rate_multiplier || 1).toFixed(1)}×</strong></TableCell><TableCell><QuotaCell progress={progress.daily} fallback={quotaFromSubscription(subscription, "daily")} formatCurrency={formatCurrency} locale={locale} /></TableCell><TableCell><QuotaCell progress={progress.weekly} fallback={quotaFromSubscription(subscription, "weekly")} formatCurrency={formatCurrency} locale={locale} /></TableCell><TableCell><QuotaCell progress={progress.monthly} fallback={quotaFromSubscription(subscription, "monthly")} formatCurrency={formatCurrency} locale={locale} /></TableCell><TableCell>{renewal ? <Link className={renewClass} to={`/purchase?tab=subscription&group=${subscription.group_id}`}>{t("subscriptions.renew")}<Icon name="external" size={15} /></Link> : <span>—</span>}</TableCell></TableRow>;
      })}</TableBody></Table></div>
      <footer><p><Icon name="info" size={15} />{locale === "zh" ? "各配额周期独立重置；未配置限额时显示不限。" : "Quota windows reset independently · Unlimited appears when no limits are configured."}</p><div><span className="is-active">{locale === "zh" ? "有效" : "Active"}</span><span className="is-suspended">{locale === "zh" ? "已暂停" : "Suspended"}</span><span className="is-expired">{locale === "zh" ? "已过期" : "Expired"}</span></div></footer>
    </Panel>}
  </Page>;
}
