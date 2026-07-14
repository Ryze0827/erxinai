import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { channelsApi, groupsApi } from "../../api";
import { GroupBadge } from "../GroupBadge";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Field, Page, Panel, SelectInput, Spinner, StatusBadge, TextInput } from "../UI";

function formatPrice(value, locale, scale = 1) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(Number(value) * scale);
}

function Pricing({ pricing, locale }) {
  if (!pricing) return <span className="console-muted">—</span>;
  const labels = locale === "zh"
    ? { input: "输入 / M", output: "输出 / M", write: "缓存写入 / M", read: "缓存读取 / M", request: "每次请求", image: "每张图片", tiers: "阶梯价格" }
    : { input: "Input / M", output: "Output / M", write: "Cache write / M", read: "Cache read / M", request: "Per request", image: "Per image", tiers: "Pricing tiers" };
  const tokenMode = pricing.billing_mode === "token";
  const rows = tokenMode
    ? [[labels.input, pricing.input_price, 1e6], [labels.output, pricing.output_price, 1e6], [labels.write, pricing.cache_write_price, 1e6], [labels.read, pricing.cache_read_price, 1e6], [labels.image, pricing.image_output_price, 1e6]]
    : [[pricing.billing_mode === "image" ? labels.image : labels.request, pricing.billing_mode === "image" ? pricing.image_output_price : pricing.per_request_price, 1]];
  const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined);
  const tiers = (pricing.intervals || []).map((interval, index) => {
    const range = interval.tier_label || `(${interval.min_tokens ?? 0}, ${interval.max_tokens ?? "∞"}]`;
    const value = tokenMode
      ? `${formatPrice(interval.input_price, locale, 1e6)} / ${formatPrice(interval.output_price, locale, 1e6)}`
      : formatPrice(interval.per_request_price, locale);
    return <span key={`${range}-${index}`}><small>{range}</small><strong>{value}</strong></span>;
  });
  return <div className="console-pricing-list">{visibleRows.map(([label, value, scale]) => <span key={label}><small>{label}</small><strong>{formatPrice(value, locale, scale)}</strong></span>)}{tiers.length > 0 && <div className="console-pricing-tiers"><em>{labels.tiers}</em>{tiers}</div>}</div>;
}

export function ChannelsPage() {
  const { t, locale } = useLocale();
  const [channels, setChannels] = useState([]);
  const [rates, setRates] = useState({});
  const [state, setState] = useState({ loading: true, error: "" });
  const [filters, setFilters] = useState({ search: "", platform: "" });
  const requestRef = useRef(null);
  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ loading: true, error: "" });
    try {
      const [channelResult, rateResult] = await Promise.allSettled([channelsApi.available(controller.signal), groupsApi.rates()]);
      if (controller.signal.aborted || requestRef.current !== controller) return;
      if (channelResult.status === "rejected") throw channelResult.reason;
      setChannels(Array.isArray(channelResult.value) ? channelResult.value : channelResult.value?.items || []);
      setRates(rateResult.value?.rates || rateResult.value || {});
      setState({ loading: false, error: "" });
    } catch (error) { if (error.name !== "AbortError") setState({ loading: false, error: error.message }); }
  }, []);
  useEffect(() => { load(); return () => requestRef.current?.abort(); }, [load]);
  const sections = useMemo(() => channels.flatMap((channel) => (channel.platforms || []).map((section) => ({ ...section, channel_name: channel.name, channel_description: channel.description }))), [channels]);
  const platforms = [...new Set(sections.map((section) => section.platform))];
  const visible = sections.filter((section) => (!filters.platform || section.platform === filters.platform) && (!filters.search || `${section.channel_name} ${section.platform} ${(section.supported_models || []).map((item) => item.name).join(" ")}`.toLowerCase().includes(filters.search.toLowerCase())));

  return <Page title={t("channels.title")} subtitle={t("channels.subtitle")} actions={<Button icon="refresh" onClick={load}>{t("common.refresh")}</Button>}>
    <Panel><div className="console-toolbar"><Field label={t("common.search")} className="is-wide"><TextInput value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder={locale === "zh" ? "渠道或模型" : "Channel or model"} /></Field><Field label={t("channels.platform")}><SelectInput value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))}><option value="">{t("common.all")}</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</SelectInput></Field></div></Panel>
    {state.loading ? <Panel><Spinner /></Panel> : state.error ? <Panel><ErrorState message={state.error} onRetry={load} /></Panel> : !visible.length ? <Panel><EmptyState icon="channel" /></Panel> : <div className="console-channel-list">{visible.map((section, index) => <Panel key={`${section.channel_name}-${section.platform}-${index}`} className="console-channel-card"><div className="console-panel-body"><div className="console-channel-head"><span className="console-platform-icon">{String(section.platform).slice(0, 2).toUpperCase()}</span><div><h3>{section.channel_name}</h3><p>{section.channel_description || section.platform}</p></div><StatusBadge status="operational" label={section.platform} /></div><div className="console-channel-groups"><span>{t("channels.groups")}</span><div className="console-chip-list">{(section.groups || []).map((group) => { const userRate = rates[group.id] ?? rates[String(group.id)] ?? group.rate_multiplier; const detail = `${userRate || 1}×${group.subscription_type === "subscription" ? " · SUB" : ""}`; return <GroupBadge name={group.name} platform={section.platform} detail={detail} key={group.id} />; })}</div></div><div className="console-model-cards">{(section.supported_models || []).map((model) => <div key={model.name}><div><strong>{model.name}</strong><span>{model.pricing?.billing_mode || model.platform}</span></div><Pricing pricing={model.pricing} locale={locale} /></div>)}</div></div></Panel>)}</div>}
  </Page>;
}
