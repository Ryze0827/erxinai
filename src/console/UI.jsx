import { Children, isValidElement, useMemo } from "react";
import { Badge as AppicaBadge } from "@appica/ui-react/badge";
import { Button as AppicaButton } from "@appica/ui-react/button";
import { buttonVariants as appicaButtonVariants } from "@appica/ui-react/button";
import { Card as AppicaCard } from "@appica/ui-react/card";
import { CardHeader as AppicaCardHeader } from "@appica/ui-react/card";
import { CardTitle as AppicaCardTitle } from "@appica/ui-react/card";
import { Alert } from "@appica/ui-react/alert";
import { AlertAction } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { AlertTitle } from "@appica/ui-react/alert";
import { AlertDialog } from "@appica/ui-react/alert-dialog";
import { AlertDialogClose } from "@appica/ui-react/alert-dialog";
import { AlertDialogContent } from "@appica/ui-react/alert-dialog";
import { AlertDialogDescription } from "@appica/ui-react/alert-dialog";
import { AlertDialogFooter } from "@appica/ui-react/alert-dialog";
import { AlertDialogHeader } from "@appica/ui-react/alert-dialog";
import { AlertDialogTitle } from "@appica/ui-react/alert-dialog";
import { CopyButton as AppicaCopyButton } from "@appica/ui-react/copy-button";
import { Dialog } from "@appica/ui-react/dialog";
import { DialogBody } from "@appica/ui-react/dialog";
import { DialogContent } from "@appica/ui-react/dialog";
import { DialogDescription } from "@appica/ui-react/dialog";
import { DialogFooter } from "@appica/ui-react/dialog";
import { DialogHeader } from "@appica/ui-react/dialog";
import { DialogTitle } from "@appica/ui-react/dialog";
import { Input as AppicaInput } from "@appica/ui-react/input";
import { Field as AppicaField } from "@appica/ui-react/field";
import { FieldDescription as AppicaFieldDescription } from "@appica/ui-react/field";
import { FieldError as AppicaFieldError } from "@appica/ui-react/field";
import { FieldLabel as AppicaFieldLabel } from "@appica/ui-react/field";
import { Pagination as AppicaPagination } from "@appica/ui-react/pagination";
import { PaginationEllipsis as AppicaPaginationEllipsis } from "@appica/ui-react/pagination";
import { PaginationItem as AppicaPaginationItem } from "@appica/ui-react/pagination";
import { PaginationLink as AppicaPaginationLink } from "@appica/ui-react/pagination";
import { PaginationList as AppicaPaginationList } from "@appica/ui-react/pagination";
import { Progress as AppicaProgress } from "@appica/ui-react/progress";
import { Select as AppicaSelect } from "@appica/ui-react/select";
import { SelectContent as AppicaSelectContent } from "@appica/ui-react/select";
import { SelectItem as AppicaSelectItem } from "@appica/ui-react/select";
import { SelectTrigger as AppicaSelectTrigger } from "@appica/ui-react/select";
import { SelectValue as AppicaSelectValue } from "@appica/ui-react/select";
import { Spinner as AppicaSpinner } from "@appica/ui-react/spinner";
import { Skeleton as AppicaSkeleton } from "@appica/ui-react/skeleton";
import { Switch as AppicaSwitch } from "@appica/ui-react/switch";
import { Table as AppicaTable } from "@appica/ui-react/table";
import { TableBody as AppicaTableBody } from "@appica/ui-react/table";
import { TableCell as AppicaTableCell } from "@appica/ui-react/table";
import { TableHead as AppicaTableHead } from "@appica/ui-react/table";
import { TableHeader as AppicaTableHeader } from "@appica/ui-react/table";
import { TableRow as AppicaTableRow } from "@appica/ui-react/table";
import { Textarea as AppicaTextarea } from "@appica/ui-react/textarea";
import { Tooltip as AppicaTooltip } from "@appica/ui-react/tooltip";
import { TooltipContent as AppicaTooltipContent } from "@appica/ui-react/tooltip";
import { TooltipProvider as AppicaTooltipProvider } from "@appica/ui-react/tooltip";
import { TooltipTrigger as AppicaTooltipTrigger } from "@appica/ui-react/tooltip";
import { Toaster as AppicaToaster } from "@appica/ui-react/toast";
import { Icon } from "./Icon";
import { useConsole } from "./ConsoleContext";
import { useLocale } from "./i18n";
import { useTheme } from "./theme";
import { formatTokenMillions } from "./utils";

export function Page({ title, actions, children, className = "" }) {
  const hasActions = Boolean(actions);
  return (
    <div className={`console-page ${className}`}>
      {title && <h1 className="console-page-title">{title}</h1>}
      {hasActions && (
        <div className="console-page-head console-page-head--actions-only">
          <div className="console-page-actions">{actions}</div>
        </div>
      )}
      {children}
    </div>
  );
}

export function Panel({ title, eyebrow, actions, children, className = "", ...props }) {
  return (
    <AppicaCard frame={false} inset={false} render={<section />} className={`console-panel ${className}`} {...props}>
      {(title || actions) && <AppicaCardHeader className="console-panel-head"><div>{eyebrow && <span>{eyebrow}</span>}{title && <AppicaCardTitle render={<h2 />}>{title}</AppicaCardTitle>}</div>{actions}</AppicaCardHeader>}
      {children}
    </AppicaCard>
  );
}

const buttonVariants = {
  danger: "destructive",
  ghost: "ghost",
  primary: "primary",
  secondary: "outline",
};

export function Button({ variant = "secondary", icon, className = "", children, ...props }) {
  return <AppicaButton type="button" variant={buttonVariants[variant] || variant} size="md" className={className} {...props}>{icon && <Icon name={icon} size={18} data-icon="start" />}{children}</AppicaButton>;
}

export function buttonLinkClass({ variant = "secondary", size = "md", className = "" } = {}) {
  const resolvedVariant = buttonVariants[variant] || variant;
  return `${appicaButtonVariants({ variant: resolvedVariant, size })} ${className}`.trim();
}

export function IconButton({ icon, label, variant = "secondary", size = "icon-md", className = "", ...props }) {
  return <AppicaButton type="button" variant={buttonVariants[variant] || variant} size={size} className={`console-icon-button ${className}`} aria-label={label} title={label} {...props}><Icon name={icon} size={18} /></AppicaButton>;
}

export function InlineButton({ variant = "ghost", size = "sm", icon, className = "", children, ...props }) {
  return <AppicaButton type="button" variant={buttonVariants[variant] || variant} size={size} className={`console-inline-button ${className}`} {...props}>{icon && <Icon name={icon} data-icon="start" />}{children}</AppicaButton>;
}

export function Field({ label, hint, error, className = "", children }) {
  return <AppicaField className={`min-w-0 ${className}`.trim()} invalid={Boolean(error)}>{label && <AppicaFieldLabel>{label}</AppicaFieldLabel>}{children}{error && <AppicaFieldError match>{error}</AppicaFieldError>}{hint && !error && <AppicaFieldDescription>{hint}</AppicaFieldDescription>}</AppicaField>;
}

export function TextInput({ className = "", ...props }) {
  return <AppicaInput variant="outline" inputSize="md" className={className} {...props} />;
}

function selectOptionText(children) {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement(child) ? selectOptionText(child.props.children) : "";
  }).join("");
}

function selectOptions(children) {
  return Children.toArray(children).filter(isValidElement).map((option, index) => ({
    key: option.key ?? index,
    value: String(option.props.value ?? selectOptionText(option.props.children)),
    label: option.props.label || selectOptionText(option.props.children),
    disabled: Boolean(option.props.disabled),
  }));
}

export function SelectInput({ children, className = "", value = "", onChange, disabled = false, searchable: _searchable = "auto", name, id, ...props }) {
  const { locale } = useLocale();
  const options = useMemo(() => selectOptions(children), [children]);
  const selectedValue = String(value ?? "");
  const change = (next) => {
    const selectedOption = options.find((option) => option.value === String(next ?? ""));
    if (!selectedOption || selectedOption.disabled) return;
    const target = { value: selectedOption.value, name };
    onChange?.({ target, currentTarget: target });
  };
  return <AppicaSelect items={options} value={selectedValue || null} onValueChange={change} disabled={disabled} size="md" variant="outline" alignItemWithTrigger={false}>
    <AppicaSelectTrigger id={id} className={className} aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]}>
      <AppicaSelectValue placeholder={locale === "zh" ? "请选择" : "Select an option"}>{(currentValue) => options.find((option) => option.value === String(currentValue ?? ""))?.label || (locale === "zh" ? "请选择" : "Select an option")}</AppicaSelectValue>
    </AppicaSelectTrigger>
    <AppicaSelectContent>
      {options.map((option) => <AppicaSelectItem key={option.key} value={option.value} disabled={option.disabled}>{option.label}</AppicaSelectItem>)}
    </AppicaSelectContent>
  </AppicaSelect>;
}

export function TextArea({ className = "", ...props }) {
  return <AppicaTextarea variant="outline" inputSize="md" className={className} {...props} />;
}

export function Toggle({ checked, onChange, label, ariaLabel, disabled }) {
  return <label className="console-toggle"><AppicaSwitch checked={checked} onCheckedChange={(next) => onChange?.({ target: { checked: next }, currentTarget: { checked: next } })} disabled={disabled} aria-label={ariaLabel || label || undefined} size="md" /><span>{label}</span></label>;
}

export function Spinner({ label }) {
  const { t } = useLocale();
  const loadingLabel = label || t("common.loading");
  return <div className="console-loading" role="status"><AppicaSpinner variant="dots" aria-label={loadingLabel} /><span>{loadingLabel}</span></div>;
}

export function Skeleton({ className = "", ...props }) {
  return <AppicaSkeleton className={`console-skeleton ${className}`} {...props} />;
}

export function EmptyState({ icon = "info", title, description, action }) {
  const { t } = useLocale();
  return <div className="console-empty"><span><Icon name={icon} size={24} /></span><h3>{title || t("common.noData")}</h3>{description && <p>{description}</p>}{action}</div>;
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLocale();
  return <Alert variant="error" layout="inline" className="console-empty console-empty--error"><AlertIcon><Icon name="warning" size={24} /></AlertIcon><AlertTitle as="h3">{message || t("common.loadFailed")}</AlertTitle>{onRetry && <AlertAction><Button onClick={onRetry}>{t("common.retry")}</Button></AlertAction>}</Alert>;
}

const statusTone = {
  active: "success", completed: "success", paid: "success", operational: "success", success: "success",
  pending: "warning", created: "warning", waiting: "warning", processing: "warning", recharging: "warning", indexing: "warning", processing_results: "warning", settling: "warning", refund_requested: "warning", refunding: "warning", refund_pending: "warning", degraded: "warning", queued: "warning", running: "warning",
  inactive: "neutral", expired: "neutral", cancelled: "neutral", suspended: "neutral",
  failed: "danger", refund_failed: "danger", error: "danger", disabled: "danger", quota_exhausted: "danger", refunded: "info", partially_refunded: "info",
};

export function StatusBadge({ status, label }) {
  const normalized = String(status || "unknown").toLowerCase();
  const tone = statusTone[normalized] || "neutral";
  const variant = tone === "danger" ? "error" : tone === "neutral" ? "soft" : tone;
  return <AppicaBadge variant={variant} size="md">{label || normalized.replaceAll("_", " ")}</AppicaBadge>;
}

export function ProgressBar({ value, tone = "primary" }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  const colors = { danger: "var(--console-danger)", info: "var(--console-info)", primary: "var(--console-primary)", success: "var(--console-success)", warning: "var(--console-warning)" };
  return <AppicaProgress className={`console-progress console-progress--${tone}`} value={width} thickness={6} indicatorColor={colors[tone] || colors.primary} />;
}

export function Modal({ open, title, description, children, footer, onClose, size = "medium" }) {
  const { t } = useLocale();
  return <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
    <DialogContent closeLabel={t("common.close")} className={`console-modal--${size}`}>
      <div className="console-modal-content">
        <DialogHeader className="console-modal-head"><div><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</div></DialogHeader>
        <DialogBody className="console-modal-body">{children}</DialogBody>
        {footer && <DialogFooter className="console-modal-footer">{footer}</DialogFooter>}
      </div>
    </DialogContent>
  </Dialog>;
}

export function ConfirmDialog({ open, title, description, confirmLabel, tone = "danger", busy, onConfirm, onClose }) {
  const { t } = useLocale();
  return <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !busy && onClose?.()}><AlertDialogContent aria-busy={busy}><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle>{description && <AlertDialogDescription>{description}</AlertDialogDescription>}</AlertDialogHeader><AlertDialogFooter><AlertDialogClose render={<AppicaButton type="button" variant="outline" size="md" />} disabled={busy}>{t("common.cancel")}</AlertDialogClose><AppicaButton type="button" variant={buttonVariants[tone] || tone} size="md" onClick={onConfirm} disabled={busy}>{confirmLabel || t("common.confirm")}</AppicaButton></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function paginationItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const candidates = [1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
  return [...new Set(candidates)].reduce((items, value, index, values) => {
    if (index && value - values[index - 1] > 1) items.push(`ellipsis-${value}`);
    items.push(value);
    return items;
  }, []);
}

export function Pagination({ page = 1, pageSize = 20, total = 0, pages, onPageChange, onPageSizeChange }) {
  const { locale, t } = useLocale();
  const totalPages = Math.max(1, pages || Math.ceil(total / pageSize));
  if (!total) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const range = locale === "zh" ? `${start}–${end} / 共 ${total}` : `${start}–${end} of ${total}`;
  const items = paginationItems(page, totalPages);
  const pageButton = (target, label, icon, disabled = false) => <AppicaPaginationLink render={<button type="button" />} disabled={disabled} aria-label={label} onClick={() => onPageChange(target)}><Icon name={icon} size={16} /></AppicaPaginationLink>;
  return <div className="console-pagination"><span>{range}</span><div>{onPageSizeChange && <SelectInput value={pageSize} searchable={false} aria-label={locale === "zh" ? "每页条数" : "Rows per page"} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50, 100].map((size) => <option value={size} key={size}>{locale === "zh" ? `${size} 条 / 页` : `${size} per page`}</option>)}</SelectInput>}<AppicaPagination size="md"><AppicaPaginationList><AppicaPaginationItem>{pageButton(page - 1, t("common.previous"), "chevronLeft", page <= 1)}</AppicaPaginationItem>{items.map((item) => <AppicaPaginationItem key={item}>{typeof item === "number" ? <AppicaPaginationLink render={<button type="button" />} active={item === page} onClick={() => onPageChange(item)}>{item}</AppicaPaginationLink> : <AppicaPaginationEllipsis />}</AppicaPaginationItem>)}<AppicaPaginationItem>{pageButton(page + 1, t("common.next"), "chevronRight", page >= totalPages)}</AppicaPaginationItem></AppicaPaginationList></AppicaPagination></div></div>;
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

export function TruncatedText({ value, render = <span />, className = "", multiline = false }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  const truncateClass = `console-table-truncate ${multiline ? "console-table-truncate--multiline" : ""} ${className}`.trim();
  return <AppicaTooltipProvider><AppicaTooltip><AppicaTooltipTrigger render={render} className={truncateClass}>{text}</AppicaTooltipTrigger><AppicaTooltipContent arrow={false} className="console-table-value-tooltip">{text}</AppicaTooltipContent></AppicaTooltip></AppicaTooltipProvider>;
}

function ConsoleTableHeader({ column, sortKey, sortOrder, onSort }) {
  const sortable = Boolean(column.sortable && onSort);
  const active = sortable && sortKey === column.key;
  const direction = active && sortOrder === "asc" ? "ascending" : active ? "descending" : "none";
  const icon = active && sortOrder === "asc" ? "arrowUp" : "arrowDown";
  return <AppicaTableHead data-column={column.key} className={column.align ? `is-${column.align}` : ""} aria-sort={sortable ? direction : undefined}>{sortable ? <AppicaButton type="button" variant="ghost" size="sm" className={`console-table-sort-button ${active ? "is-sorted" : ""}`} onClick={() => onSort(column.key, active && sortOrder === "asc" ? "desc" : "asc")}><span>{column.label}</span><Icon name={icon} size={13} /></AppicaButton> : <span>{column.label}</span>}</AppicaTableHead>;
}

function ConsoleTableRow({ row, index, rowKey, columns, onRowClick }) {
  const click = (event) => {
    if (!rowHasInteractiveTarget(event)) onRowClick?.(row);
  };
  return <AppicaTableRow key={row[rowKey] ?? index} onClick={onRowClick ? click : undefined} onKeyDown={onRowClick ? (event) => rowKeyDown(event, row, onRowClick) : undefined} tabIndex={onRowClick ? 0 : undefined} role={onRowClick ? "button" : undefined} className={onRowClick ? "is-clickable" : ""}>{columns.map((column) => <AppicaTableCell key={column.key} data-column={column.key} data-label={mobileColumnLabel(column)} className={column.align ? `is-${column.align}` : ""}>{column.render ? column.render(row) : <TruncatedText value={row[column.key]} />}</AppicaTableCell>)}</AppicaTableRow>;
}

export function DataTable({ columns, rows, rowKey = "id", empty, onRowClick, sortKey, sortOrder = "desc", onSort, className = "" }) {
  if (!rows?.length) return empty || <EmptyState />;
  return (
    <div className={`console-table-wrap ${className}`}>
      <AppicaTable className="console-table" size="sm" borderStyle="none" hoverableRows><AppicaTableHeader><AppicaTableRow>{columns.map((column) => <ConsoleTableHeader key={column.key} column={column} sortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />)}</AppicaTableRow></AppicaTableHeader><AppicaTableBody>{rows.map((row, index) => <ConsoleTableRow key={row[rowKey] ?? index} row={row} index={index} rowKey={rowKey} columns={columns} onRowClick={onRowClick} />)}</AppicaTableBody></AppicaTable>
    </div>
  );
}

export function TableSkeleton({ columns = 6, rows = 6, className = "", pagination = true }) {
  const columnItems = Array.from({ length: columns }, (_, index) => index);
  const rowItems = Array.from({ length: rows }, (_, index) => index);
  return <div className={`console-table-skeleton ${className}`} aria-hidden="true">
    <div className="console-table-wrap">
      <AppicaTable className="console-table" size="sm" borderStyle="none">
        <AppicaTableHeader><AppicaTableRow>{columnItems.map((column) => <AppicaTableHead key={column}><AppicaSkeleton /></AppicaTableHead>)}</AppicaTableRow></AppicaTableHeader>
        <AppicaTableBody>{rowItems.map((row) => <AppicaTableRow key={row}>{columnItems.map((column) => <AppicaTableCell key={column}><AppicaSkeleton /></AppicaTableCell>)}</AppicaTableRow>)}</AppicaTableBody>
      </AppicaTable>
    </div>
    {pagination && <div className="console-pagination console-table-skeleton-pagination"><AppicaSkeleton /><div><AppicaSkeleton /><AppicaSkeleton /></div></div>}
  </div>;
}

const chartTop = 26;
const chartBottom = 185;

function chartMaximum(data, valueKey) {
  const maximum = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const normalized = maximum / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function chartPoints(data, valueKey, width, maximum) {
  const step = data.length > 1 ? width / (data.length - 1) : width;
  return data.map((item, index) => {
    const value = Number(item[valueKey]) || 0;
    return `${index * step},${chartBottom - value / maximum * (chartBottom - chartTop)}`;
  }).join(" ");
}

function formatChartTick(value) {
  return formatTokenMillions(value).slice(0, -1);
}

export function LineChart({ data = [], valueKey = "total_tokens", labelKey = "date", unit = "Token (M)", ariaLabel }) {
  const { locale } = useLocale();
  const maximum = useMemo(() => chartMaximum(data, valueKey), [data, valueKey]);
  const points = useMemo(() => chartPoints(data, valueKey, 680, maximum), [data, valueKey, maximum]);
  const ticks = useMemo(() => Array.from({ length: 5 }, (_, index) => maximum * (4 - index) / 4), [maximum]);
  if (!data.length) return <EmptyState />;
  const accessibleLabel = ariaLabel || (locale === "zh" ? "Token 用量趋势" : "Token usage trend");
  return <div className="console-line-chart" role="group" aria-label={accessibleLabel}>
    <div className="console-line-chart-plot">
      <div className="console-line-chart-y-axis" aria-hidden="true">
        <strong>{unit}</strong>
        <div>{ticks.map((tick) => <span key={tick}>{formatChartTick(tick)}</span>)}</div>
      </div>
      <svg viewBox="0 0 680 210" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="console-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((tick, index) => <line key={tick} x1="0" y1={chartTop + index * (chartBottom - chartTop) / 4} x2="680" y2={chartTop + index * (chartBottom - chartTop) / 4} />)}
        <polygon points={`0,${chartBottom} ${points} 680,${chartBottom}`} fill="url(#console-chart-fill)" />
        <polyline points={points} />
      </svg>
    </div>
    <div className="console-line-chart-x-axis"><i aria-hidden="true" /><div className="console-chart-labels">{data.map((item, index) => <span key={`${item[labelKey]}-${index}`}>{String(item[labelKey] || "").slice(5, 10)}</span>)}</div></div>
    <table className="console-visually-hidden"><caption>{accessibleLabel}</caption><thead><tr><th scope="col">{locale === "zh" ? "日期" : "Date"}</th><th scope="col">{unit}</th></tr></thead><tbody>{data.map((item, index) => <tr key={`${item[labelKey]}-accessible-${index}`}><th scope="row">{String(item[labelKey] || "")}</th><td>{formatTokenMillions(Number(item[valueKey]) || 0)}</td></tr>)}</tbody></table>
  </div>;
}

const themeMeta = {
  light: { icon: "sunHigh", en: "Switch to dark theme", zh: "切换至深色模式" },
  dark: { icon: "moonStars", en: "Switch to light theme", zh: "切换至浅色模式" },
};

export function ThemeToggle({ className = "" }) {
  const { locale } = useLocale();
  const { preference, cycle } = useTheme();
  const meta = themeMeta[preference] || themeMeta.light;
  const label = locale === "zh" ? meta.zh : meta.en;
  return <IconButton className={className} icon={meta.icon} label={label} onClick={cycle} />;
}

export function CopyButton({ value, label, copiedLabel, className = "" }) {
  const { t } = useLocale();
  const { notify } = useConsole();
  return <AppicaCopyButton className={`console-copy ${className}`} value={String(value || "")} label={label || t("common.copy")} copiedLabel={copiedLabel || t("common.copied")} size={label ? "sm" : "icon-sm"} onCopy={() => notify("success", copiedLabel || t("common.copied"), 1800)} onCopyError={() => notify("error", t("common.copyFailed"))}>{label}</AppicaCopyButton>;
}

export function StatCard({ label, value, meta, icon = "chart", tone = "blue", className = "" }) {
  return <div className={`console-stat console-stat--${tone} ${className}`}><div><span>{label}</span><strong>{value}</strong>{meta && <small>{meta}</small>}</div><i><Icon name={icon} size={20} /></i></div>;
}

export function StatCardSkeleton({ tone = "blue" }) {
  return <div className={`console-stat console-stat--${tone} console-stat-skeleton`} aria-hidden="true"><div><AppicaSkeleton /><AppicaSkeleton /><AppicaSkeleton /></div><AppicaSkeleton /></div>;
}

export function ToastViewport() {
  return <AppicaToaster className="console-appica-toasts" position="bottom-right" progress timeout={4200} />;
}
