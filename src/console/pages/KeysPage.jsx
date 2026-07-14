import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupsApi, keysApi, usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, CopyButton, DataTable, EmptyState, ErrorState, Field, IconButton, LineChart, Modal, Page, Pagination, Panel, ProgressBar, SelectInput, Spinner, StatusBadge, TextArea, TextInput, Toggle } from "../UI";
import { maskKey, statusLabel } from "../utils";
import { ColumnPicker, useHiddenColumns } from "../components/ConsoleControls";
import { GroupSelect } from "../components/GroupSelect";
import { UseKeyModal } from "../components/UseKeyModal";

const emptyForm = {
  name: "", group_id: "", status: "active", use_custom_key: false, custom_key: "", enable_ip_restriction: false,
  ip_whitelist: "", ip_blacklist: "", enable_quota: false, quota: "", enable_rate_limit: false,
  rate_limit_5h: "", rate_limit_1d: "", rate_limit_7d: "", enable_expiration: false, expiration_preset: "30", expiration_date: "",
};

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function expiryDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days));
  return dateTimeLocal(date);
}

function formForKey(key) {
  return {
    ...emptyForm, name: key.name || "", group_id: key.group_id ?? "", status: ["active", "inactive"].includes(key.status) ? key.status : "inactive",
    enable_ip_restriction: Boolean(key.ip_whitelist?.length || key.ip_blacklist?.length), ip_whitelist: (key.ip_whitelist || []).join("\n"), ip_blacklist: (key.ip_blacklist || []).join("\n"),
    enable_quota: Number(key.quota) > 0, quota: Number(key.quota) > 0 ? key.quota : "", enable_rate_limit: Boolean(key.rate_limit_5h || key.rate_limit_1d || key.rate_limit_7d),
    rate_limit_5h: key.rate_limit_5h || "", rate_limit_1d: key.rate_limit_1d || "", rate_limit_7d: key.rate_limit_7d || "",
    enable_expiration: Boolean(key.expires_at), expiration_preset: "custom", expiration_date: dateTimeLocal(key.expires_at),
  };
}

function lines(value) {
  return String(value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function formPayload(form, editing) {
  const payload = {
    name: form.name.trim(), group_id: form.group_id === "" ? null : Number(form.group_id),
    ip_whitelist: form.enable_ip_restriction ? lines(form.ip_whitelist) : [], ip_blacklist: form.enable_ip_restriction ? lines(form.ip_blacklist) : [],
    quota: form.enable_quota ? Number(form.quota) || 0 : 0, rate_limit_5h: form.enable_rate_limit ? Number(form.rate_limit_5h) || 0 : 0,
    rate_limit_1d: form.enable_rate_limit ? Number(form.rate_limit_1d) || 0 : 0, rate_limit_7d: form.enable_rate_limit ? Number(form.rate_limit_7d) || 0 : 0,
  };
  if (editing) return { ...payload, status: form.status, expires_at: form.enable_expiration && form.expiration_date ? new Date(form.expiration_date).toISOString() : "" };
  if (form.use_custom_key && form.custom_key.trim()) payload.custom_key = form.custom_key.trim();
  if (form.enable_expiration && form.expiration_date) payload.expires_in_days = Math.max(1, Math.ceil((new Date(form.expiration_date).getTime() - Date.now()) / 86400000));
  return payload;
}

function endpointItems(settings, defaultLabel) {
  const base = String(settings?.api_base_url || window.location.origin).replace(/\/+$/, "");
  const custom = (settings?.custom_endpoints || []).filter((item) => item.endpoint).map((item, index) => ({ name: item.name || `Endpoint ${index + 2}`, endpoint: String(item.endpoint).replace(/\/+$/, ""), description: item.description || "" }));
  return [{ name: defaultLabel, endpoint: base, primary: true }, ...custom.filter((item) => item.endpoint !== base)];
}

function EndpointPopover({ settings }) {
  const { t } = useLocale();
  const items = endpointItems(settings, t("keys.endpointDefault"));
  return <div className="console-endpoint-popover"><span><Icon name="link" size={14} />{t("keys.endpoints")}</span>{items.map((item) => <div key={item.endpoint} title={item.description || item.endpoint}><b>{item.name}{item.primary && <small>{t("keys.endpointDefault")}</small>}</b><code>{item.endpoint}</code><CopyButton value={item.endpoint} /><a href={`https://www.tcptest.cn/http/${encodeURIComponent(item.endpoint)}`} target="_blank" rel="noreferrer" aria-label={t("keys.endpointSpeed")}><Icon name="pulse" size={14} /></a></div>)}</div>;
}

function resetCountdown(value, locale) {
  if (!value) return "";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return locale === "zh" ? "现在" : "now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff % 86400000 / 3600000);
  const minutes = Math.floor(diff % 3600000 / 60000);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function UsageCell({ row, stats, formatCurrency, locale }) {
  const usage = stats?.[row.id] || stats?.[String(row.id)] || {};
  const percent = Number(row.quota) ? Number(row.quota_used || 0) / Number(row.quota) * 100 : 0;
  return <div className="console-key-usage"><div><span>{locale === "zh" ? "今日" : "Today"}</span><strong>{formatCurrency(usage.today_actual_cost || 0)}</strong></div><div><span>{locale === "zh" ? "累计" : "Total"}</span><strong>{formatCurrency(usage.total_actual_cost || 0)}</strong></div>{Number(row.quota) > 0 && <div className="is-quota"><span>{locale === "zh" ? "额度" : "Quota"}</span><strong>{formatCurrency(row.quota_used)} / {formatCurrency(row.quota)}</strong><ProgressBar value={percent} tone={percent >= 90 ? "danger" : "primary"} /></div>}</div>;
}

function RateWindow({ label, used, limit, resetAt, formatCurrency, locale }) {
  if (!Number(limit)) return null;
  const percent = Number(used || 0) / Number(limit) * 100;
  return <div><span><b>{label}</b><strong>{formatCurrency(used)} / {formatCurrency(limit)}</strong></span><ProgressBar value={percent} tone={percent >= 100 ? "danger" : percent >= 80 ? "warning" : "primary"} />{resetAt && <small>↻ {resetCountdown(resetAt, locale)}</small>}</div>;
}

function RateLimitCell({ row, onReset, formatCurrency, locale }) {
  const active = row.rate_limit_5h || row.rate_limit_1d || row.rate_limit_7d;
  if (!active) return <span className="console-muted">—</span>;
  return <div className="console-rate-windows"><RateWindow label="5h" used={row.usage_5h} limit={row.rate_limit_5h} resetAt={row.reset_5h_at} formatCurrency={formatCurrency} locale={locale} /><RateWindow label="1d" used={row.usage_1d} limit={row.rate_limit_1d} resetAt={row.reset_1d_at} formatCurrency={formatCurrency} locale={locale} /><RateWindow label="7d" used={row.usage_7d} limit={row.rate_limit_7d} resetAt={row.reset_7d_at} formatCurrency={formatCurrency} locale={locale} />{Boolean(row.usage_5h || row.usage_1d || row.usage_7d) && <button type="button" onClick={onReset}><Icon name="reset" size={12} />{locale === "zh" ? "重置用量" : "Reset usage"}</button>}</div>;
}

function SettingBlock({ title, enabled, onToggle, children }) {
  return <div className="console-key-setting"><div><strong>{title}</strong><Toggle checked={enabled} onChange={onToggle} label={enabled ? "ON" : "OFF"} /></div>{enabled && <div>{children}</div>}</div>;
}

function KeyForm({ form, setForm, groups, rates, editing, selectedKey, onResetQuota, onResetRate }) {
  const { t, locale, formatCurrency } = useLocale();
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.checked }));
  const pickExpiry = (value) => setForm((current) => ({ ...current, expiration_preset: value, expiration_date: value === "custom" ? current.expiration_date : expiryDate(value) }));
  return <div className="console-key-form"><div className="console-form-grid"><Field label={t("keys.formName")}><TextInput value={form.name} onChange={set("name")} autoFocus /></Field><Field label={t("keys.group")}><GroupSelect value={form.group_id} groups={groups} rates={rates} onChange={(group_id) => setForm((current) => ({ ...current, group_id }))} allowEmpty /></Field>{editing && <Field label={t("common.status")}><SelectInput value={form.status} onChange={set("status")}><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option></SelectInput></Field>}</div>
    {!editing && <SettingBlock title={locale === "zh" ? "自定义密钥" : "Custom key"} enabled={form.use_custom_key} onToggle={toggle("use_custom_key")}><Field label={t("keys.formCustom")} hint={locale === "zh" ? "至少 16 位，仅支持字母、数字、下划线和连字符。" : "At least 16 letters, numbers, underscores, or hyphens."}><TextInput value={form.custom_key} onChange={set("custom_key")} placeholder="sk-…" autoComplete="off" /></Field></SettingBlock>}
    <SettingBlock title={locale === "zh" ? "IP 访问限制" : "IP restrictions"} enabled={form.enable_ip_restriction} onToggle={toggle("enable_ip_restriction")}><div className="console-form-grid"><Field label={t("keys.formAllow")} hint={locale === "zh" ? "每行一个 IP 或 CIDR" : "One IP or CIDR per line."}><TextArea rows="4" value={form.ip_whitelist} onChange={set("ip_whitelist")} /></Field><Field label={t("keys.formDeny")} hint={locale === "zh" ? "黑名单优先" : "Denylist takes precedence."}><TextArea rows="4" value={form.ip_blacklist} onChange={set("ip_blacklist")} /></Field></div></SettingBlock>
    <SettingBlock title={locale === "zh" ? "总额度" : "Total quota"} enabled={form.enable_quota} onToggle={toggle("enable_quota")}><div className="console-setting-row"><Field label={t("keys.formQuota")}><TextInput type="number" min="0" step="0.01" value={form.quota} onChange={set("quota")} /></Field>{editing && <div className="console-current-usage"><span>{locale === "zh" ? "已用" : "Used"}</span><strong>{formatCurrency(selectedKey?.quota_used)}</strong>{Number(selectedKey?.quota_used) > 0 && <Button icon="reset" onClick={onResetQuota}>{locale === "zh" ? "重置" : "Reset"}</Button>}</div>}</div></SettingBlock>
    <SettingBlock title={locale === "zh" ? "周期限流" : "Rolling spend limits"} enabled={form.enable_rate_limit} onToggle={toggle("enable_rate_limit")}><div className="console-form-grid console-form-grid--3"><Field label={t("keys.formRate5h")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_5h} onChange={set("rate_limit_5h")} /></Field><Field label={t("keys.formRate1d")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_1d} onChange={set("rate_limit_1d")} /></Field><Field label={t("keys.formRate7d")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_7d} onChange={set("rate_limit_7d")} /></Field></div>{editing && <div className="console-edit-rate-preview"><RateLimitCell row={selectedKey} onReset={onResetRate} formatCurrency={formatCurrency} locale={locale} /></div>}</SettingBlock>
    <SettingBlock title={locale === "zh" ? "到期时间" : "Expiration"} enabled={form.enable_expiration} onToggle={toggle("enable_expiration")}><div className="console-expiry-presets">{[["7", "7 days", "7 天"], ["30", "30 days", "30 天"], ["90", "90 days", "90 天"], ["custom", "Custom", "自定义"]].map(([value, en, zh]) => <button type="button" key={value} className={form.expiration_preset === value ? "is-active" : ""} onClick={() => pickExpiry(value)}>{locale === "zh" ? zh : en}</button>)}</div><Field label={t("keys.formExpiry")}><TextInput type="datetime-local" value={form.expiration_date} onChange={(event) => setForm((current) => ({ ...current, expiration_preset: "custom", expiration_date: event.target.value }))} /></Field></SettingBlock></div>;
}

function UsageDetail({ apiKey }) {
  const { locale, formatCurrency, formatNumber } = useLocale();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  useEffect(() => { let active = true; keysApi.getDailyUsage(apiKey.id, 30).then((result) => active && setState({ loading: false, error: "", items: result.items || [] })).catch((error) => active && setState({ loading: false, error: error.message, items: [] })); return () => { active = false; }; }, [apiKey.id]);
  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState message={state.error} />;
  return <div className="console-detail-stack"><div className="console-detail-summary"><div><span>{locale === "zh" ? "累计消费" : "Total spend"}</span><strong>{formatCurrency(state.items.reduce((sum, item) => sum + Number(item.actual_cost || 0), 0))}</strong></div><div><span>Token</span><strong>{formatNumber(state.items.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0))}</strong></div></div><LineChart data={state.items} valueKey="total_tokens" /></div>;
}

function ccsImportUrl(row, baseUrl, siteName, clientType) {
  const platform = row.group?.platform || "anthropic";
  const app = platform === "openai" ? "codex" : platform === "gemini" || clientType === "gemini" ? "gemini" : "claude";
  const endpoint = platform === "antigravity" ? `${baseUrl}/antigravity` : baseUrl;
  const script = `({request:{url:"{{baseUrl}}/v1/usage",method:"GET",headers:{"Authorization":"Bearer {{apiKey}}"}},extractor:function(response){return {isValid:response?.is_active??true,remaining:response?.remaining??response?.quota?.remaining??response?.balance,unit:response?.unit??"USD"}}})`;
  const params = new URLSearchParams([["resource", "provider"], ["app", app], ["name", siteName], ["homepage", baseUrl], ["endpoint", endpoint], ["apiKey", row.key], ["configFormat", "json"], ["usageEnabled", "true"], ["usageScript", btoa(script)], ["usageAutoInterval", "30"]]);
  if (platform === "openai") params.set("model", "gpt-5.5");
  return `ccswitch://v1/import?${params.toString()}`;
}

export function KeysPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { notify, settings } = useConsole();
  const [query, setQuery] = useState({ search: "", status: "", group_id: "" });
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState({ key: "created_at", order: "desc" });
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [usageStats, setUsageStats] = useState({});
  const [groups, setGroups] = useState([]);
  const [rates, setRates] = useState({});
  const [state, setState] = useState({ loading: true, error: "" });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dialog, setDialog] = useState(null);
  const [createdKey, setCreatedKey] = useState("");
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(null);
  const { hidden, toggle: toggleColumn } = useHiddenColumns("api-key-hidden-columns", ["rate_limit", "last_used_at", "last_used_ip"]);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ loading: true, error: "" });
    try {
      const data = await keysApi.list(paging.page, paging.pageSize, { ...query, sort_by: sort.key, sort_order: sort.order }, controller.signal);
      if (controller.signal.aborted) return;
      const items = data.items || [];
      setResult({ items, total: Number(data.total || 0), pages: Number(data.pages || 1) });
      setState({ loading: false, error: "" });
      if (items.length) usageApi.keyUsageBatch(items.map((item) => item.id), controller.signal).then((response) => !controller.signal.aborted && setUsageStats(response.stats || response || {})).catch(() => {});
    } catch (error) { if (error.name !== "AbortError") setState({ loading: false, error: error.message }); }
  }, [paging, query, sort]);

  useEffect(() => { load(); return () => requestRef.current?.abort(); }, [load]);
  useEffect(() => { let active = true; Promise.allSettled([groupsApi.available(), groupsApi.rates()]).then(([groupResult, rateResult]) => { if (!active) return; const groupData = groupResult.value; setGroups(Array.isArray(groupData) ? groupData : groupData?.items || []); setRates(rateResult.value?.rates || rateResult.value || {}); }); return () => { active = false; }; }, []);

  const openCreate = () => { setForm({ ...emptyForm, group_id: groups[0]?.id || "", expiration_date: expiryDate(30) }); setEditor({ type: "create" }); };
  const openEdit = (item) => { setForm(formForKey(item)); setEditor({ type: "edit", item }); };
  const submit = async () => {
    if (!form.name.trim() || form.group_id === "") return notify("warning", locale === "zh" ? "请填写名称并选择分组。" : "Add a name and select a group.");
    if (form.use_custom_key && (!form.custom_key || form.custom_key.length < 16 || !/^[a-zA-Z0-9_-]+$/.test(form.custom_key))) return notify("warning", locale === "zh" ? "自定义密钥格式不正确。" : "The custom key format is invalid.");
    setBusy(true);
    try {
      const payload = formPayload(form, editor.type === "edit");
      if (["expired", "quota_exhausted"].includes(editor.item?.status) && form.status !== "active") delete payload.status;
      const saved = editor.type === "edit" ? await keysApi.update(editor.item.id, payload) : await keysApi.create(payload);
      setEditor(null); if (editor.type === "create" && saved.key) setCreatedKey(saved.key); notify("success", editor.type === "edit" ? t("keys.updated") : t("keys.created")); load();
    } catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const updateKey = async (item, payload, success) => { setBusy(true); try { const saved = await keysApi.update(item.id, payload); if (editor?.item?.id === item.id && saved) setEditor((current) => current ? { ...current, item: saved } : current); notify("success", success || t("common.saved")); setDialog(null); await load(); } catch (error) { notify("error", error.message); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await keysApi.remove(dialog.item.id); notify("success", t("keys.deleted")); setDialog(null); load(); } catch (error) { notify("error", error.message); } finally { setBusy(false); } };
  const changeGroup = async (item, group_id) => { try { await keysApi.update(item.id, { group_id: group_id === "" ? null : Number(group_id) }); notify("success", t("common.saved")); load(); } catch (error) { notify("error", error.message); } };
  const importCcs = (item, clientType = "claude") => { const base = endpointItems(settings, "Default")[0].endpoint; window.location.href = ccsImportUrl(item, base, String(settings?.site_name || "Sentence AI"), clientType); };

  const allColumns = useMemo(() => [
    { key: "name", label: t("common.name"), sortable: true, render: (row) => <div className="console-key-title"><strong>{row.name}</strong>{Boolean(row.ip_whitelist?.length || row.ip_blacklist?.length) && <Icon name="shield" size={14} />}</div> },
    { key: "key", label: t("keys.key"), render: (row) => <span className="console-code"><span>{maskKey(row.key)}</span><CopyButton value={row.key} /></span> },
    { key: "group", label: t("keys.group"), render: (row) => <GroupSelect compact value={row.group_id ?? ""} groups={groups} rates={rates} onChange={(groupId) => changeGroup(row, groupId)} allowEmpty /> },
    { key: "current_concurrency", label: locale === "zh" ? "当前并发" : "Concurrency", sortable: true, align: "center", render: (row) => <span className={`console-concurrency ${Number(row.current_concurrency) ? "is-active" : ""}`}>{row.current_concurrency || 0}</span> },
    { key: "usage", label: locale === "zh" ? "用量" : "Usage", render: (row) => <UsageCell row={row} stats={usageStats} formatCurrency={formatCurrency} locale={locale} /> },
    { key: "rate_limit", label: locale === "zh" ? "周期限额" : "Rate limits", render: (row) => <RateLimitCell row={row} onReset={() => setDialog({ type: "resetRate", item: row })} formatCurrency={formatCurrency} locale={locale} /> },
    { key: "expires_at", label: t("keys.expires"), sortable: true, render: (row) => row.expires_at ? <span className={new Date(row.expires_at) < new Date() ? "console-danger-text" : ""}>{formatDate(row.expires_at)}</span> : t("common.never") },
    { key: "status", label: t("common.status"), sortable: true, render: (row) => <StatusBadge status={row.status} label={statusLabel(row.status, locale)} /> },
    { key: "last_used_at", label: t("keys.lastUsed"), sortable: true, render: (row) => row.last_used_at ? formatDate(row.last_used_at) : "—" },
    { key: "last_used_ip", label: locale === "zh" ? "最近 IP" : "Last used IP", render: (row) => row.last_used_ip || "—" },
    { key: "created_at", label: locale === "zh" ? "创建时间" : "Created", sortable: true, render: (row) => formatDate(row.created_at) },
    { key: "actions", label: t("common.actions"), align: "right", render: (row) => <div className="console-key-actions"><button type="button" onClick={() => setDialog({ type: "use", item: row })}><Icon name="terminal" size={15} /><span>{locale === "zh" ? "使用密钥" : "Use key"}</span></button>{settings?.hide_ccs_import_button !== true && <button type="button" onClick={() => row.group?.platform === "antigravity" ? setDialog({ type: "ccs", item: row }) : importCcs(row)}><Icon name="upload" size={15} /><span>CC Switch</span></button>}<IconButton icon="eye" label={t("keys.usage")} onClick={() => setDialog({ type: "usage", item: row })} /><IconButton icon={row.status === "active" ? "play" : "refresh"} label={t("keys.toggle")} onClick={() => updateKey(row, { status: row.status === "active" ? "inactive" : "active" })} /><IconButton icon="edit" label={t("common.edit")} onClick={() => openEdit(row)} /><IconButton icon="trash" label={t("common.delete")} onClick={() => setDialog({ type: "delete", item: row })} /></div> },
  ], [formatCurrency, formatDate, groups, locale, rates, settings, t, usageStats]);
  const columns = allColumns.filter((column) => ["name", "actions"].includes(column.key) || !hidden.has(column.key));

  return <Page title={t("keys.title")} subtitle={t("keys.subtitle")} className="console-keys-page">
    <Panel><div className="console-table-page-toolbar"><div className="console-key-filter-stack"><div className="console-filter-row"><Field label={t("common.search")} className="is-wide"><TextInput value={query.search} onChange={(event) => { setQuery((current) => ({ ...current, search: event.target.value })); setPaging((current) => ({ ...current, page: 1 })); }} placeholder={locale === "zh" ? "名称或密钥" : "Name or key"} /></Field><Field label={t("keys.group")}><SelectInput value={query.group_id} onChange={(event) => { setQuery((current) => ({ ...current, group_id: event.target.value })); setPaging((current) => ({ ...current, page: 1 })); }}><option value="">{locale === "zh" ? "全部分组" : "All groups"}</option><option value="0">{locale === "zh" ? "无分组" : "No group"}</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</SelectInput></Field><Field label={t("common.status")}><SelectInput value={query.status} onChange={(event) => { setQuery((current) => ({ ...current, status: event.target.value })); setPaging((current) => ({ ...current, page: 1 })); }}><option value="">{t("common.all")}</option><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option><option value="quota_exhausted">{locale === "zh" ? "额度已用尽" : "Quota exhausted"}</option><option value="expired">{locale === "zh" ? "已过期" : "Expired"}</option></SelectInput></Field></div><EndpointPopover settings={settings} /></div><div className="console-table-actions"><Button icon="refresh" onClick={load} disabled={state.loading}>{t("common.refresh")}</Button><ColumnPicker columns={allColumns} hidden={hidden} onToggle={toggleColumn} alwaysVisible={["name", "actions"]} /><Button variant="primary" icon="plus" onClick={openCreate}>{t("keys.new")}</Button></div></div>{state.loading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : <><DataTable columns={columns} rows={result.items} sortKey={sort.key} sortOrder={sort.order} onSort={(key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); }} empty={<EmptyState icon="key" title={locale === "zh" ? "还没有 API 密钥" : "No API keys yet"} action={<Button variant="primary" icon="plus" onClick={openCreate}>{t("keys.new")}</Button>} />} /><Pagination page={paging.page} pageSize={paging.pageSize} total={result.total} pages={result.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>}</Panel>
    <Modal open={Boolean(editor)} title={editor?.type === "edit" ? (locale === "zh" ? "编辑 API 密钥" : "Edit API key") : t("keys.new")} description={t("keys.subtitle")} onClose={() => setEditor(null)} size="large" footer={<><Button onClick={() => setEditor(null)} disabled={busy}>{t("common.cancel")}</Button><Button variant="primary" onClick={submit} disabled={busy}>{busy ? t("common.loading") : t("common.save")}</Button></>}><KeyForm form={form} setForm={setForm} groups={groups} rates={rates} editing={editor?.type === "edit"} selectedKey={editor?.item} onResetQuota={() => setDialog({ type: "resetQuota", item: editor.item })} onResetRate={() => setDialog({ type: "resetRate", item: editor.item })} /></Modal>
    <UseKeyModal open={dialog?.type === "use"} apiKey={dialog?.item?.key || ""} baseUrl={endpointItems(settings, "Default")[0].endpoint} platform={dialog?.item?.group?.platform || null} allowMessagesDispatch={settings?.allow_messages_dispatch === true} onClose={() => setDialog(null)} />
    <Modal open={dialog?.type === "usage"} title={`${dialog?.item?.name || ""} · ${t("keys.usage")}`} onClose={() => setDialog(null)} size="large">{dialog?.item && <UsageDetail apiKey={dialog.item} />}</Modal>
    <ConfirmDialog open={dialog?.type === "delete"} title={t("keys.deleteTitle")} description={t("keys.deleteBody")} busy={busy} onClose={() => setDialog(null)} onConfirm={remove} />
    <ConfirmDialog open={dialog?.type === "resetQuota"} title={locale === "zh" ? "重置额度用量？" : "Reset quota usage?"} description={locale === "zh" ? "已用额度会归零，此操作无法撤销。" : "Used quota will return to zero. This cannot be undone."} busy={busy} onClose={() => setDialog(null)} onConfirm={() => updateKey(dialog.item, { reset_quota: true }, locale === "zh" ? "额度用量已重置。" : "Quota usage reset.")} />
    <ConfirmDialog open={dialog?.type === "resetRate"} title={locale === "zh" ? "重置周期限额用量？" : "Reset rate-limit usage?"} description={locale === "zh" ? "5 小时、1 天和 7 天窗口都会归零。" : "The 5-hour, 1-day, and 7-day windows will all return to zero."} busy={busy} onClose={() => setDialog(null)} onConfirm={() => updateKey(dialog.item, { reset_rate_limit_usage: true }, locale === "zh" ? "周期用量已重置。" : "Rate-limit usage reset.")} />
    <Modal open={dialog?.type === "ccs"} title={locale === "zh" ? "导入到 CC Switch" : "Import to CC Switch"} description={locale === "zh" ? "Antigravity 分组可选择目标客户端。" : "Choose the target client for this Antigravity group."} onClose={() => setDialog(null)} size="small"><div className="console-ccs-options"><Button variant="primary" onClick={() => importCcs(dialog.item, "claude")}>Claude Code</Button><Button variant="primary" onClick={() => importCcs(dialog.item, "gemini")}>Gemini CLI</Button></div></Modal>
    <Modal open={Boolean(createdKey)} title={t("keys.created")} description={t("keys.copyWarning")} onClose={() => setCreatedKey("")} size="small" footer={<Button variant="primary" onClick={() => setCreatedKey("")}>{t("common.confirm")}</Button>}><div className="console-created-key"><span className="console-code"><span>{createdKey}</span><CopyButton value={createdKey} label={t("common.copy")} /></span></div></Modal>
  </Page>;
}
