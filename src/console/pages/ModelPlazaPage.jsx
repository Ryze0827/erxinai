import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { flowpoolRequest } from "../../api/invoices";
import { GroupBadge } from "../GroupBadge";
import { useLocale } from "../i18n";
import { Button, EmptyState, Field, Page, Panel, SelectInput, Spinner, TextInput } from "../UI";
import "./modelPlaza.css";
import { modelRate, pricingRows } from "./modelPlazaPricing";

const labels = {
  zh: { input_price: "输入", output_price: "输出", cache_write_price: "缓存写入 5m", cache_write_1h_price: "缓存写入 1h", cache_read_price: "缓存读取", image_input_price: "图片输入", image_output_price: "图片输出", per_request_price: "每次请求" },
  en: { input_price: "Input", output_price: "Output", cache_write_price: "Cache write 5m", cache_write_1h_price: "Cache write 1h", cache_read_price: "Cache read", image_input_price: "Image input", image_output_price: "Image output", per_request_price: "Per request" },
};

function Prices({ pricing, rate = 1, locale, tier }) {
  const token = !pricing.billing_mode || pricing.billing_mode === "token";
  const money = (field, value) => new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 8 }).format(value * rate * (token && field !== "per_request_price" ? 1e6 : 1));
  return <div className="console-pricing-list">{pricingRows(pricing, tier).map(([field, value]) => <span key={field}><small>{labels[locale === "zh" ? "zh" : "en"][field]}</small><strong>{money(field, value)}</strong></span>)}</div>;
}

function ModelCard({ model, group, locale }) {
  const zh = locale === "zh";
  const pricing = model.pricing;
  const rate = modelRate(group, model);
  const token = !pricing?.billing_mode || pricing.billing_mode === "token";
  const tiers = pricing?.intervals || [];
  const effectiveTiers = token && !group.long_context_pricing_enabled ? [] : tiers;
  return <div className="plaza-model">
    <div className="plaza-model-title"><strong className="break-all">{model.name}</strong><span>{model.platform}</span></div>
    <p className="console-muted">{token ? "USD / 1M tokens" : pricing.billing_mode === "image" ? (zh ? "USD / 张" : "USD / image") : (zh ? "USD / 次" : "USD / request")} · {rate}×</p>
    {pricing ? <><h4>{zh ? "标准时段实付价" : "Standard period price"}</h4><Prices pricing={pricing} rate={rate} locale={locale} tier={token && !group.long_context_pricing_enabled ? tiers[0] : null} />
      {effectiveTiers.map((tier, index) => <div key={index}><p>{tier.tier_label || `(${tier.min_tokens ?? 0}, ${tier.max_tokens ?? "∞"}] tokens`}</p><Prices pricing={pricing} tier={tier} rate={rate} locale={locale} /></div>)}
      {effectiveTiers.length > 0 && <p className="console-muted">{model.long_context_basis === "marginal" ? (zh ? "超出阈值部分按阶梯价计费" : "Marginal tier pricing") : (zh ? "整单按所在档计价" : "Whole-request tier pricing")}</p>}
      {Object.entries(pricing.reasoning_effort_multipliers || {}).map(([effort, multiplier]) => <p key={effort}>{effort}: {multiplier}×</p>)}
    </> : <p>{zh ? "暂无定价" : "Pricing unavailable"}</p>}
    {model.time_pricing && <p className="console-muted">{model.time_pricing.timezone} {model.time_pricing.weekdays_only ? (zh ? "仅工作日" : "Weekdays only") : ""} · {model.time_pricing.periods.map((period) => `${period.start_time}–${period.end_time}: ${period.multiplier}×`).join(" · ")}</p>}
    {model.official_pricing && <><h4>{zh ? "官方参考价（USD / 1M tokens）" : "Official reference (USD / 1M tokens)"}</h4><Prices pricing={model.official_pricing} locale={locale} />{(model.official_pricing.intervals || []).map((tier, index) => <div key={index}><p>{tier.tier_label || `(${tier.min_tokens ?? 0}, ${tier.max_tokens ?? "∞"}] tokens`}</p><Prices pricing={model.official_pricing} tier={tier} locale={locale} /></div>)}</>}
  </div>;
}

export function ModelPlazaPage() {
  const { t, locale } = useLocale();
  const zh = locale === "zh";
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
    <header className="plaza-intro"><div><h2>{zh ? "探索可用模型" : "Explore available models"}</h2><p>{zh ? "按分组浏览模型，比较价格，找到适合你的选择。" : "Browse models by group and compare pricing."}</p></div><Button icon="refresh" onClick={load} loading={loading}>{t("common.refresh")}</Button></header>
    {data?.description && <Panel><div className="console-panel-body break-words"><ReactMarkdown>{data.description}</ReactMarkdown></div></Panel>}
    <Panel className="plaza-filters"><div className="plaza-filter-fields"><Field label={t("common.search")} className="is-wide"><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={zh ? "搜索分组或模型" : "Search groups or models"} /></Field><Field label={t("channels.platform")}><SelectInput value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">{t("common.all")}</option>{platforms.map((value) => <option key={value}>{value}</option>)}</SelectInput></Field></div></Panel>
    {loading ? <Panel className="plaza-state"><div className="plaza-loading" role="status"><Spinner /><p>{zh ? "正在加载模型与价格…" : "Loading models and pricing…"}</p></div></Panel> : error ? <Panel className="plaza-state"><div role="alert"><EmptyState icon="channelNetwork" title={zh ? "暂时无法加载模型" : "Models are temporarily unavailable"} description={error === "NETWORK_ERROR" ? (zh ? "无法连接模型服务，请稍后重试。" : "Unable to connect to the model service. Please try again shortly.") : error} action={<Button icon="refresh" onClick={load}>{t("common.retry")}</Button>} /></div></Panel> : data?.enabled === false ? <Panel className="plaza-state"><EmptyState icon="channelNetwork" title={zh ? "模型广场尚未开放" : "Model plaza is not available yet"} description={zh ? "开放后，你可以在这里浏览可用模型与价格。" : "Available models and pricing will appear here once enabled."} /></Panel> : !visible.length ? <Panel className="plaza-state"><EmptyState icon="channelNetwork" title={zh ? "暂无匹配的模型" : "No matching models"} description={zh ? "尝试调整搜索关键词或平台筛选。" : "Try another search or platform filter."} /></Panel> : <div className="console-channel-list">{visible.map((group) => <Panel key={group.id} className="console-channel-card"><div className="console-panel-body"><div className="console-channel-head"><div><h3>{group.name}</h3><p>{group.description}</p></div><GroupBadge name={group.subscription_type === "subscription" ? "SUB" : group.platform} platform={group.platform} detail={`${group.user_rate_multiplier ?? group.rate_multiplier}×`} /></div>{group.peak_rate_enabled && <p className="console-muted">{zh ? "高峰时段" : "Peak period"}: {group.peak_start}–{group.peak_end} · {group.peak_rate_multiplier}×</p>}<div className="console-model-cards">{group.models.map((model) => <ModelCard key={`${model.platform}:${model.name}`} model={model} group={group} locale={locale} />)}</div></div></Panel>)}</div>}
  </Page>;
}
