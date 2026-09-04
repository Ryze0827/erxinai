import { useCallback, useEffect, useState } from "react";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { AlertTitle } from "@appica/ui-react/alert";
import { membershipApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, InlineButton, Modal, Page, Pagination, Panel, StatusBadge, TableSkeleton, TextArea, TextInput, Toggle, TruncatedText } from "../UI";

const EMPTY_FORM = { name: "", threshold: "", bonus_percent: "", description: "", enabled: true };

export function MembershipAdminPage() {
  const { notify } = useConsole();
  const { t, formatDate, formatUsd } = useLocale();
  const [levels, setLevels] = useState([]);
  const [grants, setGrants] = useState({ items: [], total: 0 });
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [state, setState] = useState({ loading: true, error: "", busy: false });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [disableTarget, setDisableTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [nextLevels, nextGrants] = await Promise.all([
        membershipApi.levels(signal),
        membershipApi.grants({ page: paging.page, page_size: paging.pageSize }, signal),
      ]);
      if (!signal?.aborted) {
        setLevels(nextLevels || []);
        setGrants(nextGrants || { items: [], total: 0 });
        setState((current) => ({ ...current, loading: false }));
      }
    } catch (error) {
      if (!signal?.aborted) setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }, [paging]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const startEdit = (level) => {
    setEditing(level);
    setForm({
      name: level.name,
      threshold: String(level.threshold),
      bonus_percent: String(level.bonus_percent),
      description: level.description || "",
      enabled: level.enabled,
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, busy: true }));
    const payload = {
      name: form.name.trim(),
      threshold: Number(form.threshold),
      bonus_percent: Number(form.bonus_percent),
      description: form.description.trim(),
      enabled: form.enabled,
    };
    try {
      if (editing) await membershipApi.updateLevel(editing.id, payload);
      else await membershipApi.createLevel(payload);
      notify("success", t("common.saved"));
      resetForm();
      await load();
    } catch (error) {
      notify("error", error.message);
    } finally {
      setState((current) => ({ ...current, busy: false }));
    }
  };
  const disableLevel = async () => {
    if (!disableTarget) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      await membershipApi.disableLevel(disableTarget.id);
      notify("success", t("common.saved"));
      setDisableTarget(null);
      await load();
    } catch (error) {
      notify("error", error.message);
    } finally {
      setState((current) => ({ ...current, busy: false }));
    }
  };
  const resolveReview = async (outcome) => {
    if (!reviewTarget || reviewNote.trim().length < 3) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      await membershipApi.resolveGrant(reviewTarget.row.payment_order_id, {
        operation: reviewTarget.operation,
        outcome,
        note: reviewNote.trim(),
      });
      notify("success", t("common.saved"));
      setReviewTarget(null);
      setReviewNote("");
      await load();
    } catch (error) {
      notify("error", error.message);
    } finally {
      setState((current) => ({ ...current, busy: false }));
    }
  };

  const levelColumns = [
    { key: "name", label: t("common.name") },
    { key: "threshold", label: t("membership.thresholdLabel"), render: (row) => <span className="tabular-nums">{formatUsd(row.threshold)}</span> },
    { key: "bonus_percent", label: t("membership.bonusRate"), render: (row) => <span className="tabular-nums">{Number(row.bonus_percent)}%</span> },
    { key: "enabled", label: t("common.status"), render: (row) => <StatusBadge status={row.enabled ? "active" : "disabled"} label={row.enabled ? t("common.enabled") : t("common.disabled")} /> },
    { key: "actions", label: t("common.actions"), render: (row) => <div className="console-inline-actions"><InlineButton icon="edit" onClick={() => startEdit(row)}>{t("common.edit")}</InlineButton>{row.enabled && Number(row.threshold) !== 0 && <InlineButton variant="danger" onClick={() => setDisableTarget(row)}>{t("membership.disable")}</InlineButton>}</div> },
  ];
  const grantColumns = [
    { key: "payment_order_id", label: t("membership.orderId") },
    { key: "user_id", label: t("membership.userId") },
    { key: "level_name", label: t("membership.level") },
    { key: "recharge_amount", label: t("membership.rechargeAmount"), render: (row) => <span className="tabular-nums">{formatUsd(row.recharge_amount)}</span> },
    { key: "bonus_amount", label: t("membership.bonusAmount"), render: (row) => <span className="tabular-nums">{formatUsd(row.bonus_amount)}</span> },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={row.status} /> },
    { key: "reversal_status", label: t("membership.reversalStatus"), render: (row) => row.reversal_status === "none" ? "—" : <StatusBadge status={row.reversal_status} /> },
    { key: "error_message", label: t("membership.processingNote"), render: (row) => <TruncatedText value={row.reversal_error_message || row.error_message} /> },
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
    { key: "actions", label: t("common.actions"), render: (row) => <div className="console-inline-actions">{row.status === "review_required" && <InlineButton onClick={() => setReviewTarget({ row, operation: "credit" })}>{t("membership.resolve")}</InlineButton>}{row.reversal_status === "review_required" && <InlineButton onClick={() => setReviewTarget({ row, operation: "reversal" })}>{t("membership.resolveReversal")}</InlineButton>}</div> },
  ];

  return <Page title={t("membership.adminTitle")}>
    {membershipApi.isMock && <Alert variant="info" role="note"><AlertIcon><Icon name="info" size={18} /></AlertIcon><AlertTitle>{t("membership.mockTitle")}</AlertTitle><AlertDescription>{t("membership.mockAdminDescription")}</AlertDescription></Alert>}
    <Panel title={editing ? t("membership.editLevel") : t("membership.createLevel")} eyebrow={t("membership.securityHint")}>
      <form className="console-form-grid p-6" onSubmit={submit}>
        <Field label={t("common.name")}><TextInput required maxLength={64} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
        <Field label={t("membership.thresholdLabel")} hint={t("membership.thresholdHint")}><TextInput required type="number" min="0" step="0.01" value={form.threshold} onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))} /></Field>
        <Field label={t("membership.bonusRate")} hint={t("membership.bonusHint")}><TextInput required type="number" min="0" max="100" step="0.0001" value={form.bonus_percent} onChange={(event) => setForm((current) => ({ ...current, bonus_percent: event.target.value }))} /></Field>
        <Field label={t("common.description")}><TextArea maxLength={240} rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
        <Toggle checked={form.enabled} disabled={Number(form.threshold) === 0} label={t("membership.enableLevel")} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
        <div className="console-form-actions"><Button type="button" onClick={resetForm}>{t("common.cancel")}</Button><Button type="submit" variant="primary" loading={state.busy}>{editing ? t("common.save") : t("common.create")}</Button></div>
      </form>
    </Panel>
    <Panel title={t("membership.levels")} actions={<Button icon="refresh" loading={state.loading} onClick={() => load()}>{t("common.refresh")}</Button>}>
      {state.loading && !levels.length ? <TableSkeleton columns={5} /> : state.error && !levels.length ? <ErrorState message={state.error} onRetry={() => load()} /> : <DataTable columns={levelColumns} rows={levels} empty={<EmptyState icon="gift" title={t("membership.noLevels")} />} />}
    </Panel>
    <Panel title={t("membership.grantRecords")} eyebrow={t("membership.grantRecordsHint")}>
      {state.loading && !grants.items.length ? <TableSkeleton columns={10} /> : <><DataTable columns={grantColumns} rows={grants.items} rowKey="payment_order_id" empty={<EmptyState icon="order" />} /><Pagination page={paging.page} pageSize={paging.pageSize} total={grants.total} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>}
    </Panel>
    <ConfirmDialog open={Boolean(disableTarget)} title={t("membership.disableTitle")} description={t("membership.disableDescription", { level: disableTarget?.name || "" })} confirmLabel={t("membership.disable")} busy={state.busy} onConfirm={disableLevel} onClose={() => setDisableTarget(null)} />
    <Modal open={Boolean(reviewTarget)} title={t("membership.resolveTitle")} size="small" onClose={() => { setReviewTarget(null); setReviewNote(""); }} footer={<><Button disabled={state.busy || reviewNote.trim().length < 3} onClick={() => resolveReview("not_applied")}>{t("membership.notApplied")}</Button><Button variant="primary" disabled={state.busy || reviewNote.trim().length < 3} onClick={() => resolveReview("applied")}>{t("membership.applied")}</Button></>}><dl className="console-order-detail mb-5"><div><dt>{t("membership.orderId")}</dt><dd>{reviewTarget?.row.payment_order_id || "—"}</dd></div><div><dt>{t("membership.idempotencyKey")}</dt><dd className="break-all">{reviewTarget?.operation === "reversal" ? reviewTarget?.row.pending_reversal_key || "—" : `wayx-membership-bonus-order-${reviewTarget?.row.payment_order_id || ""}`}</dd></div>{reviewTarget?.operation === "reversal" && <div><dt>{t("membership.pendingAmount")}</dt><dd>{formatUsd(reviewTarget?.row.pending_reversal_amount)}</dd></div>}</dl><Field label={t("membership.reviewEvidence")} hint={t("membership.reviewEvidenceHint")}><TextArea rows="4" maxLength={500} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></Field></Modal>
  </Page>;
}
