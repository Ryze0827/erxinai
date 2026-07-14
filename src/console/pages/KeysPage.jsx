import { useCallback, useEffect, useRef, useState } from "react";
import { groupsApi, keysApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, CopyButton, DataTable, EmptyState, ErrorState, Field, IconButton, LineChart, Modal, Page, Pagination, Panel, ProgressBar, SelectInput, Spinner, StatusBadge, TextArea, TextInput, Toggle } from "../UI";
import { maskKey, statusLabel } from "../utils";

const blankForm = {
  name: "", group_id: "", custom_key: "", ip_whitelist: "", ip_blacklist: "", quota: "",
  expiration_date: "", rate_limit_5h: "", rate_limit_1d: "", rate_limit_7d: "", status: "active",
};

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toLines(value) {
  return String(value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function editForm(key) {
  return {
    name: key.name || "", group_id: key.group_id ?? "", custom_key: "",
    ip_whitelist: (key.ip_whitelist || []).join("\n"), ip_blacklist: (key.ip_blacklist || []).join("\n"),
    quota: key.quota || "", expiration_date: dateTimeLocal(key.expires_at), rate_limit_5h: key.rate_limit_5h || "",
    rate_limit_1d: key.rate_limit_1d || "", rate_limit_7d: key.rate_limit_7d || "", status: key.status === "active" ? "active" : "inactive",
  };
}

function formPayload(form, editing) {
  const payload = {
    name: form.name.trim(), group_id: Number(form.group_id), ip_whitelist: toLines(form.ip_whitelist),
    ip_blacklist: toLines(form.ip_blacklist), quota: Number(form.quota) || 0,
    rate_limit_5h: Number(form.rate_limit_5h) || 0, rate_limit_1d: Number(form.rate_limit_1d) || 0,
    rate_limit_7d: Number(form.rate_limit_7d) || 0,
  };
  if (editing) return { ...payload, status: form.status, expires_at: form.expiration_date ? new Date(form.expiration_date).toISOString() : "" };
  if (form.custom_key.trim()) payload.custom_key = form.custom_key.trim();
  if (form.expiration_date) payload.expires_in_days = Math.max(1, Math.ceil((new Date(form.expiration_date).getTime() - Date.now()) / 86400000));
  return payload;
}

function QuotaCell({ row, formatCurrency, t }) {
  if (!Number(row.quota)) return <span className="console-muted">{t("common.unlimited")}</span>;
  const percent = Number(row.quota_used || 0) / Number(row.quota) * 100;
  return <div className="console-table-progress"><span>{formatCurrency(row.quota_used)} / {formatCurrency(row.quota)}</span><ProgressBar value={percent} tone={percent >= 90 ? "danger" : "primary"} /></div>;
}

function KeyForm({ form, setForm, groups, editing }) {
  const { t, locale } = useLocale();
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="console-form-grid">
    <Field label={t("keys.formName")}><TextInput value={form.name} onChange={set("name")} autoFocus required /></Field>
    <Field label={t("keys.group")}><SelectInput value={form.group_id} onChange={set("group_id")} required><option value="">{locale === "zh" ? "选择分组" : "Select a group"}</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name} · {group.platform}</option>)}</SelectInput></Field>
    {!editing && <Field label={t("keys.formCustom")} hint={locale === "zh" ? "留空则自动生成" : "Leave blank to generate automatically."} className="is-full"><TextInput value={form.custom_key} onChange={set("custom_key")} placeholder="sk-…" autoComplete="off" /></Field>}
    <Field label={t("keys.formQuota")}><TextInput type="number" min="0" step="0.01" value={form.quota} onChange={set("quota")} /></Field>
    <Field label={editing ? t("keys.formExpiry") : t("keys.formExpiryDays")}><TextInput type="datetime-local" value={form.expiration_date} onChange={set("expiration_date")} /></Field>
    <Field label={t("keys.formAllow")} hint={locale === "zh" ? "每行一个 IP 或 CIDR" : "One IP or CIDR per line."}><TextArea rows="4" value={form.ip_whitelist} onChange={set("ip_whitelist")} /></Field>
    <Field label={t("keys.formDeny")} hint={locale === "zh" ? "黑名单优先于白名单" : "Denylist takes precedence."}><TextArea rows="4" value={form.ip_blacklist} onChange={set("ip_blacklist")} /></Field>
    <div className="console-field-group is-full"><strong>{locale === "zh" ? "周期限流（美元）" : "Rolling spend limits (USD)"}</strong><div className="console-form-grid console-form-grid--3"><Field label={t("keys.formRate5h")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_5h} onChange={set("rate_limit_5h")} /></Field><Field label={t("keys.formRate1d")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_1d} onChange={set("rate_limit_1d")} /></Field><Field label={t("keys.formRate7d")}><TextInput type="number" min="0" step="0.01" value={form.rate_limit_7d} onChange={set("rate_limit_7d")} /></Field></div></div>
    {editing && <Field label={t("common.status")} className="is-full"><Toggle checked={form.status === "active"} onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked ? "active" : "inactive" }))} label={form.status === "active" ? t("common.enabled") : t("common.disabled")} /></Field>}
  </div>;
}

function UsageDetail({ apiKey }) {
  const { t, locale, formatCurrency, formatNumber } = useLocale();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  useEffect(() => {
    let active = true;
    keysApi.getDailyUsage(apiKey.id, 30).then((result) => active && setState({ loading: false, error: "", items: result.items || [] })).catch((error) => active && setState({ loading: false, error: error.message, items: [] }));
    return () => { active = false; };
  }, [apiKey.id]);
  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState message={state.error} />;
  return <div className="console-detail-stack"><div className="console-detail-summary"><div><span>{locale === "zh" ? "累计消费" : "Total spend"}</span><strong>{formatCurrency(state.items.reduce((sum, item) => sum + Number(item.actual_cost || 0), 0))}</strong></div><div><span>{t("usage.tokens")}</span><strong>{formatNumber(state.items.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0))}</strong></div></div><LineChart data={state.items} valueKey="total_tokens" /></div>;
}

export function KeysPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { notify } = useConsole();
  const [query, setQuery] = useState({ search: "", status: "", group_id: "" });
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [groups, setGroups] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const [createdKey, setCreatedKey] = useState("");
  const requestRef = useRef(null);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ loading: true, error: "" });
    try {
      const data = await keysApi.list(paging.page, paging.pageSize, { ...query, sort_by: "created_at", sort_order: "desc" }, controller.signal);
      setResult({ items: data.items || [], total: Number(data.total || 0), pages: Number(data.pages || 1) });
      setState({ loading: false, error: "" });
    } catch (error) {
      if (error.name !== "AbortError") setState({ loading: false, error: error.message });
    }
  }, [paging, query]);

  useEffect(() => { load(); return () => requestRef.current?.abort(); }, [load]);
  useEffect(() => {
    let active = true;
    groupsApi.available().then((data) => active && setGroups(Array.isArray(data) ? data : data.items || [])).catch(() => active && setGroups([]));
    return () => { active = false; };
  }, []);

  const openCreate = () => { setForm({ ...blankForm, group_id: groups[0]?.id || "" }); setModal({ type: "form" }); };
  const openEdit = (key) => { setForm(editForm(key)); setModal({ type: "form", item: key }); };
  const submit = async () => {
    if (!form.name.trim() || form.group_id === "") return notify("warning", locale === "zh" ? "请填写名称并选择分组。" : "Add a name and select a group.");
    setBusy(true);
    try {
      const payload = formPayload(form, Boolean(modal.item));
      if (["expired", "quota_exhausted"].includes(modal.item?.status) && form.status !== "active") delete payload.status;
      const saved = modal.item ? await keysApi.update(modal.item.id, payload) : await keysApi.create(payload);
      setModal(null);
      if (!modal.item) setCreatedKey(saved.key || form.custom_key);
      notify("success", modal.item ? t("keys.updated") : t("keys.created"));
      load();
    } catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await keysApi.remove(modal.item.id); notify("success", t("keys.deleted")); setModal(null); load(); }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const toggle = async (key) => {
    try { await keysApi.update(key.id, { status: key.status === "active" ? "inactive" : "active" }); notify("success", t("common.saved")); load(); }
    catch (error) { notify("error", error.message); }
  };

  const columns = [
    { key: "name", label: t("common.name"), render: (row) => <div className="console-key-name"><strong>{row.name}</strong><small>{row.group?.platform || "—"}</small></div> },
    { key: "key", label: t("keys.key"), render: (row) => <span className="console-code"><span>{maskKey(row.key)}</span><CopyButton value={row.key} /></span> },
    { key: "group", label: t("keys.group"), render: (row) => <span className="console-chip">{row.group?.name || "—"}</span> },
    { key: "quota", label: t("keys.quota"), render: (row) => <QuotaCell row={row} formatCurrency={formatCurrency} t={t} /> },
    { key: "expires_at", label: t("keys.expires"), render: (row) => row.expires_at ? formatDate(row.expires_at) : t("common.never") },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={row.status} label={statusLabel(row.status, locale)} /> },
    { key: "actions", label: t("common.actions"), align: "right", render: (row) => <div className="console-inline-actions"><IconButton icon="eye" label={t("keys.usage")} onClick={() => setModal({ type: "usage", item: row })} /><IconButton icon={row.status === "active" ? "play" : "refresh"} label={t("keys.toggle")} onClick={() => toggle(row)} /><IconButton icon="edit" label={t("common.edit")} onClick={() => openEdit(row)} /><IconButton icon="trash" label={t("common.delete")} onClick={() => setModal({ type: "delete", item: row })} /></div> },
  ];

  return <Page title={t("keys.title")} subtitle={t("keys.subtitle")} actions={<Button variant="primary" icon="plus" onClick={openCreate}>{t("keys.new")}</Button>}>
    <Panel><div className="console-toolbar"><Field label={t("common.search")} className="is-wide"><TextInput value={query.search} onChange={(event) => { setQuery((current) => ({ ...current, search: event.target.value })); setPaging((current) => ({ ...current, page: 1 })); }} placeholder={locale === "zh" ? "名称或密钥" : "Name or key"} /></Field><Field label={t("common.status")}><SelectInput value={query.status} onChange={(event) => { setQuery((current) => ({ ...current, status: event.target.value })); setPaging((current) => ({ ...current, page: 1 })); }}><option value="">{t("common.all")}</option><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option><option value="quota_exhausted">{locale === "zh" ? "额度已用尽" : "Quota exhausted"}</option><option value="expired">{locale === "zh" ? "已过期" : "Expired"}</option></SelectInput></Field><Field label={t("keys.group")}><SelectInput value={query.group_id} onChange={(event) => { setQuery((current) => ({ ...current, group_id: event.target.value })); setPaging((current) => ({ ...current, page: 1 })); }}><option value="">{t("common.all")}</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</SelectInput></Field><Button icon="refresh" onClick={load}>{t("common.refresh")}</Button></div>{state.loading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : <><DataTable columns={columns} rows={result.items} empty={<EmptyState icon="key" title={locale === "zh" ? "还没有 API 密钥" : "No API keys yet"} action={<Button variant="primary" icon="plus" onClick={openCreate}>{t("keys.new")}</Button>} />} /><Pagination page={paging.page} pageSize={paging.pageSize} total={result.total} pages={result.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>}</Panel>
    <Panel title={locale === "zh" ? "快速接入" : "Quick start"}><div className="console-panel-body console-guide"><div><span>1</span><p>{locale === "zh" ? "创建并复制一个 API 密钥。" : "Create and securely copy an API key."}</p></div><div><span>2</span><p>{locale === "zh" ? "将网关地址配置到兼容 OpenAI 的客户端。" : "Point your OpenAI-compatible client at this gateway."}</p></div><pre><code>{`curl ${window.location.origin}/v1/models \\\n  -H "Authorization: Bearer sk-…"`}</code><CopyButton value={`curl ${window.location.origin}/v1/models -H "Authorization: Bearer sk-…"`} /></pre></div></Panel>
    <Modal open={modal?.type === "form"} title={modal?.item ? t("common.edit") : t("keys.new")} description={t("keys.subtitle")} onClose={() => setModal(null)} size="large" footer={<><Button onClick={() => setModal(null)} disabled={busy}>{t("common.cancel")}</Button><Button variant="primary" onClick={submit} disabled={busy}>{busy ? t("common.loading") : t("common.save")}</Button></>}><KeyForm form={form} setForm={setForm} groups={groups} editing={Boolean(modal?.item)} /></Modal>
    <Modal open={modal?.type === "usage"} title={`${modal?.item?.name || ""} · ${t("keys.usage")}`} onClose={() => setModal(null)} size="large">{modal?.item && <UsageDetail apiKey={modal.item} />}</Modal>
    <ConfirmDialog open={modal?.type === "delete"} title={t("keys.deleteTitle")} description={t("keys.deleteBody")} busy={busy} onClose={() => setModal(null)} onConfirm={remove} />
    <Modal open={Boolean(createdKey)} title={t("keys.created")} description={t("keys.copyWarning")} onClose={() => setCreatedKey("")} size="small" footer={<Button variant="primary" onClick={() => setCreatedKey("")}>{t("common.confirm")}</Button>}><div className="console-created-key"><span className="console-code"><span>{createdKey}</span><CopyButton value={createdKey} label={t("common.copy")} /></span></div></Modal>
  </Page>;
}
