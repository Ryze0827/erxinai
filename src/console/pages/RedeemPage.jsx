import { useCallback, useEffect, useRef, useState } from "react";
import { redeemApi } from "../../api";
import redeemGiftDark from "../../assets/console/redeem-gift-dark.png";
import redeemGiftLight from "../../assets/console/redeem-gift-light.png";
import redeemWalletDark from "../../assets/console/redeem-wallet-dark.png";
import redeemWalletLight from "../../assets/console/redeem-wallet-light.png";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, Spinner, TextInput } from "../UI";

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
    ["user", locale === "zh" ? "可转返利额度" : "Transferable rebate", formatCurrency(user?.aff_quota || 0)],
    ["clock", locale === "zh" ? "历史返利额度" : "Historical rebate", formatCurrency(user?.aff_history_quota || 0)],
    ["gift", locale === "zh" ? "累计兑换次数" : "Total redemptions", `${history.length} ${locale === "zh" ? "次" : ""}`],
  ];
  return <section className="console-redeem-summary"><div className="console-redeem-summary-balance"><span>{locale === "zh" ? "当前余额" : "Current balance"}</span><strong>{formatCurrency(balance)}</strong><small>{locale === "zh" ? "并发数" : "Concurrency"}：<b>{concurrency}</b> {locale === "zh" ? "请求" : "requests"}</small></div><div className="console-redeem-summary-metrics">{metrics.map(([icon, label, value]) => <div key={label}><i><Icon name={icon} size={22} /></i><span><small>{label}</small><strong>{value}</strong></span></div>)}</div><picture className="console-redeem-wallet"><img className="is-light" src={redeemWalletLight} alt="" /><img className="is-dark" src={redeemWalletDark} alt="" /></picture></section>;
}

function RedeemForm({ code, setCode, busy, onSubmit, result, locale, formatCurrency, t }) {
  return <Panel className="console-redeem-entry"><div className="console-panel-body"><h2>{locale === "zh" ? "兑换码" : "Redemption code"}</h2><p>{locale === "zh" ? "输入兑换码，快速兑换余额或并发数" : "Enter a code to redeem balance or concurrency."}</p><form onSubmit={onSubmit}><div className="console-redeem-input"><Icon name="gift" size={21} /><TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("redeem.placeholder")} autoComplete="off" />{code && <button type="button" aria-label={locale === "zh" ? "清空兑换码" : "Clear code"} onClick={() => setCode("")}><Icon name="close" size={15} /></button>}</div><Button type="submit" variant="primary" icon="gift" disabled={!code.trim() || busy}>{busy ? t("common.loading") : t("redeem.action")}</Button></form><RedemptionResult result={result} locale={locale} formatCurrency={formatCurrency} t={t} /></div></Panel>;
}

function RedeemInfo({ contact, locale }) {
  const items = locale === "zh"
    ? ["每个兑换码只能使用一次", "兑换码可以增加余额、并发数或试用权限", contact ? `如有兑换问题，请联系 ${contact}` : "如有兑换问题，请联系客服", "余额和并发数即时更新"]
    : ["Each code can only be used once", "Codes can add balance, concurrency, or trial access", contact ? `For help, contact ${contact}` : "Contact support if you have any issues", "Balance and concurrency update immediately"];
  return <Panel className="console-redeem-about"><div className="console-panel-body"><h2>{locale === "zh" ? "关于兑换码" : "About codes"}</h2><div className="console-redeem-info-list">{items.map((item) => <p key={item}><i><Icon name="circleCheck" size={17} /></i><span>{item}</span></p>)}</div><picture className="console-redeem-gift"><img className="is-light" src={redeemGiftLight} alt="" /><img className="is-dark" src={redeemGiftDark} alt="" /></picture></div></Panel>;
}

function RedeemHistory({ state, history, locale, formatCurrency, formatDate, load }) {
  let content = <div className="console-redeem-history-list">{history.map((item, index) => <div key={item.id || `${item.code}-${index}`}><i className={redeemType(item).includes("concurrency") ? "is-concurrency" : ""}><Icon name={redeemType(item).includes("concurrency") ? "users" : "dollar"} size={20} /></i><span><strong>{redeemTitle(item, locale)}</strong></span><time>{formatDate(item.used_at || item.redeemed_at || item.created_at)}</time><p>{locale === "zh" ? "使用兑换码" : "Used code"} <code>{item.code || item.redeem_code || "—"}</code> {item.notes || item.message || ""}</p><b>{redeemValue(item, locale, formatCurrency)}</b></div>)}</div>;
  if (!history.length) content = <EmptyState icon="gift" />;
  if (state.loading) content = <Spinner />;
  else if (state.error) content = <ErrorState message={state.error} onRetry={load} />;
  return <Panel className="console-redeem-history"><div className="console-panel-body"><h2>{locale === "zh" ? "最近活动" : "Recent activity"}</h2>{content}</div></Panel>;
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
    <div className="console-grid console-grid--2 console-redeem-grid"><RedeemForm code={code} setCode={setCode} busy={state.busy} onSubmit={redeem} result={result} locale={locale} formatCurrency={formatCurrency} t={t} /><RedeemInfo contact={settings?.contact_info} locale={locale} /></div>
    <RedeemHistory state={state} history={history} locale={locale} formatCurrency={formatCurrency} formatDate={formatDate} load={load} />
  </Page>;
}
