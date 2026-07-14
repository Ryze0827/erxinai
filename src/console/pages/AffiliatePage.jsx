import { useCallback, useEffect, useRef, useState } from "react";
import { userApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, CopyButton, DataTable, EmptyState, ErrorState, Page, Panel, Spinner, StatCard } from "../UI";

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
  if (state.loading) return <Page title={t("affiliate.title")}><Panel><Spinner /></Panel></Page>;
  if (state.error || !state.detail) return <Page title={t("affiliate.title")}><Panel><ErrorState message={state.error} onRetry={load} /></Panel></Page>;
  const detail = state.detail;
  const inviteLink = `${window.location.origin}/register?aff=${encodeURIComponent(detail.aff_code)}`;
  const columns = [
    { key: "email", label: t("profile.email") }, { key: "username", label: t("profile.username") },
    { key: "total_rebate", label: t("affiliate.lifetime"), render: (row) => formatCurrency(row.total_rebate), align: "right" },
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
  ];
  return <Page title={t("affiliate.title")} subtitle={t("affiliate.subtitle")} actions={<Button variant="primary" icon="dollar" onClick={transfer} disabled={state.busy || detail.aff_quota <= 0}>{state.busy ? t("common.loading") : t("affiliate.transfer")}</Button>}>
    <div className="console-stat-grid console-stat-grid--4"><StatCard label={t("affiliate.invited")} value={formatNumber(detail.aff_count)} icon="users" /><StatCard label={t("affiliate.available")} value={formatCurrency(detail.aff_quota)} icon="dollar" tone="green" /><StatCard label={t("affiliate.lifetime")} value={formatCurrency(detail.aff_history_quota)} icon="chart" tone="amber" /><StatCard label={t("affiliate.rate")} value={`${detail.effective_rebate_rate_percent || 0}%`} icon="gift" tone="rose" /></div>
    <Panel title={locale === "zh" ? "分享邀请" : "Share your invitation"}><div className="console-panel-body console-affiliate-links"><div><span>{t("affiliate.code")}</span><code>{detail.aff_code}</code><CopyButton value={detail.aff_code} label={t("common.copy")} /></div><div><span>{t("affiliate.link")}</span><code>{inviteLink}</code><CopyButton value={inviteLink} label={t("common.copy")} /></div><p>{locale === "zh" ? `邀请用户产生的有效消费将按 ${detail.effective_rebate_rate_percent || 0}% 累积返利，冻结返利为 ${formatCurrency(detail.aff_frozen_quota)}。` : `Eligible invitee spend earns ${detail.effective_rebate_rate_percent || 0}% rebate. ${formatCurrency(detail.aff_frozen_quota)} is currently pending.`}</p></div></Panel>
    <Panel title={locale === "zh" ? "邀请记录" : "Invitees"}><DataTable columns={columns} rows={detail.invitees || []} empty={<EmptyState icon="users" />} /></Panel>
  </Page>;
}
