import { useCallback, useEffect, useRef, useState } from "react";
import { redeemApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale, translate, formatNumberFor } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, Skeleton, TextInput } from "../UI";

function redeemType(item) {
  return item?.type || item?.code_type || "unknown";
}

function redeemTitle(item, locale) {
  const type = redeemType(item);
  const added = Number(item.value) >= 0;
  const labels = { balance: translate(locale, "redeem.balanceAddedCode"), admin_balance: (added ? translate(locale, "redeem.balanceAddedAdministrator") : translate(locale, "redeem.balanceDeductedAdministrator")), concurrency: translate(locale, "redeem.concurrencyAddedCode"), admin_concurrency: (added ? translate(locale, "redeem.concurrencyAddedAdministrator") : translate(locale, "redeem.concurrencyReducedAdministrator")), subscription: translate(locale, "redeem.subscriptionAssigned") };
  return labels[type] || type.replaceAll("_", " ");
}

function redeemValue(item, locale, formatCurrency) {
  const type = redeemType(item);
  if (["balance", "admin_balance"].includes(type)) return `${Number(item.value) >= 0 ? "+" : ""}${formatCurrency(item.value)}`;
  if (type === "subscription") {
    const days = item.validity_days || Math.round(Number(item.value) || 0);
    const group = item.group?.name || item.group_name || "";
    return `${translate(locale, "redeem.daysValue", { count: days })}${group ? ` · ${group}` : ""}`;
  }
  return translate(locale, "redeem.concurrencyValue", { value: `${Number(item.value) >= 0 ? "+" : ""}${item.value || 0}` });
}

function RedemptionResult({ result, locale, formatCurrency, t }) {
  if (!result) return null;
  return <div className="console-result-card"><strong>{result.message || t("common.success")}</strong><span>{redeemValue(result, locale, formatCurrency)}</span>{result.new_balance !== undefined && <small>{t("redeem.newBalanceValue", { value: formatCurrency(result.new_balance) })}</small>}{result.new_concurrency !== undefined && <small>{t("redeem.newConcurrencyValue", { value: result.new_concurrency })}</small>}</div>;
}

function RedeemSummary({ user, history, locale, formatCurrency }) {
  const balance = Number(user?.balance) || 0;
  const concurrency = Number(user?.concurrency ?? user?.current_concurrency) || 0;
  const metrics = [
    [translate(locale, "redeem.currentBalance"), formatCurrency(balance)],
    [translate(locale, "redeem.concurrency2"), formatNumberFor(locale, concurrency), translate(locale, "redeem.requests")],
    [translate(locale, "redeem.transferableRebate"), formatCurrency(user?.aff_quota || 0)],
    [translate(locale, "redeem.historicalRebate"), formatCurrency(user?.aff_history_quota || 0)],
    [translate(locale, "redeem.totalRedemptions"), formatNumberFor(locale, history.length)],
  ];
  return <section className="console-redeem-summary"><div className="console-redeem-summary-metrics">{metrics.map(([label, value, suffix]) => <div key={label}><small>{label}</small><strong>{value}</strong>{suffix && <span>{suffix}</span>}</div>)}</div></section>;
}

function RedeemForm({ code, setCode, busy, onSubmit, result, locale, formatCurrency, t }) {
  const items = [["wallet", t("common.balance"), t("redeem.addFundsAccountBalance")], ["pulse", t("redeem.concurrency2"), t("redeem.increaseNumberRequestsYou")], ["calendar", t("redeem.subscription"), t("redeem.unlockPremiumSubscriptionsFeatures")], ["gift", t("redeem.trialAccess"), t("redeem.getFreeTrialDays")]];
  return <Panel className="console-redeem-entry"><div className="console-panel-body"><h2>{t("redeem.title")}</h2><p>{t("redeem.applyBalanceConcurrencySubscription")}</p><form onSubmit={onSubmit}><div className="console-redeem-input"><TextInput clearable value={code} onChange={(event) => setCode(event.target.value)} onClear={() => setCode("")} placeholder={t("redeem.placeholder")} autoComplete="off" /></div><Button type="submit" variant="primary" disabled={!code.trim() || busy}>{busy ? t("common.loading") : t("redeem.redeemNow")}</Button></form><div className="console-redeem-security"><Icon name="shield" size={17} /><span>{t("redeem.codesSingleUseApplied")}</span></div><RedemptionResult result={result} locale={locale} formatCurrency={formatCurrency} t={t} /><div className="console-redeem-divider" /><h3>{t("redeem.aboutRedemptionCodes")}</h3><div className="console-redeem-info-list">{items.map(([icon, label, description], index) => <div className={`is-tone-${index + 1}`} key={label}><i><Icon name={icon} size={18} /></i><span><strong>{label}</strong><small>{description}</small></span></div>)}</div></div></Panel>;
}

function RedeemHistory({ state, history, locale, formatCurrency, formatDate, load }) {
  let content = <div className="console-redeem-history-list">{history.map((item, index) => { const type = redeemType(item); const concurrency = type.includes("concurrency"); const subscription = type === "subscription"; return <div className={concurrency ? "is-concurrency" : subscription ? "is-subscription" : "is-balance"} key={item.id || `${item.code}-${index}`}><i><Icon name={concurrency ? "pulse" : subscription ? "calendar" : "wallet"} size={19} /></i><time>{formatDate(item.used_at || item.redeemed_at || item.created_at)}</time><code>{item.code || item.redeem_code || "—"}</code><span><strong>{redeemTitle(item, locale)}</strong>{(item.group?.name || item.group_name) && <small>{item.group?.name || item.group_name}</small>}</span><b data-negative={Number(item.value) < 0 || undefined}>{redeemValue(item, locale, formatCurrency)}</b></div>; })}</div>;
  if (!history.length) content = <EmptyState icon="gift" />;
  if (state.loading && !history.length) content = <div className="console-redeem-history-list console-redeem-history-skeleton" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div key={index}><Skeleton /><Skeleton /><Skeleton /><span><Skeleton /></span><Skeleton /></div>)}</div>;
  else if (state.error && !history.length) content = <ErrorState message={state.error} onRetry={load} />;
  return <Panel className="console-redeem-history" aria-busy={state.loading}><div className="console-panel-body"><div className="console-redeem-history-head"><span><h2>{translate(locale, "redeem.recentActivity")}</h2><p>{translate(locale, "redeem.accountBenefitsAppliedFrom")}</p></span><b>{translate(locale, "redeem.recordCount", { count: history.length })}</b></div>{content}</div></Panel>;
}

export function RedeemPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, notify } = useConsole();
  const [code, setCode] = useState("");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", busy: false });
  const mountedRef = useRef(true);
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try { const data = await redeemApi.history(); if (mountedRef.current) { setHistory(Array.isArray(data) ? data : data.items || []); setState((current) => ({ ...current, loading: false })); } }
    catch (error) { if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, []);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);

  const redeem = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      const data = await redeemApi.redeem(code.trim());
      setResult(data); setCode(""); notify("success", data.message || t("common.success")); await Promise.allSettled([refreshUser(), load()]);
    } catch (error) { notify("error", error.message); } finally { setState((current) => ({ ...current, busy: false })); }
  };
  return <Page title={t("redeem.title")} className="console-redeem-page">
    <RedeemSummary user={user} history={history} locale={locale} formatCurrency={formatCurrency} />
    <div className="console-redeem-grid"><RedeemForm code={code} setCode={setCode} busy={state.busy} onSubmit={redeem} result={result} locale={locale} formatCurrency={formatCurrency} t={t} /><RedeemHistory state={state} history={history} locale={locale} formatCurrency={formatCurrency} formatDate={formatDate} load={load} /></div>
  </Page>;
}
