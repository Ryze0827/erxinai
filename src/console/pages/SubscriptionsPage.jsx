import { useCallback, useEffect, useRef, useState } from "react";
import { Table } from "@appica/ui-react/table";
import { TableBody } from "@appica/ui-react/table";
import { TableCell } from "@appica/ui-react/table";
import { TableHead } from "@appica/ui-react/table";
import { TableHeader } from "@appica/ui-react/table";
import { TableRow } from "@appica/ui-react/table";
import { Link } from "react-router";
import { subscriptionsApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { PlatformMark } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale, translate, translateNodes } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, ProgressBar, Skeleton, StatusBadge, TableSkeletonRows, buttonLinkClass } from "../UI";
import { statusLabel } from "../utils";

function resetLabel(seconds, locale) {
  if (seconds === null || seconds === undefined) return translate(locale, "subscriptions.windowNotActive");
  const hours = Math.floor(Number(seconds) / 3600);
  const minutes = Math.floor((Number(seconds) % 3600) / 60);
  return translate(locale, "subscriptions.resetsHM", { hours, minutes });
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
  if (!item) return <div className="console-subscription-quota is-inactive"><strong>{translate(locale, "subscriptions.windowNotActive2")}</strong><small>—</small></div>;
  const percentage = Number(item.percentage ?? (item.limit > 0 ? item.used / item.limit * 100 : 0));
  const tone = percentage >= 90 ? "danger" : percentage >= 60 ? "warning" : "success";
  return <div className={`console-subscription-quota is-${tone}`}><div><span>{item.limit ? <><strong>{formatCurrency(item.used)}</strong> / {formatCurrency(item.limit)}</> : translate(locale, "common.unlimited")}</span>{item.limit > 0 && <b>{Math.round(percentage)}%</b>}</div>{item.limit > 0 && <ProgressBar value={percentage} tone={tone} />}<small>{resetLabel(item.reset_in_seconds, locale)}</small></div>;
}

function remainingDays(expiresAt, locale) {
  if (!expiresAt) return "";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0 || days > 30) return "";
  return translate(locale, "subscriptions.days", { count: days });
}

function subscriptionProgress(subscription, progress, key) {
  return progress?.[key] || quotaFromSubscription(subscription, key);
}

function monthlyUsed(subscription, progress) {
  return Number(subscriptionProgress(subscription, progress, "monthly")?.used || 0);
}

// One header definition for the ledger and its loading state keeps their columns aligned.
function ledgerColumns(locale, t) {
  return [
    { key: "plan", label: t("subscriptions.plan") },
    { key: "status", label: t("common.status") },
    { key: "expires_at", label: t("subscriptions.expires") },
    { key: "rate", label: t("subscriptions.rate") },
    { key: "daily", label: t("subscriptions.daily") },
    { key: "weekly", label: t("subscriptions.weekly") },
    { key: "monthly", label: t("subscriptions.monthly") },
    { key: "action", label: t("subscriptions.action") },
  ];
}

function LedgerHeader({ columns }) {
  return <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key} data-column={column.key}>{column.label}</TableHead>)}</TableRow></TableHeader>;
}

function SubscriptionsLoading({ title, columns }) {
  return <Page title={title} className="console-subscriptions-page console-subscriptions-loading">
    <Panel className="console-subscriptions-toolbar"><div className="console-panel-body"><p><Skeleton /><Skeleton /></p><div><Skeleton /><Skeleton /></div></div></Panel>
    <Panel className="console-subscriptions-ledger"><div className="console-subscriptions-ledger-head"><Skeleton /></div><div className="console-subscriptions-table-wrap" role="status" aria-busy="true"><Table className="console-subscriptions-table" size="sm" borderStyle="solid"><LedgerHeader columns={columns} /><TableBody><TableSkeletonRows columns={columns} rows={3} /></TableBody></Table></div><footer><Skeleton /><div><Skeleton /><Skeleton /><Skeleton /></div></footer></Panel>
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

  if (state.loading) return <SubscriptionsLoading title={t("subscriptions.title")} columns={ledgerColumns(locale, t)} />;
  if (state.error && !state.items.length) return <Page title={t("subscriptions.title")} className="console-subscriptions-page"><Panel><ErrorState message={state.error} onRetry={load} /></Panel></Page>;
  const activeCount = state.items.filter((item) => String(item.status).toLowerCase() === "active").length;
  const monthlyUsage = state.items.reduce((total, item) => total + monthlyUsed(item, state.progress[item.id] || {}), 0);
  const buyClass = buttonLinkClass({ variant: "primary" });
  const renewClass = buttonLinkClass({ variant: "secondary", size: "sm", className: "console-subscription-renew" });
  return <Page title={t("subscriptions.title")} className="console-subscriptions-page">
    <Panel className="console-subscriptions-toolbar"><div className="console-panel-body"><p>{translateNodes(locale, "subscriptions.activeSummary", { active: <strong>{t("subscriptions.activeCount", { count: activeCount })}</strong> }, { count: activeCount })}<i>·</i>{translateNodes(locale, "subscriptions.monthlyUsageSummary", { amount: <b>{formatCurrency(monthlyUsage)}</b> })}</p><div><Button icon="refresh" onClick={() => load(true)} loading={state.refreshing}>{state.refreshing ? t("common.loading") : t("common.refresh")}</Button>{settings?.payment_enabled !== false && <Link className={buyClass} to="/purchase?tab=subscription"><Icon name="cart" size={17} />{t("subscriptions.buySubscription")}</Link>}</div></div></Panel>
    {!state.items.length ? <Panel><EmptyState icon="card" title={t("subscriptions.noSubscriptionsYet")} description={t("subscriptions.planLimitsResetWindows")} action={settings?.payment_enabled !== false && <Link className={buyClass} to="/purchase?tab=subscription">{t("subscriptions.buySubscription")}</Link>} /></Panel> : <Panel className="console-subscriptions-ledger">
      <div className="console-subscriptions-ledger-head"><h2>{t("subscriptions.subscriptionLedger")}</h2></div>
      <div className="console-subscriptions-table-wrap"><Table className="console-subscriptions-table" size="sm" borderStyle="solid" hoverableRows><LedgerHeader columns={ledgerColumns(locale, t)} /><TableBody>{state.items.map((subscription) => {
        const progress = state.progress[subscription.id] || {};
        const platform = subscription.group?.platform || "default";
        const status = String(subscription.status || "unknown").toLowerCase();
        const renewal = settings?.payment_enabled !== false && subscription.group_id && !["expired", "cancelled"].includes(status);
        const expiryWarning = remainingDays(subscription.expires_at, locale);
        return <TableRow key={subscription.id}><TableCell><div className={`console-subscription-plan is-${String(platform).toLowerCase()}`}><i className="console-platform-surface"><PlatformMark platform={platform} /></i><span><strong>{subscription.group?.name || `${t("subscriptions.title")} #${subscription.id}`}</strong><small>{subscription.group?.description}</small></span></div></TableCell><TableCell><StatusBadge status={status} label={statusLabel(status, locale)} /></TableCell><TableCell><strong>{subscription.expires_at ? formatDate(subscription.expires_at, { dateOnly: true }) : t("common.never")}</strong>{expiryWarning && <small className="console-subscription-expiry-warning">{expiryWarning}</small>}</TableCell><TableCell><strong>{Number(subscription.group?.rate_multiplier || 1).toFixed(1)}×</strong></TableCell><TableCell><QuotaCell progress={progress.daily} fallback={quotaFromSubscription(subscription, "daily")} formatCurrency={formatCurrency} locale={locale} /></TableCell><TableCell><QuotaCell progress={progress.weekly} fallback={quotaFromSubscription(subscription, "weekly")} formatCurrency={formatCurrency} locale={locale} /></TableCell><TableCell><QuotaCell progress={progress.monthly} fallback={quotaFromSubscription(subscription, "monthly")} formatCurrency={formatCurrency} locale={locale} /></TableCell><TableCell>{renewal ? <Link className={renewClass} to={`/purchase?tab=subscription&group=${subscription.group_id}`}>{t("subscriptions.renew")}<Icon name="external" size={15} /></Link> : <span>—</span>}</TableCell></TableRow>;
      })}</TableBody></Table></div>
      <footer><p><Icon name="info" size={15} />{t("subscriptions.quotaWindowsResetIndependently")}</p><div><span className="is-active">{t("subscriptions.active2")}</span><span className="is-suspended">{t("subscriptions.suspended")}</span><span className="is-expired">{t("subscriptions.expired")}</span></div></footer>
    </Panel>}
  </Page>;
}
