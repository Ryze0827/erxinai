import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@appica/ui-react/skeleton";
import { Toggle as AppicaToggle } from "@appica/ui-react/toggle";
import { ToggleGroup } from "@appica/ui-react/toggle-group";
import { useSearchParams } from "react-router";
import { groupsApi, keysApi, usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale, translate, translateNodes, formatDateTimeFor } from "../i18n";
import { Button, ConfirmDialog, CopyButton, DataTable, EmptyState, ErrorState, Field, IconButton, InlineButton, LineChart, Modal, Page, Pagination, Panel, PaginationSkeleton, ProgressBar, SelectInput, StatusBadge, TextArea, TextInput, Toggle } from "../UI";
import { formatTokenMillions, maskKey, statusLabel } from "../utils";
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

function enabledNumber(enabled, value) {
  return enabled ? Number(value) || 0 : 0;
}

function commonKeyPayload(form) {
  const restricted = form.enable_ip_restriction;
  return {
    name: form.name.trim(), group_id: form.group_id === "" ? null : Number(form.group_id),
    ip_whitelist: restricted ? lines(form.ip_whitelist) : [], ip_blacklist: restricted ? lines(form.ip_blacklist) : [],
    quota: enabledNumber(form.enable_quota, form.quota), rate_limit_5h: enabledNumber(form.enable_rate_limit, form.rate_limit_5h),
    rate_limit_1d: enabledNumber(form.enable_rate_limit, form.rate_limit_1d), rate_limit_7d: enabledNumber(form.enable_rate_limit, form.rate_limit_7d),
  };
}

function expirationIso(form) {
  return form.enable_expiration && form.expiration_date ? new Date(form.expiration_date).toISOString() : "";
}

function formPayload(form, editing) {
  const payload = commonKeyPayload(form);
  if (editing) return { ...payload, status: form.status, expires_at: expirationIso(form) };
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
  const { t, locale } = useLocale();
  const defaultLabel = t("keys.endpointDefault");
  if (!settings) return <section className="console-endpoint-popover" role="status" aria-label={t("common.loading")}><header><strong>{t("keys.endpoints")}</strong><span>{translateNodes(locale, "keys.availableCount", { count: <Skeleton className="console-endpoint-count-placeholder" /> })}</span></header><div className="console-endpoint-grid"><div className="console-endpoint-item" aria-hidden="true"><b>{defaultLabel}</b><code><Skeleton className="console-endpoint-value-placeholder" /></code><span className="console-endpoint-action-placeholder"><Icon name="copy" size={16} /></span><span className="console-endpoint-action-placeholder"><Icon name="pulse" size={16} /></span></div></div></section>;
  const items = endpointItems(settings, defaultLabel);
  return <section className="console-endpoint-popover"><header><strong>{t("keys.endpoints")}</strong><span>{t("keys.availableCount", { count: items.length })}</span></header><div className="console-endpoint-grid">{items.map((item) => <div className="console-endpoint-item" key={item.endpoint} title={item.description || item.endpoint}><b>{item.name}{item.primary && item.name !== defaultLabel && <small>{defaultLabel}</small>}</b><code title={item.endpoint}>{item.endpoint}</code><CopyButton value={item.endpoint} /><a href={`https://www.tcptest.cn/http/${encodeURIComponent(item.endpoint)}`} target="_blank" rel="noreferrer" aria-label={t("keys.endpointSpeed")} title={t("keys.endpointSpeed")}><Icon name="pulse" size={16} /><span>{t("keys.endpointSpeed")}</span></a></div>)}</div></section>;
}

function resetCountdown(value, locale) {
  if (!value) return "";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return translate(locale, "keys.now");
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff % 86400000 / 3600000);
  const minutes = Math.floor(diff % 3600000 / 60000);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function KeyCreatedTime({ value, locale }) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const day = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return <time className="console-key-created" dateTime={date.toISOString()}><span>{day}</span><small>{formatDateTimeFor(locale, date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</small></time>;
}

function UsageCell({ row, stats, formatCurrency, locale }) {
  const usage = stats?.[row.id] || stats?.[String(row.id)] || {};
  const percent = Number(row.quota) ? Number(row.quota_used || 0) / Number(row.quota) * 100 : 0;
  const tone = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "primary";
  return <div className="console-key-usage"><div><span>{translate(locale, "keys.today")}</span><strong>{formatCurrency(usage.today_actual_cost || 0)}</strong></div><div><span>{translate(locale, "keys.total")}</span><strong>{formatCurrency(usage.total_actual_cost || 0)}</strong></div>{Number(row.quota) > 0 && <div className="is-quota"><span>{translate(locale, "keys.quota")}</span><strong className="console-key-limit-amount" data-tone={tone}>{formatCurrency(row.quota_used)} / {formatCurrency(row.quota)}</strong><ProgressBar value={percent} tone={tone} /></div>}</div>;
}

function RateWindow({ label, used, limit, resetAt, formatCurrency, locale }) {
  if (!Number(limit)) return null;
  const percent = Number(used || 0) / Number(limit) * 100;
  const tone = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "primary";
  return <div><span><b>{label}</b><strong className="console-key-limit-amount" data-tone={tone}>{formatCurrency(used)} / {formatCurrency(limit)}</strong></span><ProgressBar value={percent} tone={tone} />{resetAt && <small><Icon name="refresh" size={12} />{resetCountdown(resetAt, locale)}</small>}</div>;
}

function RateLimitCell({ row, onReset, formatCurrency, locale }) {
  const active = row.rate_limit_5h || row.rate_limit_1d || row.rate_limit_7d;
  if (!active) return <span className="console-muted">—</span>;
  return <div className="console-rate-windows"><RateWindow label="5h" used={row.usage_5h} limit={row.rate_limit_5h} resetAt={row.reset_5h_at} formatCurrency={formatCurrency} locale={locale} /><RateWindow label="1d" used={row.usage_1d} limit={row.rate_limit_1d} resetAt={row.reset_1d_at} formatCurrency={formatCurrency} locale={locale} /><RateWindow label="7d" used={row.usage_7d} limit={row.rate_limit_7d} resetAt={row.reset_7d_at} formatCurrency={formatCurrency} locale={locale} />{Boolean(row.usage_5h || row.usage_1d || row.usage_7d) && <InlineButton icon="reset" onClick={onReset}>{translate(locale, "keys.resetUsage")}</InlineButton>}</div>;
}

function SettingBlock({ title, enabled, onToggle, children }) {
  return <div className="console-key-setting"><div><strong>{title}</strong><Toggle checked={enabled} onChange={onToggle} label={enabled ? "ON" : "OFF"} /></div>{enabled && <div>{children}</div>}</div>;
}

function KeyBasics({ form, setForm, groups, rates, editing, set, t }) {
  return <div className="console-form-grid"><Field label={t("keys.formName")}><TextInput value={form.name} onChange={set("name")} autoFocus /></Field><Field label={t("keys.group")}><GroupSelect value={form.group_id} groups={groups} rates={rates} onChange={(group_id) => setForm((current) => ({ ...current, group_id }))} /></Field>{editing && <Field label={t("common.status")}><SelectInput value={form.status} onChange={set("status")}><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option></SelectInput></Field>}</div>;
}

function CustomKeySetting({ form, editing, toggle, set, locale, t }) {
  if (editing) return null;
  return <SettingBlock title={t("keys.customKey")} enabled={form.use_custom_key} onToggle={toggle("use_custom_key")}><Field label={t("keys.formCustom")} hint={t("keys.atLeast16Letters")}><TextInput value={form.custom_key} onChange={set("custom_key")} placeholder="sk-…" autoComplete="off" /></Field></SettingBlock>;
}

function IpRestrictionSetting({ form, toggle, set, locale, t }) {
  return <SettingBlock title={t("keys.ipRestrictions")} enabled={form.enable_ip_restriction} onToggle={toggle("enable_ip_restriction")}><div className="console-form-grid"><Field label={t("keys.formAllow")} hint={t("keys.oneIpCidrPer")}><TextArea rows="4" value={form.ip_whitelist} onChange={set("ip_whitelist")} /></Field><Field label={t("keys.formDeny")} hint={t("keys.denylistTakesPrecedence")}><TextArea rows="4" value={form.ip_blacklist} onChange={set("ip_blacklist")} /></Field></div></SettingBlock>;
}

function QuotaSetting({ form, toggle, set, editing, selectedKey, onResetQuota, formatCurrency, locale, t }) {
  const hasUsage = Number(selectedKey?.quota_used) > 0;
  return <SettingBlock title={t("keys.totalQuota")} enabled={form.enable_quota} onToggle={toggle("enable_quota")}><div className="console-setting-row"><Field label={t("keys.formQuota")}><TextInput type="number" min="0" step="0.01" value={form.quota} onChange={set("quota")} /></Field>{editing && <div className="console-current-usage"><span>{t("keys.used")}</span><strong>{formatCurrency(selectedKey?.quota_used)}</strong>{hasUsage && <Button icon="reset" onClick={onResetQuota}>{t("keys.reset")}</Button>}</div>}</div></SettingBlock>;
}

function RateLimitSetting({ form, toggle, set, editing, selectedKey, onResetRate, formatCurrency, locale, t }) {
  return <SettingBlock title={t("keys.rollingSpendLimits")} enabled={form.enable_rate_limit} onToggle={toggle("enable_rate_limit")}><div className="console-form-grid console-form-grid--3"><Field label={t("keys.formRate5h")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_5h} onChange={set("rate_limit_5h")} /></Field><Field label={t("keys.formRate1d")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_1d} onChange={set("rate_limit_1d")} /></Field><Field label={t("keys.formRate7d")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_7d} onChange={set("rate_limit_7d")} /></Field></div>{editing && <div className="console-edit-rate-preview"><RateLimitCell row={selectedKey} onReset={onResetRate} formatCurrency={formatCurrency} locale={locale} /></div>}</SettingBlock>;
}

function ExpirationSetting({ form, setForm, toggle, pickExpiry, locale, t }) {
  const presets = ["7", "30", "90", "custom"];
  return <SettingBlock title={t("keys.formExpiry")} enabled={form.enable_expiration} onToggle={toggle("enable_expiration")}><ToggleGroup value={[form.expiration_preset]} className="console-expiry-presets">{presets.map((value) => <AppicaToggle type="button" value={value} key={value} className={form.expiration_preset === value ? "is-active" : ""} onPressedChange={(pressed) => pressed && pickExpiry(value)}>{value === "custom" ? t("keys.expiryCustom") : t("keys.expiryDays", { count: Number(value) })}</AppicaToggle>)}</ToggleGroup><Field label={t("keys.formExpiry")}><TextInput type="datetime-local" value={form.expiration_date} onChange={(event) => setForm((current) => ({ ...current, expiration_preset: "custom", expiration_date: event.target.value }))} /></Field></SettingBlock>;
}

function KeyForm({ form, setForm, groups, rates, editing, selectedKey, onResetQuota, onResetRate }) {
  const { t, locale, formatCurrency } = useLocale();
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.checked }));
  const pickExpiry = (value) => setForm((current) => ({ ...current, expiration_preset: value, expiration_date: value === "custom" ? current.expiration_date : expiryDate(value) }));
  return <div className="console-key-form"><KeyBasics form={form} setForm={setForm} groups={groups} rates={rates} editing={editing} set={set} t={t} /><CustomKeySetting form={form} editing={editing} toggle={toggle} set={set} locale={locale} t={t} /><IpRestrictionSetting form={form} toggle={toggle} set={set} locale={locale} t={t} /><QuotaSetting form={form} toggle={toggle} set={set} editing={editing} selectedKey={selectedKey} onResetQuota={onResetQuota} formatCurrency={formatCurrency} locale={locale} t={t} /><RateLimitSetting form={form} toggle={toggle} set={set} editing={editing} selectedKey={selectedKey} onResetRate={onResetRate} formatCurrency={formatCurrency} locale={locale} t={t} /><ExpirationSetting form={form} setForm={setForm} toggle={toggle} pickExpiry={pickExpiry} locale={locale} t={t} /></div>;
}

function UsageDetail({ apiKey }) {
  const { locale, formatCurrency, formatNumber } = useLocale();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  useEffect(() => { let active = true; keysApi.getDailyUsage(apiKey.id, 30).then((result) => active && setState({ loading: false, error: "", items: result.items || [] })).catch((error) => active && setState({ loading: false, error: error.message, items: [] })); return () => { active = false; }; }, [apiKey.id]);
  if (state.loading) return <div className="console-detail-stack console-key-usage-skeleton" aria-hidden="true"><div className="console-detail-summary">{Array.from({ length: 2 }, (_, index) => <div key={index}><Skeleton /><Skeleton /></div>)}</div><Skeleton /></div>;
  if (state.error) return <ErrorState message={state.error} />;
  return <div className="console-detail-stack"><div className="console-detail-summary"><div><span>{translate(locale, "keys.totalSpend")}</span><strong>{formatCurrency(state.items.reduce((sum, item) => sum + Number(item.actual_cost || 0), 0))}</strong></div><div><span>Token</span><strong>{formatTokenMillions(state.items.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0))}</strong></div></div><LineChart data={state.items} valueKey="total_tokens" /></div>;
}

function ccsImportUrl(row, baseUrl, siteName, clientType) {
  const platform = row.group?.platform || "anthropic";
  const app = platform === "openai" ? "codex" : platform === "gemini" || clientType === "gemini" ? "gemini" : "claude";
  const endpoint = platform === "antigravity" ? `${baseUrl}/antigravity` : baseUrl;
  const script = `({request:{url:"{{baseUrl}}/v1/usage",method:"GET",headers:{"Authorization":"Bearer {{apiKey}}"}},extractor:function(response){return {isValid:response?.is_active??true,remaining:response?.remaining??response?.quota?.remaining??response?.balance,unit:response?.unit??"USD"}}})`;
  const params = new URLSearchParams([["resource", "provider"], ["app", app], ["name", siteName], ["homepage", baseUrl], ["endpoint", endpoint], ["apiKey", row.key], ["configFormat", "json"], ["usageEnabled", "true"], ["usageScript", btoa(script)], ["usageAutoInterval", "30"]]);
  if (platform === "openai") params.set("model", "gpt-6-astra");
  return `ccswitch://v1/import?${params.toString()}`;
}

function customKeyInvalid(form) {
  if (!form.use_custom_key) return false;
  const value = form.custom_key || "";
  return value.length < 16 || !/^[a-zA-Z0-9_-]+$/.test(value);
}

function keyFormWarning(form, locale) {
  if (!form.name.trim() || form.group_id === "") return translate(locale, "keys.addNameSelectGroup");
  if (customKeyInvalid(form)) return translate(locale, "keys.customKeyFormatInvalid");
  return "";
}

function keySortValue(row, key) {
  if (key === "current_concurrency") return Number(row.current_concurrency) || 0;
  if (["expires_at", "last_used_at", "created_at"].includes(key)) return row[key] ? new Date(row[key]).getTime() : null;
  return String(row[key] ?? "").toLocaleLowerCase();
}

function sortedKeyRows(items, sort) {
  const direction = sort.order === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftValue = keySortValue(left, sort.key);
    const rightValue = keySortValue(right, sort.key);
    if (leftValue === rightValue) return 0;
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    const comparison = typeof leftValue === "number"
      ? leftValue - rightValue
      : leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
    return comparison * direction;
  });
}

function shouldOmitStatus(editor, form) {
  return ["expired", "quota_exhausted"].includes(editor.item?.status) && form.status !== "active";
}

async function persistKey(editor, payload) {
  return editor.type === "edit" ? keysApi.update(editor.item.id, payload) : keysApi.create(payload);
}

function KeysTableContent({ state, columns, result, sort, setSort, paging, setPaging, load, openCreate, locale, t }) {
  const onSort = (key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); };
  if (state.loading && !result.items.length) return <><DataTable className="console-keys-table" columns={columns} rows={result.items} loading sortKey={sort.key} sortOrder={sort.order} onSort={onSort} /><PaginationSkeleton /></>;
  if (state.error && !result.items.length) return <ErrorState message={state.error} onRetry={load} />;
  const empty = <EmptyState icon="key" title={t("keys.noApiKeysYet")} action={<Button variant="primary" icon="plus" data-walkthrough="create-key" onClick={openCreate}>{t("keys.new")}</Button>} />;
  const rows = sortedKeyRows(result.items, sort);
  return <><DataTable className="console-keys-table" columns={columns} rows={rows} sortKey={sort.key} sortOrder={sort.order} onSort={onSort} empty={empty} /><Pagination page={paging.page} pageSize={paging.pageSize} total={result.total} pages={result.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;
}

function KeysTablePanel({ query, setQuery, setPaging, groups, settings, load, state, allColumns, hidden, toggleColumn, openCreate, columns, result, sort, setSort, paging, locale, t }) {
  const updateQuery = (key, value) => { setQuery((current) => ({ ...current, [key]: value })); setPaging((current) => ({ ...current, page: 1 })); };
  return <><Panel className="console-endpoint-panel"><EndpointPopover settings={settings} /></Panel><Panel className="console-keys-panel"><div className="console-table-page-toolbar"><div className="console-filter-row"><Field label={t("common.search")} className="is-wide"><div className="console-filter-search"><Icon name="search" size={16} /><TextInput value={query.search} onChange={(event) => updateQuery("search", event.target.value)} placeholder={t("keys.nameKey")} /></div></Field><Field label={t("keys.group")}><SelectInput value={query.group_id} onChange={(event) => updateQuery("group_id", event.target.value)}><option value="">{t("keys.allGroups")}</option><option value="0">{t("keys.noGroup")}</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</SelectInput></Field><Field label={t("common.status")}><SelectInput value={query.status} onChange={(event) => updateQuery("status", event.target.value)}><option value="">{t("common.all")}</option><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option><option value="quota_exhausted">{t("keys.quotaExhausted")}</option><option value="expired">{t("keys.expired")}</option></SelectInput></Field></div><div className="console-table-actions"><Button icon="refresh" onClick={load} loading={state.loading}>{t("common.refresh")}</Button><ColumnPicker columns={allColumns} hidden={hidden} onToggle={toggleColumn} alwaysVisible={["name", "actions"]} /><Button variant="primary" icon="plus" data-walkthrough="create-key" onClick={openCreate}>{t("keys.new")}</Button></div></div><KeysTableContent state={state} columns={columns} result={result} sort={sort} setSort={setSort} paging={paging} setPaging={setPaging} load={load} openCreate={openCreate} locale={locale} t={t} /></Panel></>;
}

function KeyEditorDialog({ editor, setEditor, busy, submit, form, setForm, groups, rates, setDialog, locale, t }) {
  const title = editor?.type === "edit" ? t("keys.editApiKey") : t("keys.new");
  const footer = <><Button onClick={() => setEditor(null)} disabled={busy}>{t("common.cancel")}</Button><Button variant="primary" onClick={submit} disabled={busy}>{busy ? t("common.loading") : t("common.save")}</Button></>;
  return <Modal open={Boolean(editor)} title={title} description={t("keys.subtitle")} onClose={() => setEditor(null)} size="large" footer={footer}><KeyForm form={form} setForm={setForm} groups={groups} rates={rates} editing={editor?.type === "edit"} selectedKey={editor?.item} onResetQuota={() => setDialog({ type: "resetQuota", item: editor.item })} onResetRate={() => setDialog({ type: "resetRate", item: editor.item })} /></Modal>;
}

function KeyUseDialogs({ dialog, setDialog, settings, t }) {
  return <><UseKeyModal open={dialog?.type === "use"} apiKey={dialog?.item?.key || ""} baseUrl={endpointItems(settings, "Default")[0].endpoint} platform={dialog?.item?.group?.platform || null} allowMessagesDispatch={dialog?.item?.group?.allow_messages_dispatch === true} onClose={() => setDialog(null)} /><Modal open={dialog?.type === "usage"} title={`${dialog?.item?.name || ""} · ${t("keys.usage")}`} onClose={() => setDialog(null)} size="large">{dialog?.item && <UsageDetail apiKey={dialog.item} />}</Modal></>;
}

function KeyResetDialogs({ dialog, setDialog, busy, remove, updateKey, locale, t }) {
  return <><ConfirmDialog open={dialog?.type === "delete"} title={t("keys.deleteTitle")} description={t("keys.deleteBody")} busy={busy} onClose={() => setDialog(null)} onConfirm={remove} /><ConfirmDialog open={dialog?.type === "resetQuota"} title={t("keys.resetQuotaUsage")} description={t("keys.usedQuotaWillReturn")} busy={busy} onClose={() => setDialog(null)} onConfirm={() => updateKey(dialog.item, { reset_quota: true }, t("keys.quotaUsageReset"))} /><ConfirmDialog open={dialog?.type === "resetRate"} title={t("keys.resetRateLimitUsage")} description={t("keys.n5Hour1Day")} busy={busy} onClose={() => setDialog(null)} onConfirm={() => updateKey(dialog.item, { reset_rate_limit_usage: true }, t("keys.rateLimitUsageReset"))} /></>;
}

function CcsDialog({ dialog, setDialog, importCcs, locale }) {
  return <Modal open={dialog?.type === "ccs"} title={translate(locale, "keys.importCcSwitch")} description={translate(locale, "keys.chooseTargetClientAntigravity")} onClose={() => setDialog(null)} size="small"><div className="console-ccs-options"><Button variant="primary" onClick={() => importCcs(dialog.item, "claude")}>Claude Code</Button><Button variant="primary" onClick={() => importCcs(dialog.item, "gemini")}>Gemini CLI</Button></div></Modal>;
}

function CreatedKeyDialog({ createdKey, setCreatedKey, t }) {
  return <Modal open={Boolean(createdKey)} title={t("keys.created")} description={t("keys.copyWarning")} onClose={() => setCreatedKey("")} size="small" footer={<Button variant="primary" onClick={() => setCreatedKey("")}>{t("common.confirm")}</Button>}><div className="console-created-key"><span className="console-code"><span>{createdKey}</span><CopyButton value={createdKey} label={t("common.copy")} /></span></div></Modal>;
}

export function KeysPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { notify, settings } = useConsole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState({ search: "", status: "", group_id: "" });
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState({ key: "created_at", order: "desc" });
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [usageStats, setUsageStats] = useState({});
  const [groups, setGroups] = useState([]);
  const [rates, setRates] = useState({});
  const [groupsReady, setGroupsReady] = useState(false);
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
  useEffect(() => { let active = true; Promise.allSettled([groupsApi.available(), groupsApi.rates()]).then(([groupResult, rateResult]) => { if (!active) return; const groupData = groupResult.value; setGroups(Array.isArray(groupData) ? groupData : groupData?.items || []); setRates(rateResult.value?.rates || rateResult.value || {}); setGroupsReady(true); }); return () => { active = false; }; }, []);

  const openCreate = useCallback(() => { setForm({ ...emptyForm, name: "plus", group_id: groups[0]?.id || "", expiration_date: expiryDate(30) }); setEditor({ type: "create" }); }, [groups]);
  const createRequested = searchParams.get("create") === "1";
  useEffect(() => {
    if (!createRequested || !groupsReady || editor) return;
    openCreate();
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [createRequested, editor, groupsReady, openCreate, searchParams, setSearchParams]);
  const openEdit = (item) => { setForm(formForKey(item)); setEditor({ type: "edit", item }); };
  const submit = async () => {
    const warning = keyFormWarning(form, locale);
    if (warning) return notify("warning", warning);
    setBusy(true);
    try {
      const payload = formPayload(form, editor.type === "edit");
      if (shouldOmitStatus(editor, form)) delete payload.status;
      const saved = await persistKey(editor, payload);
      setEditor(null); if (editor.type === "create" && saved.key) setCreatedKey(saved.key); notify("success", editor.type === "edit" ? t("keys.updated") : t("keys.created")); load();
    } catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const updateKey = async (item, payload, success) => { setBusy(true); try { const saved = await keysApi.update(item.id, payload); if (editor?.item?.id === item.id && saved) setEditor((current) => current ? { ...current, item: saved } : current); notify("success", success || t("common.saved")); setDialog(null); await load(); } catch (error) { notify("error", error.message); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await keysApi.remove(dialog.item.id); notify("success", t("keys.deleted")); setDialog(null); load(); } catch (error) { notify("error", error.message); } finally { setBusy(false); } };
  const changeGroup = async (item, group_id) => { try { await keysApi.update(item.id, { group_id: group_id === "" ? null : Number(group_id) }); notify("success", t("common.saved")); load(); } catch (error) { notify("error", error.message); } };
  const importCcs = (item, clientType = "claude") => { const base = endpointItems(settings, "Default")[0].endpoint; window.location.href = ccsImportUrl(item, base, String(settings?.site_name || "WayX"), clientType); };

  const allColumns = useMemo(() => [
    { key: "name", label: t("common.name"), sortable: true, render: (row) => <div className="console-key-title"><strong>{row.name}</strong>{Boolean(row.ip_whitelist?.length || row.ip_blacklist?.length) && <Icon name="shield" size={14} />}</div> },
    { key: "key", label: t("keys.key"), render: (row) => <span className="console-code"><span>{maskKey(row.key)}</span><CopyButton value={row.key} /></span> },
    { key: "group", label: t("keys.group"), render: (row) => <GroupSelect compact value={row.group_id ?? ""} groups={groups} rates={rates} onChange={(groupId) => changeGroup(row, groupId)} /> },
    { key: "current_concurrency", label: t("keys.concurrency"), sortable: true, align: "center", render: (row) => <span className={`console-concurrency ${Number(row.current_concurrency) ? "is-active" : ""}`}>{row.current_concurrency || 0}</span> },
    { key: "usage", label: t("keys.usage2"), render: (row) => <UsageCell row={row} stats={usageStats} formatCurrency={formatCurrency} locale={locale} /> },
    { key: "rate_limit", label: t("keys.rateLimits"), render: (row) => <RateLimitCell row={row} onReset={() => setDialog({ type: "resetRate", item: row })} formatCurrency={formatCurrency} locale={locale} /> },
    { key: "expires_at", label: t("keys.expires"), sortable: true, render: (row) => <span className={row.expires_at && new Date(row.expires_at) < new Date() ? "console-danger-text" : ""}>{row.expires_at ? formatDate(row.expires_at) : t("common.never")}</span> },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={row.status} label={statusLabel(row.status, locale)} /> },
    { key: "last_used_at", label: t("keys.lastUsed"), sortable: true, render: (row) => row.last_used_at ? formatDate(row.last_used_at) : "—" },
    { key: "last_used_ip", label: t("keys.lastUsedIp"), render: (row) => row.last_used_ip || "—" },
    { key: "created_at", label: t("keys.created2"), sortable: true, render: (row) => <KeyCreatedTime value={row.created_at} locale={locale} /> },
    { key: "actions", label: t("common.actions"), render: (row) => <div className="console-key-actions"><InlineButton className="console-key-use-action" variant="soft" icon="terminal" data-walkthrough="use-key" aria-label={t("keys.useKey")} title={t("keys.useKey")} onClick={() => setDialog({ type: "use", item: row })}>{t("keys.useKey")}</InlineButton>{settings?.hide_ccs_import_button !== true && <InlineButton className="console-key-cc-switch-action" icon="upload" aria-label="CC Switch" title="CC Switch" onClick={() => row.group?.platform === "antigravity" ? setDialog({ type: "ccs", item: row }) : importCcs(row)}>CC Switch</InlineButton>}<IconButton icon="edit" label={t("common.edit")} onClick={() => openEdit(row)} /><IconButton icon={row.status === "active" ? "pause" : "play"} label={t("keys.toggle")} onClick={() => updateKey(row, { status: row.status === "active" ? "inactive" : "active" })} /><IconButton icon="trash" label={t("common.delete")} onClick={() => setDialog({ type: "delete", item: row })} /></div> },
  ], [formatCurrency, formatDate, groups, locale, rates, settings, t, usageStats]);
  const columns = allColumns.filter((column) => ["name", "actions"].includes(column.key) || !hidden.has(column.key));

  return <Page title={t("keys.title")} className="console-keys-page"><KeysTablePanel query={query} setQuery={setQuery} setPaging={setPaging} groups={groups} settings={settings} load={load} state={state} allColumns={allColumns} hidden={hidden} toggleColumn={toggleColumn} openCreate={openCreate} columns={columns} result={result} sort={sort} setSort={setSort} paging={paging} locale={locale} t={t} /><KeyEditorDialog editor={editor} setEditor={setEditor} busy={busy} submit={submit} form={form} setForm={setForm} groups={groups} rates={rates} setDialog={setDialog} locale={locale} t={t} /><KeyUseDialogs dialog={dialog} setDialog={setDialog} settings={settings} t={t} /><KeyResetDialogs dialog={dialog} setDialog={setDialog} busy={busy} remove={remove} updateKey={updateKey} locale={locale} t={t} /><CcsDialog dialog={dialog} setDialog={setDialog} importCcs={importCcs} locale={locale} /><CreatedKeyDialog createdKey={createdKey} setCreatedKey={setCreatedKey} t={t} /></Page>;
}
