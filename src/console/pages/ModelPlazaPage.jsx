import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { flowpoolRequest } from "../../api/invoices";
import { GroupBadge } from "../GroupBadge";
import { formatCurrencyFor, translate, useLocale } from "../i18n";
import { Button, EmptyState, Field, Page, Panel, SelectInput, Spinner, TextInput } from "../UI";
import "./modelPlaza.css";
import { modelRate, priceEntries } from "./modelPlazaPricing";

const isPerMillion = (pricing, field) => (!pricing.billing_mode || pricing.billing_mode === "token") && field !== "per_request_price";

function priceFormat(pricing, locale) {
  return (field, value) => formatCurrencyFor(locale, isPerMillion(pricing, field) ? value * 1e6 : value, "USD", { maximumFractionDigits: 8 });
}

function Price({ entry, format, pricing, locale }) {
  const unit = translate(locale, isPerMillion(pricing, entry.field) ? "plaza.unit.mTokens" : pricing.billing_mode === "image" ? "plaza.unit.image" : "plaza.unit.request");
  return <span className="plaza-card-price">
    {entry.original != null && <del title={translate(locale, "plaza.beforeRateDiscount")}>{format(entry.field, entry.original)}</del>}
    <span>{format(entry.field, entry.value)}<small>{unit}</small></span>
  </span>;
}

function Section({ title, children }) {
  return <section className="plaza-card-section"><h5>{title}</h5><dl>{children}</dl></section>;
}

function Row({ label, children }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

function ModelCard({ model, group, locale }) {
  const pricing = model.pricing;
  const rate = modelRate(group, model);
  const token = !pricing?.billing_mode || pricing.billing_mode === "token";
  const tiers = pricing?.intervals || [];
  const efforts = Object.entries(pricing?.reasoning_effort_multipliers || {});
  const format = pricing ? priceFormat(pricing, locale) : null;
  const rows = (entries) => entries.map((entry) => <Row key={entry.field} label={translate(locale, `plaza.price.${entry.field}`)}><Price entry={entry} format={format} pricing={pricing} locale={locale} /></Row>);
  const timePricing = model.time_pricing;
  return <article className="plaza-card">
    <header className="plaza-card-head">
      <div>
        <h4 className="plaza-card-name">{model.name}</h4>
        <p className="plaza-card-platform">{model.platform}</p>
      </div>
      <span className="plaza-card-rate" data-discount={rate < 1}>{translate(locale, "plaza.rateValue", { rate })}</span>
    </header>
    {pricing ? <>
      <Section title={translate(locale, "plaza.standardPeriodPrice")}>{rows(priceEntries(pricing, { rate, tier: token && !group.long_context_pricing_enabled ? tiers[0] : null }))}</Section>
      {efforts.length > 0 && <Section title={translate(locale, "plaza.reasoningEffortMultiplier")}>{efforts.map(([effort, multiplier]) => <Row key={effort} label={effort}>{multiplier}×</Row>)}</Section>}
    </> : <p className="plaza-card-empty">{translate(locale, "plaza.pricingUnavailable")}</p>}
    {timePricing && <Section title={translate(locale, "plaza.timeBasedRates")}>
      <Row label={translate(locale, "plaza.timezone")}>{timePricing.timezone}</Row>
      {timePricing.weekdays_only && <Row label={translate(locale, "plaza.days")}>{translate(locale, "plaza.weekdaysOnly")}</Row>}
      {timePricing.periods.map((period) => <Row key={`${period.start_time}-${period.end_time}`} label={`${period.start_time}–${period.end_time}`}>{period.multiplier}×</Row>)}
    </Section>}
  </article>;
}

export function ModelPlazaPage() {
  const { t, locale } = useLocale();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const request = useRef(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError("");
    try {
      const result = await flowpoolRequest("/catalog", { service: "model-plaza-user", signal: controller.signal });
      if (!controller.signal.aborted) setData(result);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof TypeError ? "NETWORK_ERROR" : cause.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => request.current?.abort(); }, [load]);
  const groups = data?.groups || [];
  const platforms = [...new Set(groups.flatMap((group) => group.models.map((model) => model.platform)))];
  const query = search.trim().toLowerCase();
  const visible = groups.map((group) => ({ ...group, models: group.models.filter((model) => (!platform || model.platform === platform) && `${group.name} ${model.name}`.toLowerCase().includes(query)) })).filter((group) => group.models.length);
  return <Page title={t("nav.modelPlaza")} className="console-channels-page plaza-page">
    <header className="plaza-intro"><div><h2>{t("plaza.exploreAvailableModels")}</h2><p>{t("plaza.browseModelsGroupCompare")}</p></div><Button icon="refresh" onClick={load} loading={loading}>{t("common.refresh")}</Button></header>
    {data?.description && <Panel><div className="console-panel-body break-words"><ReactMarkdown>{data.description}</ReactMarkdown></div></Panel>}
    <Panel className="plaza-filters"><div className="plaza-filter-fields"><Field label={t("common.search")} className="is-wide"><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("plaza.searchGroupsModels")} /></Field><Field label={t("channels.platform")}><SelectInput value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">{t("common.all")}</option>{platforms.map((value) => <option key={value}>{value}</option>)}</SelectInput></Field></div></Panel>
    {loading ? <Panel className="plaza-state"><div className="plaza-loading" role="status"><Spinner /><p>{t("plaza.loadingModelsPricing")}</p></div></Panel> : error ? <Panel className="plaza-state"><div role="alert"><EmptyState icon="cube" title={t("plaza.modelsTemporarilyUnavailable")} description={error === "NETWORK_ERROR" ? t("plaza.unableConnectModelService") : error} action={<Button icon="refresh" onClick={load}>{t("common.retry")}</Button>} /></div></Panel> : data?.enabled === false ? <Panel className="plaza-state"><EmptyState icon="cube" title={t("plaza.modelPlazaNotAvailable")} description={t("plaza.availableModelsPricingWill")} /></Panel> : !visible.length ? <Panel className="plaza-state"><EmptyState icon="cube" title={t("plaza.noMatchingModels")} description={t("plaza.tryAnotherSearchPlatform")} /></Panel> : <div className="console-channel-list">{visible.map((group) => <Panel key={group.id} className="console-channel-card"><div className="console-panel-body"><div className="plaza-group-head"><div><div className="plaza-group-title-row"><h3>{group.name}</h3><span>{t("plaza.modelCount", { count: group.models.length })}</span></div>{group.description && <p>{group.description}</p>}</div><GroupBadge name={group.subscription_type === "subscription" ? "SUB" : group.platform} platform={group.platform} detail={`${group.user_rate_multiplier ?? group.rate_multiplier}×`} /></div>{group.peak_rate_enabled && <p className="plaza-peak-note"><span>{t("plaza.peakPeriod")}</span>{group.peak_start}–{group.peak_end} · {group.peak_rate_multiplier}×</p>}<div className="plaza-card-grid">{group.models.map((model) => <ModelCard key={`${model.platform}:${model.name}`} model={model} group={group} locale={locale} />)}</div></div></Panel>)}</div>}
  </Page>;
}
