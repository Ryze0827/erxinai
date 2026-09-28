import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@appica/ui-react/checkbox";
import { adminInspectionApi } from "../../api/admin";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, Page, Pagination, Panel, StatusBadge, TableSkeleton, TextArea } from "../UI";
import { mergeGroupRateEntries, normalizeInspectionEmails, RATE_TIERS, runRateInspection } from "./rateInspection";

const INSPECTION_GROUP_NAMES = new Set([
  "Pro号池",
  "Pro号池 (强制开启Fast)",
]);

const COPY = {
  zh: {
    title: "用户倍率巡检", start: "开始巡检", running: "巡检中", cancel: "取消巡检", correct: "批量纠正", correcting: "纠正中", rules: "充值档位规则",
    description: "仅巡检 Pro号池 和 Pro号池 (强制开启Fast)。按历史累计正向充值匹配最高档位，包含管理员加款，扣款不冲减累计值。以下倍率已在原策略数值上统一增加 0.04。",
    inspectUsers: "巡检用户", inspectUsersHint: "支持换行、逗号、分号或空格分隔；留空则巡检全部用户。", inspectUsersPlaceholder: "例如：alice@example.com\nbob@example.com", missingEmails: "未找到邮箱：",
    minimum: "历史总充值（USD）", group: "分组", results: "异常与未完成项目", user: "用户", total: "历史总充值（USD）", expected: "预期倍率", current: "当前倍率", source: "倍率来源", status: "巡检结果",
    custom: "用户专属", inherited: "分组默认", mismatch: "倍率不符", invalid: "倍率数据缺失", failed: "充值读取失败", selectAll: "全选异常倍率", empty: "尚未巡检", emptyHint: "点击「开始巡检」检查两个 Pro 号池的用户倍率。", clean: "未发现倍率异常", cleanHint: "本次已检查的用户倍率均符合规则。", noChecks: "没有可检查的用户", noChecksHint: "用户未达到充值门槛。",
    incomplete: "巡检未完整完成：部分用户充值数据读取失败，请重新巡检。", cancelled: "巡检已取消，请重新开始以获得完整结果。", processed: "已处理用户", checked: "已检查用户分组", skipped: "无适用规则用户", abnormal: "异常用户", failures: "读取失败用户", completed: "巡检时间", selectedRows: "已选择 {count} 条异常记录", correctionFailed: "批量纠正未完成，请检查失败项后重试。", correctionSucceeded: "已纠正 {count} 条倍率记录。", loading: "正在加载号池", noGroups: "没有找到两个指定的 Pro 号池",
    errors: { NO_INSPECTION_GROUPS: "没有找到两个指定的 Pro 号池。", NO_INSPECTION_EMAILS: "请输入至少一个有效邮箱，或清空输入以巡检全部用户。", INVALID_GROUP_RATES: "号池专属倍率数据不完整，无法完成巡检。", INVALID_USER_PAGE: "用户列表数据不完整，无法完成巡检。", USER_LIST_CHANGED: "巡检期间用户列表发生变化，请重新巡检。", GROUP_LIST_CHANGED: "目标号池已停用或不存在，请重新巡检。" },
  },
  en: {
    title: "User rate inspection", start: "Run inspection", running: "Inspecting", cancel: "Cancel inspection", correct: "Correct selected", correcting: "Correcting", rules: "Recharge tiers",
    description: "Only the two selected Pro pools are inspected. The highest qualifying lifetime positive recharge tier includes administrator credits; deductions do not reduce it. Rates below include the +0.04 increase.",
    inspectUsers: "Users to inspect", inspectUsersHint: "Separate emails with new lines, commas, semicolons, or spaces. Leave empty to inspect all users.", inspectUsersPlaceholder: "For example: alice@example.com\nbob@example.com", missingEmails: "Emails not found: ",
    minimum: "Lifetime recharge (USD)", group: "Group", results: "Mismatches and incomplete checks", user: "User", total: "Lifetime recharge (USD)", expected: "Expected rate", current: "Current rate", source: "Rate source", status: "Result",
    custom: "User override", inherited: "Pool default", mismatch: "Rate mismatch", invalid: "Missing rate data", failed: "Recharge unavailable", selectAll: "Select all mismatches", empty: "No inspection yet", emptyHint: "Run an inspection to check the two selected Pro pools.", clean: "No rate mismatches found", cleanHint: "All inspected user rates match the rules.", noChecks: "No eligible users", noChecksHint: "Users are below the recharge thresholds.",
    incomplete: "Inspection is incomplete: some recharge totals could not be loaded. Run it again.", cancelled: "Inspection cancelled. Run it again for complete results.", processed: "Users processed", checked: "User groups checked", skipped: "Users without applicable rules", abnormal: "Users with mismatches", failures: "Failed users", completed: "Inspected at", selectedRows: "{count} mismatch(es) selected", correctionFailed: "Batch correction was incomplete. Review failed items and retry.", correctionSucceeded: "Corrected {count} rate record(s).", loading: "Loading pools", noGroups: "The two specified Pro pools were not found",
    errors: { NO_INSPECTION_GROUPS: "The two specified Pro pools were not found.", NO_INSPECTION_EMAILS: "Enter at least one valid email, or clear the field to inspect all users.", INVALID_GROUP_RATES: "Pool rate data is incomplete. Inspection could not finish.", INVALID_USER_PAGE: "User list data is incomplete. Inspection could not finish.", USER_LIST_CHANGED: "The user list changed during inspection. Please run it again.", GROUP_LIST_CHANGED: "A target pool is inactive or missing. Please run it again." },
  },
};

function eligibleGroups(groups) {
  if (!Array.isArray(groups)) throw new Error("INVALID_GROUP_RATES");
  return groups.filter((group) => group.status === "active" && INSPECTION_GROUP_NAMES.has(String(group.name || "").normalize("NFKC").trim())).map((group) => ({ ...group, rule: "pro" }));
}

export function RateInspectionPage() {
  const { notify } = useConsole();
  const { locale, formatDate } = useLocale();
  const c = COPY[locale === "zh" ? "zh" : "en"];
  const [groupsState, setGroupsState] = useState({ loading: true, error: "", items: [] });
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ loading: false, error: "", result: null, progress: null });
  const [correction, setCorrection] = useState({ loading: false, error: "" });
  const [emailInput, setEmailInput] = useState("");
  const [selectedRows, setSelectedRows] = useState(() => new Map());
  const [page, setPage] = useState(1);
  const controllerRef = useRef(null);
  const number = (value) => value == null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(value);
  const errorText = (error) => c.errors[error] || error;
  const inspectionEmails = normalizeInspectionEmails(emailInput);

  useEffect(() => {
    const controller = new AbortController();
    setGroupsState({ loading: true, error: "", items: [] });
    adminInspectionApi.groups(controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setGroupsState({ loading: false, error: "", items: eligibleGroups(data) });
    }).catch((error) => {
      if (!controller.signal.aborted) setGroupsState({ loading: false, error: error.message, items: [] });
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const inspect = async () => {
    if (controllerRef.current || !groupsState.items.length) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPage(1);
    setSelectedRows(new Map());
    setCorrection({ loading: false, error: "" });
    setState({ loading: true, error: "", result: null, progress: null });
    try {
      const groups = eligibleGroups(await adminInspectionApi.groups(controller.signal));
      const initialIds = new Set(groupsState.items.map((group) => String(group.id)));
      if (groups.length !== initialIds.size || groups.some((group) => !initialIds.has(String(group.id)))) throw new Error("GROUP_LIST_CHANGED");
      const result = await runRateInspection({ api: adminInspectionApi, groups, signal: controller.signal, userEmails: inspectionEmails.length ? inspectionEmails : undefined, onProgress: (progress) => {
        if (!controller.signal.aborted) setState((value) => ({ ...value, progress }));
      } });
      if (!controller.signal.aborted) setState({ loading: false, error: "", result, progress: null });
    } catch (error) {
      if (!controller.signal.aborted) setState({ loading: false, error: error.message, result: null, progress: null });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  const cancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ loading: false, error: "", result: null, progress: null, cancelled: true });
  };

  const rows = state.result?.rows || [];
  const visibleRows = rows.slice((page - 1) * 20, page * 20);
  const allSelectableRows = rows.filter((row) => ["mismatch", "invalid"].includes(row.status));
  const selectedCount = allSelectableRows.filter((row) => selectedRows.has(row.id)).length;
  const allRowsSelected = allSelectableRows.length > 0 && selectedCount === allSelectableRows.length;
  const someRowsSelected = selectedCount > 0 && !allRowsSelected;
  const toggleRow = (row, checked) => setSelectedRows((current) => {
    const next = new Map(current);
    if (checked && ["mismatch", "invalid"].includes(row.status)) next.set(row.id, row);
    else next.delete(row.id);
    return next;
  });
  const toggleAll = (checked) => setSelectedRows((current) => {
    const next = new Map(current);
    allSelectableRows.forEach((row) => checked ? next.set(row.id, row) : next.delete(row.id));
    return next;
  });

  const correctSelected = async () => {
    const selected = [...selectedRows.values()];
    if (!selected.length || correction.loading) return;
    setCorrection({ loading: true, error: "" });
    const grouped = new Map();
    selected.forEach((row) => {
      const updates = grouped.get(String(row.groupId)) || new Map();
      updates.set(String(row.userId), { user_id: row.userId, rate_multiplier: row.expected });
      grouped.set(String(row.groupId), updates);
    });
    const settled = await Promise.allSettled([...grouped.entries()].map(async ([groupId, updates]) => {
      // The existing endpoint replaces the whole group's rate list. Preserve
      // every existing rate entry before applying the selected corrections.
      const existing = await adminInspectionApi.groupRates(groupId);
      if (!Array.isArray(existing)) throw new Error("INVALID_GROUP_RATES");
      return adminInspectionApi.updateGroupRates(groupId, mergeGroupRateEntries(existing, [...updates.values()]));
    }));
    if (settled.some((item) => item.status === "rejected")) {
      setCorrection({ loading: false, error: c.correctionFailed });
      notify("warning", c.correctionFailed);
      return;
    }
    const count = selected.length;
    setSelectedRows(new Map());
    setCorrection({ loading: false, error: "" });
    notify("success", c.correctionSucceeded.replace("{count}", String(count)));
    await inspect();
  };

  const summary = state.result || state.progress;
  const selectHeader = <Checkbox checked={allRowsSelected} indeterminate={someRowsSelected} disabled={!allSelectableRows.length || state.loading || correction.loading} aria-label={c.selectAll} onCheckedChange={toggleAll} />;
  const columns = [
    { key: "select", label: selectHeader, mobileLabel: "", render: (row) => <Checkbox checked={selectedRows.has(row.id)} disabled={!(["mismatch", "invalid"].includes(row.status)) || state.loading || correction.loading} aria-label={`${row.username || row.email || row.userId} · ${c.status}`} onCheckedChange={(checked) => toggleRow(row, checked)} /> },
    { key: "user", label: c.user, render: (row) => <div><strong>{row.username || row.email || `#${row.userId}`}</strong><div className="text-foreground-muted text-xs">#{row.userId}{row.email ? ` · ${row.email}` : ""}</div></div> },
    { key: "group", label: c.group, render: (row) => row.group || "—" },
    { key: "total", label: c.total, align: "right", render: (row) => number(row.total) },
    { key: "expected", label: c.expected, align: "right", render: (row) => number(row.expected) },
    { key: "current", label: c.current, align: "right", render: (row) => number(row.current) },
    { key: "source", label: c.source, render: (row) => row.status === "failed" ? "—" : row.custom ? c.custom : c.inherited },
    { key: "status", label: c.status, render: (row) => <StatusBadge status={row.status === "mismatch" ? "warning" : "error"} label={c[row.status]} /> },
  ];

  return <Page title={c.title} actions={<><Button variant="primary" icon="refresh" loading={state.loading} disabled={groupsState.loading || Boolean(groupsState.error) || !groupsState.items.length || correction.loading} onClick={inspect}>{state.loading ? c.running : c.start}</Button>{state.loading && <Button onClick={cancel}>{c.cancel}</Button>}</>}>
    <Panel title={c.rules}>
      <div className="console-panel-body"><p className="text-foreground-muted text-sm">{c.description}</p>{groupsState.loading && <p className="mt-2 text-foreground-muted text-sm">{c.loading}</p>}{groupsState.error && <ErrorState message={errorText(groupsState.error)} onRetry={() => setReload((value) => value + 1)} />}{!groupsState.loading && !groupsState.error && !groupsState.items.length && <p className="mt-2 text-foreground-muted text-sm">{c.noGroups}</p>}</div>
      <DataTable columns={[{ key: "minimum", label: c.minimum, render: (row) => `≥ ${row.minimum}` }, { key: "pro", label: "Pro", render: (row) => number(row.pro) }]} rows={[...RATE_TIERS].reverse()} rowKey="minimum" />
    </Panel>
    <Panel title={c.results} aria-busy={state.loading}>
      <div className="console-panel-body"><Field label={c.inspectUsers} hint={c.inspectUsersHint}><TextArea id="rate-inspection-emails" rows="3" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder={c.inspectUsersPlaceholder} disabled={state.loading || correction.loading} /></Field></div>
      {summary && <div className="console-panel-body" role="status" aria-live="polite"><div className="flex flex-wrap gap-4 text-sm">{[[c.processed, `${summary.processed} / ${summary.total}`], [c.checked, summary.checked], [c.abnormal, summary.abnormalUsers], [c.skipped, summary.skipped], [c.failures, summary.failed]].map(([label, value]) => <span key={label}>{label}: <strong className="tabular-nums">{value}</strong></span>)}</div>{state.result?.missingEmails?.length > 0 && <p className="mt-2 text-foreground-muted text-xs">{c.missingEmails}{state.result.missingEmails.join(locale === "zh" ? "、" : ", ")}</p>}{state.result && <p className="mt-2 text-foreground-muted text-xs">{c.completed}: {formatDate(state.result.completedAt)}</p>}{state.result?.failed > 0 && <p role="alert" className="mt-2 text-sm">{c.incomplete}</p>}</div>}
      {correction.error && <div className="console-panel-body" role="alert"><p className="text-sm">{correction.error}</p></div>}
      {state.error ? <ErrorState message={errorText(state.error)} onRetry={inspect} /> : state.loading ? <TableSkeleton columns={8} rows={3} pagination={false} /> : state.result ? <><div className="console-panel-body flex flex-wrap items-center gap-3"><span className="text-foreground-muted text-sm">{c.selectedRows.replace("{count}", String(selectedRows.size))}</span><Button variant="primary" loading={correction.loading} disabled={!selectedRows.size || correction.loading} onClick={correctSelected}>{correction.loading ? c.correcting : c.correct}</Button></div><DataTable columns={columns} rows={visibleRows} empty={<EmptyState icon="check" title={state.result.checked ? c.clean : c.noChecks} description={state.result.checked ? c.cleanHint : c.noChecksHint} />} /><Pagination page={page} pageSize={20} total={rows.length} onPageChange={setPage} /></> : <EmptyState icon="search" title={state.cancelled ? c.cancelled : c.empty} description={c.emptyHint} />}
    </Panel>
  </Page>;
}
