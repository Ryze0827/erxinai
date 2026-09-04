import { useCallback, useEffect, useState } from "react";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { AlertTitle } from "@appica/ui-react/alert";
import { membershipApi } from "../../api";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { ErrorState, Page, Panel, ProgressBar, Skeleton, StatusBadge } from "../UI";

function percentLabel(value, locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 4,
  }).format(Number(value) || 0);
}

function MembershipLoading({ title }) {
  return <Page title={title}><Panel><div className="grid gap-6 p-6 lg:grid-cols-2"><div className="space-y-4"><Skeleton className="h-7 w-32" /><Skeleton className="h-12 w-48" /><Skeleton className="h-3 w-full" /></div><div className="grid grid-cols-2 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div></Panel><Panel><div className="space-y-3 p-6">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-16" key={index} />)}</div></Panel></Page>;
}

export function MembershipPage() {
  const { t, locale, formatUsd } = useLocale();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await membershipApi.me(signal);
      if (!signal?.aborted) setState({ loading: false, data, error: "" });
    } catch (error) {
      if (!signal?.aborted) setState({ loading: false, data: null, error: error.message });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (state.loading && !state.data) return <MembershipLoading title={t("membership.title")} />;
  if (state.error || !state.data) return <Page title={t("membership.title")}><Panel><ErrorState message={state.error} onRetry={() => load()} /></Panel></Page>;

  const membership = state.data;
  const current = membership.current_level;
  const next = membership.next_level;
  return <Page title={t("membership.title")}>
    {membershipApi.isMock && <Alert variant="info" role="note"><AlertIcon><Icon name="info" size={18} /></AlertIcon><AlertTitle>{t("membership.mockTitle")}</AlertTitle><AlertDescription>{t("membership.mockDescription")}</AlertDescription></Alert>}
    <Panel className="overflow-hidden">
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
        <div className="min-w-0 space-y-5">
          <div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary-muted text-secondary-emphasis"><Icon name="gift" size={24} aria-hidden="true" /></span><div className="min-w-0"><StatusBadge status="active" label={current.name} /><h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground-intense">{t("membership.currentLevel")}</h2><p className="mt-1 text-sm text-foreground-muted">{current.description || t("membership.defaultDescription")}</p></div></div>
          <div className="space-y-2"><div className="flex items-center justify-between gap-4 text-sm"><span className="text-foreground-muted">{next ? t("membership.progressTo", { level: next.name }) : t("membership.topLevel")}</span><strong className="tabular-nums text-foreground-intense">{percentLabel(membership.progress_percent, locale)}%</strong></div><ProgressBar value={membership.progress_percent} />{next && <p className="text-sm text-foreground-muted">{t("membership.remaining", { amount: formatUsd(membership.amount_to_next_level) })}</p>}</div>
        </div>
        <dl className="grid grid-cols-1 gap-3 self-stretch sm:grid-cols-2"><div className="min-w-0 rounded-xl border border-border-muted bg-background-muted p-4"><dt className="text-sm text-foreground-muted">{t("membership.totalRecharged")}</dt><dd className="mt-3 truncate text-2xl font-semibold tabular-nums text-foreground-intense">{formatUsd(membership.total_recharged)}</dd></div><div className="min-w-0 rounded-xl border border-border-muted bg-background-muted p-4"><dt className="text-sm text-foreground-muted">{t("membership.bonusRate")}</dt><dd className="mt-3 truncate text-2xl font-semibold tabular-nums text-foreground-intense">{percentLabel(current.bonus_percent, locale)}%</dd></div></dl>
      </div>
    </Panel>
    <Panel title={t("membership.milestones")} eyebrow={t("membership.milestonesEyebrow")}>
      <div className="divide-y divide-border-muted px-6">{membership.levels.map((level) => {
        const reached = Number(membership.total_recharged) >= Number(level.threshold);
        const active = level.id === current.id;
        return <div className="flex items-center gap-4 py-5" key={level.id}><span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${reached ? "bg-success-muted text-success-emphasis" : "bg-background-muted text-foreground-muted"}`}><Icon name={reached ? "check" : "clock"} size={18} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-foreground-intense">{level.name}</strong>{active && <StatusBadge status="active" size="sm" label={t("membership.current")} />}</div><p className="mt-1 text-sm text-foreground-muted">{t("membership.threshold", { amount: formatUsd(level.threshold) })} · {t("membership.bonusValue", { percent: percentLabel(level.bonus_percent, locale) })}</p></div><span className="shrink-0 text-sm font-medium text-foreground-muted">{reached ? t("membership.reached") : t("membership.notReached")}</span></div>;
      })}</div>
    </Panel>
  </Page>;
}
