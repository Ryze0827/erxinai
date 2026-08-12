import { useCallback, useEffect, useRef, useState } from "react";
import { redeemApi } from "../../api";
import redeemGiftDark from "../../assets/console/redeem-gift-dark.png";
import redeemGiftLight from "../../assets/console/redeem-gift-light.png";
import redeemWalletDark from "../../assets/console/redeem-wallet-dark.png";
import redeemWalletLight from "../../assets/console/redeem-wallet-light.png";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, IconButton, Page, Panel, Spinner, TextInput } from "../UI";

function redeemType(item) {
  return item?.type || item?.code_type || "unknown";
}

function redeemTitle(item, locale) {
  const type = redeemType(item);
  const added = Number(item.value) >= 0;
  const labels = locale === "zh"
    ? { balance: "兑换码增加余额", admin_balance: added ? "管理员增加余额" : "管理员扣减余额", concurrency: "兑换码增加并发", admin_concurrency: added ? "管理员增加并发" : "管理员减少并发", subscription: "获得订阅" }
    : { balance: "Balance added by code", admin_balance: added ? "Balance added by administrator" : "Balance deducted by administrator", concurrency: "Concurrency added by code", admin_concurrency: added ? "Concurrency added by administrator" : "Concurrency reduced by administrator", subscription: "Subscription assigned" };
  return labels[type] || type.replaceAll("_", " ");
}

function redeemValue(item, locale, formatCurrency) {
  const type = redeemType(item);
  if (["balance", "admin_balance"].includes(type)) return `${Number(item.value) >= 0 ? "+" : ""}${formatCurrency(item.value)}`;
  if (type === "subscription") {
    const days = item.validity_days || Math.round(Number(item.value) || 0);
    const group = item.group?.name || item.group_name || "";
    return `${days} ${locale === "zh" ? "天" : "days"}${group ? ` · ${group}` : ""}`;
  }
  return `${Number(item.value) >= 0 ? "+" : ""}${item.value || 0} ${locale === "zh" ? "并发" : "concurrency"}`;
}

function RedemptionResult({ result, locale, formatCurrency, t }) {
  if (!result) return null;
  return <div className="console-result-card"><strong>{result.message || t("common.success")}</strong><span>{redeemValue(result, locale, formatCurrency)}</span>{result.new_balance !== undefined && <small>{locale === "zh" ? "新余额" : "New balance"}: {formatCurrency(result.new_balance)}</small>}{result.new_concurrency !== undefined && <small>{locale === "zh" ? "新并发" : "New concurrency"}: {result.new_concurrency}</small>}</div>;
}

function RedeemSummary({ user, history, locale, formatCurrency }) {
  const balance = Number(user?.balance) || 0;
  const concurrency = Number(user?.concurrency ?? user?.current_concurrency) || 0;
  const metrics = [
    [locale === "zh" ? "当前余额" : "Current balance", formatCurrency(balance)],
    [locale === "zh" ? "并发数" : "Concurrency", concurrency.toLocaleString(), locale === "zh" ? "请求" : "requests"],
    [locale === "zh" ? "可转返利额度" : "Transferable rebate", formatCurrency(user?.aff_quota || 0)],
    [locale === "zh" ? "历史返利额度" : "Historical rebate", formatCurrency(user?.aff_history_quota || 0)],
    [locale === "zh" ? "累计兑换次数" : "Total redemptions", history.length.toLocaleString()],
  ];
  return <section className="console-redeem-summary"><div className="console-redeem-summary-metrics">{metrics.map(([label, value, suffix]) => <div key={label}><small>{label}<Icon name="info" size={13} /></small><strong>{value}</strong>{suffix && <span>{suffix}</span>}</div>)}</div><picture className="console-redeem-wallet"><img className="is-light" src={redeemWalletLight} alt="" /><img className="is-dark" src={redeemWalletDark} alt="" /></picture></section>;
}

function RedeemForm({ code, setCode, busy, onSubmit, result, contact, locale, formatCurrency, t }) {
  const items = locale === "zh"
    ? [
      ["wallet", "余额", "增加账户可用余额。"],
      ["pulse", "并发数", "提高可同时发起的请求数量。"],
      ["calendar", "订阅", "解锁高级订阅与专属功能。"],
      ["gift", "试用权限", "获得免费试用天数和功能体验。"],
    ]
    : [
      ["wallet", "Balance", "Add funds to your account balance."],
      ["pulse", "Concurrency", "Increase the number of requests you can run."],
      ["calendar", "Subscription", "Unlock premium subscriptions and features."],
      ["gift", "Trial access", "Get free trial days and feature evaluations."],
    ];
  const supportHref = contact?.startsWith("http") ? contact : contact?.includes("@") ? `mailto:${contact}` : "";
  return <Panel className="console-redeem-entry"><div className="console-panel-body"><h2>{locale === "zh" ? "兑换码" : "Redeem a code"}</h2><p>{locale === "zh" ? "兑换余额、并发、订阅或试用权益。" : "Apply balance, concurrency, subscription, or trial benefits."}</p><form onSubmit={onSubmit}><div className="console-redeem-input"><TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("redeem.placeholder")} autoComplete="off" />{code && <IconButton className="console-redeem-clear" icon="close" label={locale === "zh" ? "清空兑换码" : "Clear code"} onClick={() => setCode("")} />}</div><Button type="submit" variant="primary" disabled={!code.trim() || busy}>{busy ? t("common.loading") : (locale === "zh" ? "立即兑换" : "Redeem now")}</Button></form><div className="console-redeem-security"><Icon name="shield" size={17} /><span>{locale === "zh" ? "兑换码仅可使用一次，并会立即生效。" : "Codes are single-use and applied instantly."}</span></div><RedemptionResult result={result} locale={locale} formatCurrency={formatCurrency} t={t} /><div className="console-redeem-divider" /><h3>{locale === "zh" ? "关于兑换码" : "About redemption codes"}</h3><div className="console-redeem-info-list">{items.map(([icon, label, description], index) => <div className={`is-tone-${index + 1}`} key={label}><i><Icon name={icon} size={18} /></i><span><strong>{label}</strong><small>{description}</small></span></div>)}</div><picture className="console-redeem-gift"><img className="is-light" src={redeemGiftLight} alt="" /><img className="is-dark" src={redeemGiftDark} alt="" /></picture><div className="console-redeem-support"><span>{locale === "zh" ? "需要帮助？" : "Need help?"}</span>{supportHref ? <a href={supportHref} target={supportHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{locale === "zh" ? "联系客服" : "Contact support"}<Icon name="external" size={13} /></a> : <span>{contact || (locale === "zh" ? "联系客服" : "Contact support")}</span>}</div></div></Panel>;
}

function RedeemHistory({ state, history, locale, formatCurrency, formatDate, load }) {
  let content = <div className="console-redeem-history-list">{history.map((item, index) => { const type = redeemType(item); const concurrency = type.includes("concurrency"); const subscription = type === "subscription"; return <div className={concurrency ? "is-concurrency" : subscription ? "is-subscription" : "is-balance"} key={item.id || `${item.code}-${index}`}><i><Icon name={concurrency ? "pulse" : subscription ? "calendar" : "wallet"} size={19} /></i><time>{formatDate(item.used_at || item.redeemed_at || item.created_at)}</time><code>{item.code || item.redeem_code || "—"}</code><span><strong>{redeemTitle(item, locale)}</strong>{(item.group?.name || item.group_name) && <small>{item.group?.name || item.group_name}</small>}</span><b>{redeemValue(item, locale, formatCurrency)}</b></div>; })}</div>;
  if (!history.length) content = <EmptyState icon="gift" />;
  if (state.loading) content = <Spinner />;
  else if (state.error) content = <ErrorState message={state.error} onRetry={load} />;
  return <Panel className="console-redeem-history"><div className="console-panel-body"><div className="console-redeem-history-head"><span><h2>{locale === "zh" ? "最近活动" : "Recent activity"}</h2><p>{locale === "zh" ? "来自兑换码和管理员调整的账户权益记录" : "Account benefits applied from codes and administrator adjustments"}</p></span><b>{history.length} {locale === "zh" ? "条记录" : "records"}</b></div>{content}</div></Panel>;
}

export function RedeemPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, notify, settings } = useConsole();
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
  return <Page title={t("redeem.title")}>
    <RedeemSummary user={user} history={history} locale={locale} formatCurrency={formatCurrency} />
    <div className="console-redeem-grid"><RedeemForm code={code} setCode={setCode} busy={state.busy} onSubmit={redeem} result={result} contact={settings?.contact_info} locale={locale} formatCurrency={formatCurrency} t={t} /><RedeemHistory state={state} history={history} locale={locale} formatCurrency={formatCurrency} formatDate={formatDate} load={load} /></div>
  </Page>;
}
