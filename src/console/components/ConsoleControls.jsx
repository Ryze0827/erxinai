import { useEffect, useState } from "react";
import { DropdownMenu } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuCheckboxItem } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuContent } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuRadioGroup } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuRadioItem } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuTrigger } from "@appica/ui-react/dropdown-menu";
import { Combobox } from "@appica/ui-react/combobox";
import { ComboboxContent } from "@appica/ui-react/combobox";
import { ComboboxEmpty } from "@appica/ui-react/combobox";
import { ComboboxInput } from "@appica/ui-react/combobox";
import { ComboboxItem } from "@appica/ui-react/combobox";
import { ComboboxList } from "@appica/ui-react/combobox";
import { DatePicker } from "@appica/ui-react/date-picker";
import { Tabs } from "@appica/ui-react/tabs";
import { TabsList } from "@appica/ui-react/tabs";
import { TabsTrigger } from "@appica/ui-react/tabs";
import { Button } from "../UI";
import { Icon } from "../Icon";
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
  const choices = columns.filter((column) => !alwaysVisible.includes(column.key));
  return <DropdownMenu size="sm"><DropdownMenuTrigger render={<Button icon="grid" />}>{locale === "zh" ? "列设置" : "Columns"}</DropdownMenuTrigger><DropdownMenuContent align="end" className="console-column-menu">{choices.map((column) => <DropdownMenuCheckboxItem checked={!hidden.has(column.key)} onCheckedChange={() => onToggle(column.key)} key={column.key}>{column.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>;
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

function selectedPreset(startDate, endDate, presets) {
  return presets.find(([value]) => {
    const range = rangeFor(value);
    return range.start_date === startDate && range.end_date === endDate;
  });
}

function parseLocalDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function datePickerRange(startDate, endDate) {
  return { from: parseLocalDate(startDate), to: parseLocalDate(endDate) };
}

export function DateRangePicker({ startDate, endDate, onChange }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => datePickerRange(startDate, endDate));
  useEffect(() => setDraft(datePickerRange(startDate, endDate)), [startDate, endDate]);
  const presets = [
    ["today", "Today", "今天"], ["yesterday", "Yesterday", "昨天"], ["24h", "Last 24 hours", "最近 24 小时"],
    ["7d", "Last 7 days", "最近 7 天"], ["14d", "Last 14 days", "最近 14 天"], ["30d", "Last 30 days", "最近 30 天"],
    ["month", "This month", "本月"], ["lastMonth", "Last month", "上月"],
  ];
  const selected = selectedPreset(startDate, endDate, presets);
  const buttonLabel = selected ? (locale === "zh" ? selected[2] : selected[1]) : `${startDate} → ${endDate}`;
  const applyPreset = (preset) => {
    const range = rangeFor(preset);
    setDraft(datePickerRange(range.start_date, range.end_date));
    onChange(range);
  };
  const applyCustom = (range) => {
    setDraft(range || {});
    if (!range?.from || !range?.to) return;
    onChange({ start_date: localDate(range.from), end_date: localDate(range.to) });
    setOpen(false);
  };
  return <div className="console-date-picker"><DropdownMenu size="sm"><DropdownMenuTrigger render={<Button className="console-date-preset-trigger" icon="calendar" />}><span>{buttonLabel}</span><Icon name="chevronDown" size={14} data-icon="end" /></DropdownMenuTrigger><DropdownMenuContent align="start" className="console-date-preset-menu"><DropdownMenuRadioGroup value={selected?.[0] || ""} onValueChange={applyPreset}>{presets.map(([value, en, zh]) => <DropdownMenuRadioItem value={value} key={value}>{locale === "zh" ? zh : en}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu><DatePicker mode="range" value={draft} onValueChange={applyCustom} open={open} onOpenChange={setOpen} dateFormat="yyyy-MM-dd" size="md" variant="outline" align="start" className="console-date-native" inputClassName="console-date-native-input" triggerIcon={<Icon name="calendar" size={16} />} triggerAriaLabel={locale === "zh" ? "打开日期范围日历" : "Open date range calendar"} /></div>;
}

export function SearchSelect({ value, onChange, options, placeholder, id }) {
  const { locale } = useLocale();
  const items = options.map((option) => ({
    label: String(option.label ?? option),
    value: String(option.value ?? option),
  }));
  const emitChange = (nextValue) => {
    const target = { id, value: nextValue };
    onChange?.({ target, currentTarget: target });
  };
  return <Combobox items={items} value={items.find((option) => option.value === String(value ?? "")) || null} onValueChange={(next) => emitChange(next?.value ?? "")} inputValue={String(value ?? "")} onInputValueChange={emitChange} itemToStringLabel={(option) => option?.label || ""} itemToStringValue={(option) => option?.value || ""} isItemEqualToValue={(option, selected) => option?.value === selected?.value} filter={(option, query) => option.label.toLowerCase().includes(String(query || "").toLowerCase())} size="md" variant="outline" clearable modal={false}><ComboboxInput id={id} placeholder={placeholder} /><ComboboxContent><ComboboxEmpty>{locale === "zh" ? "没有匹配选项" : "No matching options"}</ComboboxEmpty><ComboboxList>{(option) => <ComboboxItem value={option} key={option.value}>{option.label}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>;
}

export function CompactTabs({ items, value, onChange, label, className = "" }) {
  return <Tabs value={value} onValueChange={onChange} variant="pill" size="sm" className="console-compact-tabs-root w-fit"><TabsList className={className} aria-label={label}>{items.map((item) => <TabsTrigger value={item.value} key={item.value}>{item.label}</TabsTrigger>)}</TabsList></Tabs>;
}
