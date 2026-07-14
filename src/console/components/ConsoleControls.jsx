import { useEffect, useRef, useState } from "react";
import { Button, TextInput } from "../UI";
import { useLocale } from "../i18n";

function readHidden(storageKey, defaults) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) ? stored : defaults;
  } catch {
    return defaults;
  }
}

export function useHiddenColumns(storageKey, defaults = []) {
  const [hidden, setHidden] = useState(() => new Set(readHidden(storageKey, defaults)));
  const toggle = (key) => setHidden((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
    return next;
  });
  return { hidden, toggle };
}

export function ColumnPicker({ columns, hidden, onToggle, alwaysVisible = [] }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const choices = columns.filter((column) => !alwaysVisible.includes(column.key));
  return <div className="console-column-picker" ref={rootRef}>
    <Button icon="grid" onClick={() => setOpen((value) => !value)}>{locale === "zh" ? "列设置" : "Columns"}</Button>
    {open && <div className="console-column-menu">{choices.map((column) => <button type="button" key={column.key} onClick={() => onToggle(column.key)}><span>{column.label}</span>{!hidden.has(column.key) && <i className="is-checked">✓</i>}</button>)}</div>}
  </div>;
}

function localDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function rangeFor(preset) {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  if (preset === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  if (preset === "24h") start.setDate(start.getDate() - 1);
  if (["7d", "14d", "30d"].includes(preset)) start.setDate(start.getDate() - Number(preset.slice(0, -1)) + 1);
  if (preset === "month") start.setDate(1);
  if (preset === "lastMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }
  return { start_date: localDate(start), end_date: localDate(end) };
}

export function DateRangePicker({ startDate, endDate, onChange }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ start_date: startDate, end_date: endDate });
  const rootRef = useRef(null);
  useEffect(() => setDraft({ start_date: startDate, end_date: endDate }), [startDate, endDate]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const presets = [
    ["today", "Today", "今天"], ["yesterday", "Yesterday", "昨天"], ["24h", "Last 24 hours", "最近 24 小时"],
    ["7d", "Last 7 days", "最近 7 天"], ["14d", "Last 14 days", "最近 14 天"], ["30d", "Last 30 days", "最近 30 天"],
    ["month", "This month", "本月"], ["lastMonth", "Last month", "上月"],
  ];
  const apply = (range = draft) => { onChange(range); setOpen(false); };
  return <div className="console-date-picker" ref={rootRef}>
    <Button icon="calendar" onClick={() => setOpen((value) => !value)}><span>{startDate}</span><span className="console-muted">→</span><span>{endDate}</span></Button>
    {open && <div className="console-date-menu"><div className="console-date-presets">{presets.map(([value, en, zh]) => <button type="button" key={value} onClick={() => apply(rangeFor(value))}>{locale === "zh" ? zh : en}</button>)}</div><div className="console-date-custom"><label><span>{locale === "zh" ? "开始" : "Start"}</span><TextInput type="date" value={draft.start_date} onChange={(event) => setDraft((current) => ({ ...current, start_date: event.target.value }))} /></label><label><span>{locale === "zh" ? "结束" : "End"}</span><TextInput type="date" value={draft.end_date} onChange={(event) => setDraft((current) => ({ ...current, end_date: event.target.value }))} /></label><Button variant="primary" onClick={() => apply()}>{locale === "zh" ? "应用" : "Apply"}</Button></div></div>}
  </div>;
}

export function SearchSelect({ value, onChange, options, placeholder, id }) {
  const listId = id || `console-select-${String(placeholder || "options").replace(/\W/g, "-")}`;
  return <><TextInput list={listId} value={value} onChange={onChange} placeholder={placeholder} /><datalist id={listId}>{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</datalist></>;
}

export function CompactTabs({ items, value, onChange, label }) {
  return <div className="console-compact-tabs" aria-label={label}>{items.map((item) => <button type="button" className={value === item.value ? "is-active" : ""} onClick={() => onChange(item.value)} key={item.value}>{item.label}</button>)}</div>;
}
