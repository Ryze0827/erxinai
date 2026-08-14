import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { userApi } from "../../api";
import affiliateBalanceDark from "../../assets/console/affiliate-balance-dark.png";
import affiliateBalanceLight from "../../assets/console/affiliate-balance-light.png";
import affiliateInviteDark from "../../assets/console/affiliate-invite-dark.png";
import affiliateInviteLight from "../../assets/console/affiliate-invite-light.png";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, CopyButton, DataTable, EmptyState, ErrorState, Page, Panel, Skeleton, TableSkeleton } from "../UI";

function AffiliateBalance({ detail, busy, transfer, locale, formatCurrency, formatNumber }) {
  const metrics = [
    ["clock", locale === "zh" ? "待结算返利" : "Pending rebate", locale === "zh" ? "等待结算" : "Awaiting clearance", formatCurrency(detail.aff_frozen_quota), "amber"],
    ["wallet", locale === "zh" ? "累计返利" : "Lifetime rebate", "", formatCurrency(detail.aff_history_quota), "green"],
    ["dollar", locale === "zh" ? "有效比例" : "Effective rate", "", `${detail.effective_rebate_rate_percent || 0}%`, "accent"],
    ["users", locale === "zh" ? "已邀请用户" : "Invited users", "", formatNumber(detail.aff_count), "default"],
  ];
  return <Panel className="console-affiliate-balance"><div className="console-panel-body"><h2>{locale === "zh" ? "返利余额" : "Rebate balance"}</h2><span className="console-affiliate-kicker">{locale === "zh" ? "可转入余额" : "Available to transfer"}</span><strong className="console-affiliate-balance-value">{formatCurrency(detail.aff_quota)}</strong><p>{locale === "zh" ? "已结算返利可转入你的 WayX 账户余额。" : "Cleared rebate ready to move into your WayX balance."}</p><Button variant="primary" onClick={transfer} disabled={busy || detail.aff_quota <= 0}>{busy ? (locale === "zh" ? "转入中" : "Transferring") : (locale === "zh" ? "全部转入余额" : "Transfer all to balance")}</Button><small className="console-affiliate-transfer-note">{locale === "zh" ? "将转入全部可用金额。" : "Transfers the full available amount."}</small><div className="console-affiliate-metrics">{metrics.map(([icon, label, hint, value, tone]) => <div className={`is-${tone}`} key={label}><i><Icon name={icon} size={20} /></i><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><b>{value}</b></div>)}</div><picture className="console-affiliate-balance-art"><img className="is-light" src={affiliateBalanceLight} alt="" /><img className="is-dark" src={affiliateBalanceDark} alt="" /></picture></div></Panel>;
}

function AffiliateShare({ detail, inviteLink, locale, t }) {
  const rate = detail.effective_rebate_rate_percent || 0;
  const steps = locale === "zh"
    ? [["link", "分享", "分享邀请链接或邀请码。"], ["users", "好友加入", "对方通过你的邀请完成注册。"], ["dollar", `有效消费返 ${rate}%`, `有效消费可获得 ${rate}% 返利。`]]
    : [["link", "Share", "Share your link or code."], ["users", "They join", "They sign up with your invite."], ["dollar", `Eligible spend earns ${rate}%.`, `You earn ${rate}% rebate on eligible spend.`]];
  return <Panel className="console-affiliate-share"><div className="console-panel-body"><h2>{locale === "zh" ? "分享邀请" : "Share your invitation"}</h2><p>{locale === "zh" ? "邀请朋友，在他们消费时获得返利。" : "Invite people. Earn when they spend."}</p><div className="console-affiliate-links"><label><span>{t("affiliate.link")}</span><div><code>{inviteLink}</code><CopyButton value={inviteLink} label={locale === "zh" ? "复制链接" : "Copy link"} /></div></label><label><span>{t("affiliate.code")}</span><div><code>{detail.aff_code}</code><CopyButton value={detail.aff_code} label={locale === "zh" ? "复制邀请码" : "Copy code"} /></div></label></div><picture className="console-affiliate-invite-art"><img className="is-light" src={affiliateInviteLight} alt="" /><img className="is-dark" src={affiliateInviteDark} alt="" /></picture><div className="console-affiliate-steps">{steps.map(([icon, label, description], index) => <div key={label}><b>{index + 1}</b><i><Icon name={icon} size={24} /></i><span><strong>{label}</strong><small>{description}</small></span>{index < steps.length - 1 && <Icon className="console-affiliate-step-arrow" name="chevronRight" size={18} />}</div>)}</div></div></Panel>;
}

function AffiliateLoading({ title }) {
  return <Page title={title} className="console-affiliate-page console-affiliate-loading"><div className="console-affiliate-layout" aria-hidden="true">
    <Panel className="console-affiliate-balance"><div className="console-panel-body"><Skeleton className="console-affiliate-skeleton-heading" /><Skeleton className="console-affiliate-skeleton-kicker" /><Skeleton className="console-affiliate-skeleton-value" /><Skeleton className="console-affiliate-skeleton-copy" /><Skeleton className="console-affiliate-skeleton-button" /><Skeleton className="console-affiliate-skeleton-note" /><div className="console-affiliate-metrics">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton /><span><Skeleton /><Skeleton /></span><Skeleton /></div>)}</div><Skeleton className="console-affiliate-balance-art" /></div></Panel>
    <div className="console-affiliate-main"><Panel className="console-affiliate-share"><div className="console-panel-body"><Skeleton className="console-affiliate-skeleton-heading" /><Skeleton className="console-affiliate-skeleton-copy" /><div className="console-affiliate-links">{Array.from({ length: 2 }, (_, index) => <label key={index}><Skeleton /><div><Skeleton /><Skeleton /></div></label>)}</div><Skeleton className="console-affiliate-invite-art" /><div className="console-affiliate-steps">{Array.from({ length: 3 }, (_, index) => <div key={index}><Skeleton /><Skeleton /><span><Skeleton /><Skeleton /></span></div>)}</div></div></Panel><Panel className="console-affiliate-invitees"><div className="console-panel-body"><div className="console-affiliate-invitees-head"><Skeleton className="console-affiliate-skeleton-heading" /><Skeleton className="console-affiliate-skeleton-copy" /></div><TableSkeleton columns={4} rows={3} pagination={false} /></div></Panel></div>
  </div></Page>;
}

export function AffiliatePage() {
  const { t, locale, formatCurrency, formatDate, formatNumber } = useLocale();
  const { notify, refreshUser } = useConsole();
  const [state, setState] = useState({ loading: true, error: "", detail: null, busy: false });
  const mountedRef = useRef(true);
  const load = useCallback(async (silent = false) => {
    if (!silent) setState((current) => ({ ...current, loading: true, error: "" }));
    try { const detail = await userApi.getAffiliate(); if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: "", detail })); }
    catch (error) { if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, []);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);
  const transfer = async () => {
    setState((current) => ({ ...current, busy: true }));
    try { const result = await userApi.transferAffiliate(); notify("success", locale === "zh" ? `已转入 ${formatCurrency(result.transferred_quota)}` : `${formatCurrency(result.transferred_quota)} transferred.`); await Promise.allSettled([load(true), refreshUser()]); }
    catch (error) { notify("error", error.message); } finally { setState((current) => ({ ...current, busy: false })); }
  };
  if (state.loading) return <AffiliateLoading title={t("affiliate.title")} />;
  if (state.error || !state.detail) return <Page title={t("affiliate.title")}><Panel><ErrorState message={state.error} onRetry={load} /></Panel></Page>;
  const detail = state.detail;
  const inviteLink = `${window.location.origin}/register?aff=${encodeURIComponent(detail.aff_code)}`;
  const columns = [
    { key: "username", label: locale === "zh" ? "用户" : "User", render: (row) => { const name = row.username || row.display_name || row.email?.split("@")[0] || "—"; return <span className="flex items-center gap-2"><Avatar size={32}><AvatarFallback>{String(name).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><strong>{name}</strong></span>; } },
    { key: "email", label: t("profile.email") },
    { key: "created_at", label: locale === "zh" ? "加入时间" : "Joined", render: (row) => formatDate(row.created_at, { dateOnly: true }) },
    { key: "total_rebate", label: t("affiliate.lifetime"), render: (row) => <strong className="console-affiliate-rebate">{formatCurrency(row.total_rebate)}</strong>, align: "right" },
  ];
  return <Page title={t("affiliate.title")} className="console-affiliate-page"><div className="console-affiliate-layout"><AffiliateBalance detail={detail} busy={state.busy} transfer={transfer} locale={locale} formatCurrency={formatCurrency} formatNumber={formatNumber} /><div className="console-affiliate-main"><AffiliateShare detail={detail} inviteLink={inviteLink} locale={locale} t={t} /><Panel className="console-affiliate-invitees"><div className="console-panel-body"><div className="console-affiliate-invitees-head"><h2>{locale === "zh" ? "已邀请用户" : "Invited users"}</h2><p>{locale === "zh" ? "展示账户最近邀请的最多 100 位用户" : "Up to 100 recent invitees returned by your account"}</p></div><DataTable className="console-affiliate-table" columns={columns} rows={detail.invitees || []} empty={<EmptyState icon="users" />} /></div></Panel></div></div>
  </Page>;
}
