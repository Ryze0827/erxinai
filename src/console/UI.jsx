import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { useConsole } from "./ConsoleContext";
import { useLocale } from "./i18n";
import { useTheme } from "./theme";

export function Page({ title, subtitle, actions, children, className = "" }) {
  return (
    <div className={`console-page ${className}`}>
      <div className="console-page-head">
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        {actions && <div className="console-page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, eyebrow, actions, children, className = "" }) {
  return (
    <section className={`console-panel ${className}`}>
      {(title || actions) && <div className="console-panel-head"><div>{eyebrow && <span>{eyebrow}</span>}{title && <h2>{title}</h2>}</div>{actions}</div>}
      {children}
    </section>
  );
}

export function Button({ variant = "secondary", icon, className = "", children, ...props }) {
  return <button type="button" className={`console-button console-button--${variant} ${className}`} {...props}>{icon && <Icon name={icon} size={17} />}{children}</button>;
}

export function IconButton({ icon, label, className = "", ...props }) {
  return <button type="button" className={`console-icon-button ${className}`} aria-label={label} title={label} {...props}><Icon name={icon} size={18} /></button>;
}

export function Field({ label, hint, error, className = "", children }) {
  return <label className={`console-field ${className}`}><span>{label}</span>{children}{error && <small className="console-field-error">{error}</small>}{hint && !error && <small>{hint}</small>}</label>;
}

export function TextInput({ className = "", ...props }) {
  return <input className={`console-input ${className}`} {...props} />;
}

export function SelectInput({ children, className = "", ...props }) {
  return <select className={`console-input console-select ${className}`} {...props}>{children}</select>;
}

export function TextArea({ className = "", ...props }) {
  return <textarea className={`console-input console-textarea ${className}`} {...props} />;
}

export function Toggle({ checked, onChange, label, ariaLabel, disabled }) {
  return <label className="console-toggle"><input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} aria-label={ariaLabel || label || undefined} /><i /><span>{label}</span></label>;
}

export function Spinner({ label }) {
  const { t } = useLocale();
  return <div className="console-loading" role="status"><i /><span>{label || t("common.loading")}</span></div>;
}

export function EmptyState({ icon = "info", title, description, action }) {
  const { t } = useLocale();
  return <div className="console-empty"><span><Icon name={icon} size={24} /></span><h3>{title || t("common.noData")}</h3>{description && <p>{description}</p>}{action}</div>;
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLocale();
  return <div className="console-empty console-empty--error"><span><Icon name="warning" size={24} /></span><h3>{message || t("common.loadFailed")}</h3>{onRetry && <Button onClick={onRetry}>{t("common.retry")}</Button>}</div>;
}

const statusTone = {
  active: "success", completed: "success", paid: "success", operational: "success", success: "success",
  pending: "warning", created: "warning", waiting: "warning", processing: "warning", recharging: "warning", indexing: "warning", processing_results: "warning", settling: "warning", refund_requested: "warning", refunding: "warning", refund_pending: "warning", degraded: "warning", queued: "warning", running: "warning",
  inactive: "neutral", expired: "neutral", cancelled: "neutral", suspended: "neutral",
  failed: "danger", refund_failed: "danger", error: "danger", disabled: "danger", quota_exhausted: "danger", refunded: "info", partially_refunded: "info",
};

export function StatusBadge({ status, label }) {
  const normalized = String(status || "unknown").toLowerCase();
  return <span className={`console-status console-status--${statusTone[normalized] || "neutral"}`}><i />{label || normalized.replaceAll("_", " ")}</span>;
}

export function ProgressBar({ value, tone = "primary" }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="console-progress"><i className={`console-progress--${tone}`} style={{ width: `${width}%` }} /></div>;
}

const modalStack = [];
let savedBodyOverflow = "";

function addModal(id) {
  if (!modalStack.length) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  modalStack.push(id);
  return modalStack.length - 1;
}

function removeModal(id) {
  const index = modalStack.lastIndexOf(id);
  if (index >= 0) modalStack.splice(index, 1);
  if (!modalStack.length) document.body.style.overflow = savedBodyOverflow;
}

function topModalIs(id) {
  return modalStack.at(-1) === id;
}

function focusableElements(root) {
  if (!root) return [];
  return [...root.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

function trapModalFocus(event, root) {
  if (event.key !== "Tab") return;
  const items = focusableElements(root);
  if (!items.length) { event.preventDefault(); root?.focus(); return; }
  const first = items[0];
  const last = items.at(-1);
  if (!root?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function Modal({ open, title, description, children, footer, onClose, size = "medium" }) {
  const { t } = useLocale();
  const reactId = useId();
  const modalId = useRef(`console-modal-${reactId}`).current;
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const [depth, setDepth] = useState(0);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    setDepth(addModal(modalId));
    const focusTimer = window.requestAnimationFrame(() => {
      const first = focusableElements(dialogRef.current)[0];
      (first || dialogRef.current)?.focus();
    });
    const onKeyDown = (event) => {
      if (!topModalIs(modalId)) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current?.(); return; }
      trapModalFocus(event, dialogRef.current);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      removeModal(modalId);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [modalId, open]);
  if (!open) return null;
  return createPortal(
    <div className="console-modal-layer" role="presentation" style={{ zIndex: 120 + depth }} onMouseDown={(event) => event.target === event.currentTarget && topModalIs(modalId) && closeRef.current?.()}>
      <div ref={dialogRef} className={`console-modal console-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex="-1">
        <div className="console-modal-head"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><IconButton icon="close" label={t("common.close")} onClick={onClose} /></div>
        <div className="console-modal-body">{children}</div>
        {footer && <div className="console-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel, tone = "danger", busy, onConfirm, onClose }) {
  const { t } = useLocale();
  return <Modal open={open} title={title} description={description} onClose={onClose} size="small" footer={<><Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button><Button variant={tone} onClick={onConfirm} disabled={busy}>{confirmLabel || t("common.confirm")}</Button></>}><div className="console-confirm-icon"><Icon name="warning" size={28} /></div></Modal>;
}

export function Pagination({ page = 1, pageSize = 20, total = 0, pages, onPageChange, onPageSizeChange }) {
  const { t } = useLocale();
  const totalPages = Math.max(1, pages || Math.ceil(total / pageSize));
  if (total <= pageSize && totalPages <= 1) return null;
  return <div className="console-pagination"><span>{t("common.page", { page, pages: totalPages })}</span><div>{onPageSizeChange && <SelectInput value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></SelectInput>}<Button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>{t("common.previous")}</Button><Button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>{t("common.next")}</Button></div></div>;
}

function mobileColumnLabel(column) {
  const label = column.mobileLabel !== undefined ? column.mobileLabel : column.label;
  return ["string", "number"].includes(typeof label) ? String(label) : "";
}

function rowKeyDown(event, row, onRowClick) {
  if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  onRowClick(row);
}

function rowHasInteractiveTarget(event) {
  const interactive = event.target.closest?.("button, a, input, select, textarea, [role='button']");
  return interactive && interactive !== event.currentTarget;
}

function TableHeader({ column, sortKey, sortOrder, onSort }) {
  const sortable = Boolean(column.sortable && onSort);
  const active = sortable && sortKey === column.key;
  const direction = active && sortOrder === "asc" ? "ascending" : active ? "descending" : "none";
  const icon = active && sortOrder === "asc" ? "arrowUp" : "arrowDown";
  return <th className={column.align ? `is-${column.align}` : ""} aria-sort={sortable ? direction : undefined}>{sortable ? <button type="button" className={active ? "is-sorted" : ""} onClick={() => onSort(column.key, active && sortOrder === "asc" ? "desc" : "asc")}><span>{column.label}</span><Icon name={icon} size={13} /></button> : column.label}</th>;
}

function TableRow({ row, index, rowKey, columns, onRowClick }) {
  const click = (event) => {
    if (!rowHasInteractiveTarget(event)) onRowClick?.(row);
  };
  return <tr key={row[rowKey] ?? index} onClick={onRowClick ? click : undefined} onKeyDown={onRowClick ? (event) => rowKeyDown(event, row, onRowClick) : undefined} tabIndex={onRowClick ? 0 : undefined} role={onRowClick ? "button" : undefined} className={onRowClick ? "is-clickable" : ""}>{columns.map((column) => <td key={column.key} data-label={mobileColumnLabel(column)} className={column.align ? `is-${column.align}` : ""}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>;
}

export function DataTable({ columns, rows, rowKey = "id", empty, onRowClick, sortKey, sortOrder = "desc", onSort, className = "" }) {
  if (!rows?.length) return empty || <EmptyState />;
  return (
    <div className={`console-table-wrap ${className}`}>
      <table className="console-table"><thead><tr>{columns.map((column) => <TableHeader key={column.key} column={column} sortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />)}</tr></thead><tbody>{rows.map((row, index) => <TableRow key={row[rowKey] ?? index} row={row} index={index} rowKey={rowKey} columns={columns} onRowClick={onRowClick} />)}</tbody></table>
    </div>
  );
}

function chartPoints(data, valueKey, width, height) {
  const values = data.map((item) => Number(item[valueKey]) || 0);
  const maximum = Math.max(...values, 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  return values.map((value, index) => `${index * step},${height - (value / maximum) * (height - 10) - 5}`).join(" ");
}

export function LineChart({ data = [], valueKey = "total_tokens", labelKey = "date", height = 210 }) {
  const points = useMemo(() => chartPoints(data, valueKey, 680, 180), [data, valueKey]);
  if (!data.length) return <EmptyState />;
  return <div className="console-line-chart"><svg viewBox="0 0 680 210" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="console-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><line x1="0" y1="185" x2="680" y2="185" /><polygon points={`0,185 ${points} 680,185`} fill="url(#console-chart-fill)" /><polyline points={points} /></svg><div className="console-chart-labels">{data.map((item, index) => <span key={`${item[labelKey]}-${index}`}>{String(item[labelKey] || "").slice(5, 10)}</span>)}</div></div>;
}

const themeMeta = {
  light: { icon: "sun", en: "Light theme", zh: "浅色模式" },
  dark: { icon: "moon", en: "Dark theme", zh: "深色模式" },
  system: { icon: "monitor", en: "Follow system", zh: "跟随系统" },
};

export function ThemeToggle({ className = "" }) {
  const { locale } = useLocale();
  const { preference, cycle } = useTheme();
  const meta = themeMeta[preference] || themeMeta.system;
  const label = locale === "zh" ? meta.zh : meta.en;
  return <IconButton className={className} icon={meta.icon} label={label} onClick={cycle} />;
}

export function CopyButton({ value, label, copiedLabel, className = "" }) {
  const { t } = useLocale();
  const { notify } = useConsole();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(true);
      notify("success", copiedLabel || t("common.copied"), 1800);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify("error", t("common.copyFailed"));
    }
  };
  return <button className={`console-copy ${className}`} type="button" onClick={copy}><Icon name={copied ? "check" : "copy"} size={15} />{label && <span>{copied ? copiedLabel || t("common.copied") : label}</span>}</button>;
}

export function StatCard({ label, value, meta, icon = "chart", tone = "blue" }) {
  return <div className={`console-stat console-stat--${tone}`}><div><span>{label}</span><strong>{value}</strong>{meta && <small>{meta}</small>}</div><i><Icon name={icon} size={20} /></i></div>;
}

export function ToastViewport() {
  const { toasts, dismissToast } = useConsole();
  return <div className="console-toasts" aria-live="polite">{toasts.map((toast) => <button key={toast.id} className={`console-toast console-toast--${toast.type}`} onClick={() => dismissToast(toast.id)}><Icon name={toast.type === "success" ? "check" : toast.type === "warning" ? "warning" : toast.type === "error" ? "warning" : "info"} size={18} /><span>{toast.message}</span><Icon name="close" size={14} /></button>)}</div>;
}
