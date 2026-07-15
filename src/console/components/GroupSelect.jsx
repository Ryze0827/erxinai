import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GroupBadge } from "../GroupBadge";
import { Icon } from "../Icon";
import { TextInput } from "../UI";
import { useLocale } from "../i18n";

function rateFor(group, rates) {
  const custom = rates?.[group.id] ?? rates?.[String(group.id)];
  return custom?.rate_multiplier ?? custom ?? group.rate_multiplier ?? 1;
}

function menuPosition(rect) {
  const margin = 8;
  const gap = 5;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const width = Math.min(Math.max(320, rect.width), Math.max(0, viewportWidth - margin * 2));
  const left = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin));
  const below = Math.max(0, viewportHeight - rect.bottom - gap - margin);
  const above = Math.max(0, rect.top - gap - margin);
  const opensAbove = below < 240 && above > below;
  const maxHeight = Math.min(430, opensAbove ? above : below);
  if (opensAbove) return { left, width, maxHeight, top: "auto", bottom: viewportHeight - rect.top + gap };
  return { left, width, maxHeight, top: rect.bottom + gap, bottom: "auto" };
}

function restoreFocus(ref) {
  window.requestAnimationFrame(() => ref.current?.focus());
}

export function GroupOption({ group, selected, rates, onClick }) {
  const { locale } = useLocale();
  const rate = rateFor(group, rates);
  const original = Number(group.rate_multiplier || 1);
  return <button type="button" role="option" aria-selected={selected} className={`console-group-option ${selected ? "is-selected" : ""}`} onClick={onClick}><div><GroupBadge name={group.name} platform={group.platform} /><p>{group.description || (locale === "zh" ? "用户 API 分组" : "User API group")}</p></div><div className="console-group-rates">{rate !== original && <del>{original}×</del>}<strong>{rate}×</strong>{group.peak_rate_multiplier && <small>{locale === "zh" ? "峰值" : "Peak"} {group.peak_rate_multiplier}×</small>}{group.subscription_type === "subscription" && <small>SUB</small>}</div>{selected && <Icon name="check" size={16} />}</button>;
}

function EmptyGroupOption({ visible, selected, locale, onSelect }) {
  if (!visible) return null;
  return <button type="button" role="option" aria-selected={selected} className={`console-group-empty ${selected ? "is-selected" : ""}`} onClick={() => onSelect("")}>{locale === "zh" ? "不指定分组" : "No group"}</button>;
}

function GroupOptions({ filtered, value, rates, locale, onSelect }) {
  if (!filtered.length) return <p className="console-group-no-results" role="option" aria-selected="false" aria-disabled="true">{locale === "zh" ? "没有匹配分组" : "No matching groups"}</p>;
  return filtered.map((group) => <GroupOption key={group.id} group={group} rates={rates} selected={String(group.id) === String(value)} onClick={() => onSelect(group.id)} />);
}

function GroupMenu({ menuId, menuRef, position, listLabel, locale, search, setSearch, allowEmpty, value, filtered, rates, onSelect, onKeyDown }) {
  const emptySelected = value === "" || value == null;
  return <div id={menuId} className="console-group-menu" ref={menuRef} style={position} role="dialog" aria-label={listLabel} onKeyDown={onKeyDown}><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale === "zh" ? "搜索分组" : "Search groups"} aria-label={locale === "zh" ? "搜索 API 分组" : "Search API groups"} autoFocus /><div role="listbox" aria-label={listLabel}><EmptyGroupOption visible={allowEmpty} selected={emptySelected} locale={locale} onSelect={onSelect} /><GroupOptions filtered={filtered} value={value} rates={rates} locale={locale} onSelect={onSelect} /></div></div>;
}

function GroupTrigger({ triggerRef, open, menuId, selected, rates, locale, onClick, onKeyDown }) {
  return <button ref={triggerRef} type="button" className="console-group-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={onClick} onKeyDown={onKeyDown}>{selected ? <GroupBadge name={selected.name} platform={selected.platform} detail={`${rateFor(selected, rates)}×`} /> : <span className="console-muted">{locale === "zh" ? "选择分组" : "Select group"}</span>}<Icon name="chevronDown" size={14} /></button>;
}

export function GroupSelect({ value, groups = [], rates = {}, onChange, allowEmpty = false, compact = false }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = `console-group-menu-${useId()}`;
  const selected = groups.find((group) => String(group.id) === String(value));
  const filtered = useMemo(() => groups.filter((group) => `${group.name} ${group.description || ""} ${group.platform || ""}`.toLowerCase().includes(search.toLowerCase())), [groups, search]);
  const updatePosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setPosition(menuPosition(rect));
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const close = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) { setOpen(false); setPosition(null); }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);
  const select = (next) => { onChange(next); setOpen(false); setPosition(null); setSearch(""); restoreFocus(triggerRef); };
  const toggle = () => { setOpen(!open); if (open) setPosition(null); };
  const closeWithKeyboard = (event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); setPosition(null); restoreFocus(triggerRef); } };
  const openWithKeyboard = (event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } else closeWithKeyboard(event); };
  const listLabel = locale === "zh" ? "API 分组" : "API groups";
  const menu = open && position ? <GroupMenu menuId={menuId} menuRef={menuRef} position={position} listLabel={listLabel} locale={locale} search={search} setSearch={setSearch} allowEmpty={allowEmpty} value={value} filtered={filtered} rates={rates} onSelect={select} onKeyDown={closeWithKeyboard} /> : null;
  return <div className={`console-group-select ${compact ? "is-compact" : ""}`} ref={rootRef}><GroupTrigger triggerRef={triggerRef} open={open} menuId={menuId} selected={selected} rates={rates} locale={locale} onClick={toggle} onKeyDown={openWithKeyboard} />{menu && createPortal(menu, document.body)}</div>;
}
