import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useConsole } from "./ConsoleContext";
import { useLocale } from "./i18n";

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

export function TextInput(props) {
  return <input className="console-input" {...props} />;
}

export function SelectInput({ children, ...props }) {
  return <select className="console-input console-select" {...props}>{children}</select>;
}

export function TextArea(props) {
  return <textarea className="console-input console-textarea" {...props} />;
}

export function Toggle({ checked, onChange, label, disabled }) {
  return <label className="console-toggle"><input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} /><i /><span>{label}</span></label>;
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

export function Modal({ open, title, description, children, footer, onClose, size = "medium" }) {
  const { t } = useLocale();
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="console-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={`console-modal console-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby="console-modal-title">
        <div className="console-modal-head"><div><h2 id="console-modal-title">{title}</h2>{description && <p>{description}</p>}</div><IconButton icon="close" label={t("common.close")} onClick={onClose} /></div>
        <div className="console-modal-body">{children}</div>
        {footer && <div className="console-modal-footer">{footer}</div>}
      </div>
    </div>
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

export function DataTable({ columns, rows, rowKey = "id", empty, onRowClick, sortKey, sortOrder = "desc", onSort, className = "" }) {
  if (!rows?.length) return empty || <EmptyState />;
  const openRow = (event, row) => {
    if (event.target.closest("button, a, input, select, textarea, [role='button']")) return;
    onRowClick?.(row);
  };
  const sort = (column) => {
    if (!column.sortable || !onSort) return;
    onSort(column.key, sortKey === column.key && sortOrder === "asc" ? "desc" : "asc");
  };
  return (
    <div className={`console-table-wrap ${className}`}>
      <table className="console-table"><thead><tr>{columns.map((column) => <th key={column.key} className={column.align ? `is-${column.align}` : ""}>{column.sortable && onSort ? <button type="button" className={sortKey === column.key ? "is-sorted" : ""} onClick={() => sort(column)}><span>{column.label}</span><Icon name={sortKey === column.key && sortOrder === "asc" ? "arrowUp" : "arrowDown"} size={13} /></button> : column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index} onClick={onRowClick ? (event) => openRow(event, row) : undefined} className={onRowClick ? "is-clickable" : ""}>{columns.map((column) => <td key={column.key} data-label={column.label} className={column.align ? `is-${column.align}` : ""}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>)}</tbody></table>
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
  return <div className="console-line-chart"><svg viewBox="0 0 680 210" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="console-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a84bd" stopOpacity=".3" /><stop offset="1" stopColor="#3a84bd" stopOpacity="0" /></linearGradient></defs><line x1="0" y1="185" x2="680" y2="185" /><polygon points={`0,185 ${points} 680,185`} fill="url(#console-chart-fill)" /><polyline points={points} /></svg><div className="console-chart-labels">{data.map((item, index) => <span key={`${item[labelKey]}-${index}`}>{String(item[labelKey] || "").slice(5, 10)}</span>)}</div></div>;
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
